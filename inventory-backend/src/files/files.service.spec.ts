import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// Mock modules
jest.mock('fs');
jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
}));
jest.mock('path');

describe('FilesService', () => {
  let service: FilesService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;
  
  // Type-safe mocks for XLSX
  const mockReadFile = XLSX.readFile as jest.MockedFunction<typeof XLSX.readFile>;
  const mockSheetToJson = XLSX.utils.sheet_to_json as jest.MockedFunction<typeof XLSX.utils.sheet_to_json>;

  const mockFileBuffer = Buffer.from('mock excel file content');
  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-inventory.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: mockFileBuffer,
    size: mockFileBuffer.length,
    filename: '',
    path: '',
    destination: '',
    stream: null as any,
  };

  const mockExcelData = [
    ['Material', 'Material Description', 'Plant', 'Storage Location', 'Base Unit of Measure', 'Unrestricted', 'Blocked'],
    [123456, 'Test Material 1', 'Y012', 'YP01', 'KG', 1000, 100],
    [789012, 'Test Material 2', 'Y013', 'YM99', 'PC', 500, 0]
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup path mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.basename.mockImplementation((filePath) => filePath.split('/').pop() || '');

    // Setup fs mocks
    mockFs.existsSync.mockReturnValue(false); // Initially no uploads dir
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);

    // Setup XLSX mocks
    mockReadFile.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    } as any);

    mockSheetToJson.mockReturnValue(mockExcelData as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [FilesService],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  describe('constructor', () => {
    it('should create uploads directory if it does not exist', () => {
      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should not create uploads directory if it already exists', () => {
      jest.clearAllMocks();
      mockFs.existsSync.mockReturnValue(true);

      // Create new instance
      new FilesService();

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('processUploadedFile', () => {
    beforeEach(() => {
      // Mock successful file validation
      jest.spyOn(service as any, 'validateExcelData').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        summary: {
          totalRows: 2,
          validRows: 2,
          errorRows: 0,
          warningRows: 0
        }
      });
    });

    it('should process uploaded file successfully', async () => {
      const result = await service.processUploadedFile(mockFile);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockReadFile).toHaveBeenCalled();
      expect(result).toMatchObject({
        message: expect.any(String),
        fileId: expect.any(String),
        recordCount: 2,
        validation: expect.objectContaining({
          isValid: true
        })
      });
    });

    it('should auto-activate first valid file', async () => {
      const result = await service.processUploadedFile(mockFile);

      // Check that the file was auto-activated
      const history = service.getFileHistory();
      expect(history[0].isActive).toBe(true);
    });

    it('should not auto-activate subsequent files', async () => {
      // Upload first file
      await service.processUploadedFile(mockFile);

      // Upload second file
      const secondFile = { ...mockFile, originalname: 'second-file.xlsx' };
      await service.processUploadedFile(secondFile);

      const history = service.getFileHistory();
      expect(history[0].isActive).toBe(true);
      expect(history[1].isActive).toBe(false);
    });

    it('should handle file with validation errors', async () => {
      // Mock validation with errors
      jest.spyOn(service as any, 'validateExcelData').mockReturnValue({
        isValid: false,
        errors: [{ row: 2, column: 'Material', value: 'invalid', message: 'Must be numeric' }],
        warnings: [],
        summary: {
          totalRows: 2,
          validRows: 1,
          errorRows: 1,
          warningRows: 0
        }
      });

      const result = await service.processUploadedFile(mockFile);

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toHaveLength(1);

      // Should not auto-activate file with errors
      const history = service.getFileHistory();
      expect(history[0].isActive).toBe(false);
    });

    it('should notify inventory service when file is activated', async () => {
      const mockInventoryService = {
        refreshData: jest.fn()
      };
      service.setInventoryService(mockInventoryService);

      await service.processUploadedFile(mockFile);

      expect(mockInventoryService.refreshData).toHaveBeenCalled();
    });
  });

  describe('activateFile', () => {
    let fileId: string;

    beforeEach(async () => {
      // Upload a test file first
      const result = await service.processUploadedFile(mockFile);
      fileId = result.fileId;
    });

    it('should activate a file successfully', async () => {
      // Deactivate the auto-activated file first
      const history = service.getFileHistory();
      (history[0] as any).isActive = false;

      // Upload another file
      const secondFile = { ...mockFile, originalname: 'second-file.xlsx' };
      const secondResult = await service.processUploadedFile(secondFile);

      await service.activateFile(secondResult.fileId);

      const updatedHistory = service.getFileHistory();
      const activatedFile = updatedHistory.find(f => f.id === secondResult.fileId);
      expect(activatedFile?.isActive).toBe(true);

      // Original file should be deactivated
      const originalFile = updatedHistory.find(f => f.id === fileId);
      expect(originalFile?.isActive).toBe(false);
    });

    it('should throw error for non-existent file', async () => {
      await expect(service.activateFile('non-existent-id')).rejects.toThrow('File not found');
    });

    it('should notify inventory service when file is activated', async () => {
      const mockInventoryService = {
        refreshData: jest.fn()
      };
      service.setInventoryService(mockInventoryService);

      // Deactivate current file
      const history = service.getFileHistory();
      (history[0] as any).isActive = false;

      await service.activateFile(fileId);

      expect(mockInventoryService.refreshData).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    let fileId: string;

    beforeEach(async () => {
      const result = await service.processUploadedFile(mockFile);
      fileId = result.fileId;
    });

    it('should delete a file successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => undefined);

      await service.deleteFile(fileId);

      expect(mockFs.unlinkSync).toHaveBeenCalled();
      expect(service.getFileHistory()).toHaveLength(0);
    });

    it('should throw error for non-existent file', async () => {
      await expect(service.deleteFile('non-existent-id')).rejects.toThrow('File not found');
    });

    it('should throw error when trying to delete active file', async () => {
      await expect(service.deleteFile(fileId)).rejects.toThrow('Cannot delete active file');
    });
  });

  describe('getFileHistory', () => {
    it('should return empty array initially', () => {
      const history = service.getFileHistory();
      expect(history).toEqual([]);
    });

    it('should return uploaded files', async () => {
      await service.processUploadedFile(mockFile);

      const history = service.getFileHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        originalName: 'test-inventory.xlsx',
        size: mockFileBuffer.length,
        isActive: true,
        recordCount: 2,
        validationStatus: 'valid'
      });
    });
  });

  describe('getCurrentActiveData', () => {
    it('should return null when no active file', async () => {
      const data = await service.getCurrentActiveData();
      expect(data).toBeNull();
    });

    it('should return data for active file', async () => {
      await service.processUploadedFile(mockFile);

      const data = await service.getCurrentActiveData();
      expect(data).toEqual(mockExcelData);
    });

    it('should handle file read errors gracefully', async () => {
      await service.processUploadedFile(mockFile);

      // Mock file read error
      mockReadFile.mockImplementation(() => {
        throw new Error('File read error');
      });

      await expect(service.getCurrentActiveData()).rejects.toThrow('File read error');
    });
  });

  describe('validateExcelData', () => {
    const validData = [
      ['Material', 'Material Description', 'Plant', 'Storage Location', 'Base Unit of Measure', 'Unrestricted', 'Blocked'],
      [123456, 'Test Material', 'Y012', 'YP01', 'KG', 1000, 100]
    ];

    it('should validate correct data structure', () => {
      const result = (service as any).validateExcelData(validData, 'test-id', '/test/path');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required columns', () => {
      const invalidData = [
        ['Material', 'Plant'], // Missing required columns
        [123456, 'Y012']
      ];

      const result = (service as any).validateExcelData(invalidData, 'test-id', '/test/path');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid material numbers', () => {
      const invalidData = [
        ['Material', 'Material Description', 'Plant', 'Storage Location', 'Base Unit of Measure', 'Unrestricted', 'Blocked'],
        ['invalid', 'Test Material', 'Y012', 'YP01', 'KG', 1000, 100] // Invalid material number
      ];

      const result = (service as any).validateExcelData(invalidData, 'test-id', '/test/path');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error: any) => error.column === 'Material')).toBe(true);
    });

    it('should detect negative quantities', () => {
      const invalidData = [
        ['Material', 'Material Description', 'Plant', 'Storage Location', 'Base Unit of Measure', 'Unrestricted', 'Blocked'],
        [123456, 'Test Material', 'Y012', 'YP01', 'KG', -1000, 100] // Negative quantity
      ];

      const result = (service as any).validateExcelData(invalidData, 'test-id', '/test/path');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error: any) => error.column === 'Unrestricted')).toBe(true);
    });
  });
});