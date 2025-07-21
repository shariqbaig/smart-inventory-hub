import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// Mock fs module
jest.mock('fs');
jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
}));
jest.mock('path');

// Mock fetch
global.fetch = jest.fn();

describe('InventoryService', () => {
  let service: InventoryService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  
  // Type-safe mocks for XLSX
  const mockReadFile = XLSX.readFile as jest.MockedFunction<typeof XLSX.readFile>;
  const mockSheetToJson = XLSX.utils.sheet_to_json as jest.MockedFunction<typeof XLSX.utils.sheet_to_json>;

  const mockInventoryData = [
    {
      Material: 123456,
      'Material Description': 'Test Material 1',
      Plant: 'Y012',
      'Storage Location': 'YP01',
      'Base Unit of Measure': 'KG',
      Unrestricted: 1000,
      'Stock in transfer': 0,
      'In Quality Insp.': 0,
      'Restricted-Use Stock': 0,
      Blocked: 100,
      'Value Unrestricted': 5000,
      'Total shelf life': 365,
      'SLED/BBD': 20241201,
      'Date of Manufacture': 20240101,
      Batch: 'BATCH001'
    },
    {
      Material: 789012,
      'Material Description': 'Test Material 2',
      Plant: 'Y013',
      'Storage Location': 'YM99',
      'Base Unit of Measure': 'PC',
      Unrestricted: 500,
      'Stock in transfer': 50,
      'In Quality Insp.': 25,
      'Restricted-Use Stock': 10,
      Blocked: 0,
      'Value Unrestricted': 2500,
      'Total shelf life': 730,
      'SLED/BBD': 20251201,
      'Date of Manufacture': 20240601,
      Batch: 'BATCH002'
    }
  ];

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.basename.mockImplementation((filePath) => filePath.split('/').pop() || '');
    mockFs.existsSync.mockReturnValue(true);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('loadInventoryData with active file', () => {
    beforeEach(() => {
      // Mock successful API response with active file
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          { id: '1', filename: 'test-file.xlsx', isActive: true, originalName: 'test.xlsx', recordCount: 2 }
        ]
      } as Response);

      // Mock XLSX reading
      mockReadFile.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      } as any);

      mockSheetToJson.mockReturnValue(mockInventoryData as any);
    });

    it('should load data from active file successfully', async () => {
      // Access private method via any type to test it
      await (service as any).loadInventoryData();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/files/history');
      expect(mockReadFile).toHaveBeenCalled();
      expect(mockSheetToJson).toHaveBeenCalled();
      expect((service as any).isDataLoaded).toBe(true);
      expect((service as any).inventoryData).toHaveLength(2);
    });

    it('should use environment API URL when set', async () => {
      process.env.API_BASE_URL = 'http://custom-api:3000';
      
      await (service as any).loadInventoryData();

      expect(mockFetch).toHaveBeenCalledWith('http://custom-api:3000/files/history');
      
      delete process.env.API_BASE_URL;
    });
  });

  describe('loadInventoryData with no active file', () => {
    beforeEach(() => {
      // Mock API response with no active file
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          { id: '1', filename: 'test-file.xlsx', isActive: false, originalName: 'test.xlsx', recordCount: 2 }
        ]
      } as Response);
    });

    it('should handle no active file gracefully', async () => {
      await (service as any).loadInventoryData();

      expect((service as any).isDataLoaded).toBe(false);
      expect((service as any).inventoryData).toEqual([]);
    });
  });

  describe('loadInventoryData with API failure', () => {
    beforeEach(() => {
      // Mock API failure
      mockFetch.mockRejectedValue(new Error('API not available'));
    });

    it('should handle API failure gracefully', async () => {
      await (service as any).loadInventoryData();

      expect((service as any).isDataLoaded).toBe(false);
      expect((service as any).inventoryData).toEqual([]);
    });
  });

  describe('getInventoryMetrics', () => {
    beforeEach(async () => {
      // Setup service with test data
      (service as any).inventoryData = [
        {
          material: 123456,
          materialDescription: 'Test Material 1',
          plant: 'Y012',
          storageLocation: 'YP01',
          baseUnitOfMeasure: 'KG',
          unrestricted: 1000,
          stockInTransfer: 0,
          inQualityInsp: 0,
          restrictedUseStock: 0,
          blocked: 100,
          valueUnrestricted: 5000,
          totalShelfLife: 365,
          sled: 20241201,
          dateOfManufacture: 20240101,
          batch: 'BATCH001'
        },
        {
          material: 789012,
          materialDescription: 'Test Material 2',
          plant: 'Y013',
          storageLocation: 'YM99',
          baseUnitOfMeasure: 'PC',
          unrestricted: 500,
          stockInTransfer: 50,
          inQualityInsp: 25,
          restrictedUseStock: 10,
          blocked: 0,
          valueUnrestricted: 2500,
          totalShelfLife: 730,
          sled: 20251201,
          dateOfManufacture: 20240601,
          batch: 'BATCH002'
        }
      ];
      (service as any).isDataLoaded = true;
    });

    it('should return correct metrics when data is loaded', () => {
      const metrics = service.getInventoryMetrics();

      expect(metrics).toEqual({
        totalInventory: 1685, // 1000+0+0+0+100 + 500+50+25+10+0
        totalBlocked: 100,
        totalUnrestricted: 1500,
        totalRestricted: 10,
        totalInTransfer: 50,
        totalInQualityInsp: 25
      });
    });

    it('should return zero metrics when no data is loaded', () => {
      (service as any).isDataLoaded = false;
      (service as any).inventoryData = [];

      const metrics = service.getInventoryMetrics();

      expect(metrics).toEqual({
        totalInventory: 0,
        totalBlocked: 0,
        totalUnrestricted: 0,
        totalRestricted: 0,
        totalInTransfer: 0,
        totalInQualityInsp: 0
      });
    });
  });

  describe('getLocationStats', () => {
    beforeEach(() => {
      (service as any).inventoryData = [
        {
          material: 123456,
          materialDescription: 'Test Material 1',
          plant: 'Y012',
          storageLocation: 'YP01',
          baseUnitOfMeasure: 'KG',
          unrestricted: 1000,
          stockInTransfer: 0,
          inQualityInsp: 0,
          restrictedUseStock: 0,
          blocked: 100,
          valueUnrestricted: 5000,
          totalShelfLife: 365,
          sled: 20241201,
          dateOfManufacture: 20240101,
          batch: 'BATCH001'
        }
      ];
      (service as any).isDataLoaded = true;
    });

    it('should return location statistics when data is loaded', () => {
      const stats = service.getLocationStats();

      expect(stats).toHaveLength(1);
      expect(stats[0]).toEqual({
        storageLocation: 'YP01',
        totalQuantity: 1100,
        blockedQuantity: 100,
        unrestrictedQuantity: 1000,
        materialCount: 1
      });
    });

    it('should return empty array when no data is loaded', () => {
      (service as any).isDataLoaded = false;
      (service as any).inventoryData = [];

      const stats = service.getLocationStats();

      expect(stats).toEqual([]);
    });
  });

  describe('getPlantStats', () => {
    beforeEach(() => {
      (service as any).inventoryData = [
        {
          material: 123456,
          materialDescription: 'Test Material 1',
          plant: 'Y012',
          storageLocation: 'YP01',
          baseUnitOfMeasure: 'KG',
          unrestricted: 1000,
          stockInTransfer: 0,
          inQualityInsp: 0,
          restrictedUseStock: 0,
          blocked: 100,
          valueUnrestricted: 5000,
          totalShelfLife: 365,
          sled: 20241201,
          dateOfManufacture: 20240101,
          batch: 'BATCH001'
        }
      ];
      (service as any).isDataLoaded = true;
    });

    it('should return plant statistics when data is loaded', () => {
      const stats = service.getPlantStats();

      expect(stats).toHaveLength(1);
      expect(stats[0]).toEqual({
        plant: 'Y012',
        totalQuantity: 1100,
        blockedQuantity: 100,
        unrestrictedQuantity: 1000,
        materialCount: 1,
        locations: ['YP01']
      });
    });

    it('should return empty array when no data is loaded', () => {
      (service as any).isDataLoaded = false;
      (service as any).inventoryData = [];

      const stats = service.getPlantStats();

      expect(stats).toEqual([]);
    });
  });

  describe('getMaterialDetails', () => {
    beforeEach(() => {
      (service as any).inventoryData = [
        {
          material: 123456,
          materialDescription: 'Test Material 1',
          plant: 'Y012',
          storageLocation: 'YP01',
          baseUnitOfMeasure: 'KG',
          unrestricted: 1000,
          stockInTransfer: 0,
          inQualityInsp: 0,
          restrictedUseStock: 0,
          blocked: 100,
          valueUnrestricted: 5000,
          totalShelfLife: 365,
          sled: 20241201,
          dateOfManufacture: 20240101,
          batch: 'BATCH001'
        }
      ];
      (service as any).isDataLoaded = true;
    });

    it('should return material details when data is loaded', () => {
      const result = service.getMaterialDetails();

      expect(result.total).toBe(1);
      expect(result.materials).toHaveLength(1);
      expect(result.materials[0]).toMatchObject({
        material: 123456,
        materialDescription: 'Test Material 1',
        plant: 'Y012',
        storageLocation: 'YP01',
        totalQuantity: 1100,
        status: 'blocked'
      });
    });

    it('should return empty results when no data is loaded', () => {
      (service as any).isDataLoaded = false;
      (service as any).inventoryData = [];

      const result = service.getMaterialDetails();

      expect(result).toEqual({ materials: [], total: 0 });
    });

    it('should apply filters correctly', () => {
      (service as any).inventoryData = [
        {
          material: 123456,
          materialDescription: 'Test Material 1',
          plant: 'Y012',
          storageLocation: 'YP01',
          baseUnitOfMeasure: 'KG',
          unrestricted: 1000,
          stockInTransfer: 0,
          inQualityInsp: 0,
          restrictedUseStock: 0,
          blocked: 100,
          valueUnrestricted: 5000,
          totalShelfLife: 365,
          sled: 20241201,
          dateOfManufacture: 20240101,
          batch: 'BATCH001'
        },
        {
          material: 789012,
          materialDescription: 'Test Material 2',
          plant: 'Y013',
          storageLocation: 'YM99',
          baseUnitOfMeasure: 'PC',
          unrestricted: 500,
          stockInTransfer: 0,
          inQualityInsp: 0,
          restrictedUseStock: 0,
          blocked: 0,
          valueUnrestricted: 2500,
          totalShelfLife: 730,
          sled: 20251201,
          dateOfManufacture: 20240601,
          batch: 'BATCH002'
        }
      ];

      const result = service.getMaterialDetails({ plant: 'Y012' });

      expect(result.total).toBe(1);
      expect(result.materials[0].plant).toBe('Y012');
    });
  });

  describe('getBlockedMaterials', () => {
    beforeEach(() => {
      (service as any).inventoryData = [
        {
          material: 123456,
          materialDescription: 'Test Material 1',
          plant: 'Y012',
          storageLocation: 'YP01',
          baseUnitOfMeasure: 'KG',
          unrestricted: 1000,
          stockInTransfer: 0,
          inQualityInsp: 0,
          restrictedUseStock: 0,
          blocked: 100,
          valueUnrestricted: 5000,
          totalShelfLife: 365,
          sled: 20241201,
          dateOfManufacture: 20240101,
          batch: 'BATCH001'
        },
        {
          material: 789012,
          materialDescription: 'Test Material 2',
          plant: 'Y013',
          storageLocation: 'YM99',
          baseUnitOfMeasure: 'PC',
          unrestricted: 500,
          stockInTransfer: 0,
          inQualityInsp: 0,
          restrictedUseStock: 0,
          blocked: 0,
          valueUnrestricted: 2500,
          totalShelfLife: 730,
          sled: 20251201,
          dateOfManufacture: 20240601,
          batch: 'BATCH002'
        }
      ];
      (service as any).isDataLoaded = true;
    });

    it('should return only materials with blocked stock', () => {
      const blockedMaterials = service.getBlockedMaterials();

      expect(blockedMaterials).toHaveLength(1);
      expect(blockedMaterials[0].material).toBe(123456);
      expect(blockedMaterials[0].blocked).toBe(100);
    });

    it('should return empty array when no data is loaded', () => {
      (service as any).isDataLoaded = false;
      (service as any).inventoryData = [];

      const blockedMaterials = service.getBlockedMaterials();

      expect(blockedMaterials).toEqual([]);
    });
  });

  describe('refreshData', () => {
    it('should call loadInventoryData', () => {
      const loadDataSpy = jest.spyOn(service as any, 'loadInventoryData').mockResolvedValue(undefined);

      service.refreshData();

      expect(loadDataSpy).toHaveBeenCalled();
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', async () => {
      (service as any).inventoryData = mockInventoryData;
      (service as any).isDataLoaded = true;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          { id: '1', filename: 'test-file.xlsx', isActive: true, originalName: 'test.xlsx', recordCount: 2 }
        ]
      } as Response);

      const debugInfo = await service.getDebugInfo();

      expect(debugInfo).toMatchObject({
        inventoryDataCount: 2,
        isDataLoaded: true,
        uploadsDir: expect.any(String),
        activeUploadedFile: expect.any(String),
        firstInventoryRecord: expect.any(Object)
      });
    });
  });
});