import { describe, it, expect, beforeEach, vi } from 'vitest'
import { excelProcessor, type ValidationError, type ValidationResult, type ProcessingResult } from './excelProcessor'

// Mock dependencies
vi.mock('./dataStorage', () => ({
  dataStorage: {
    saveFileMetadata: vi.fn(),
    getAllFileMetadata: vi.fn(() => Promise.resolve([])),
    getFileMetadata: vi.fn(),
    deleteFileMetadata: vi.fn(),
    setActiveFileId: vi.fn(),
    getInventoryData: vi.fn()
  }
}))

vi.mock('./inventoryService', () => ({
  inventoryService: {
    setInventoryData: vi.fn(),
    clearInventoryData: vi.fn(),
    loadStoredData: vi.fn()
  }
}))

describe('ExcelProcessorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('File Validation', () => {
    it('should reject files that are too large', async () => {
      const oversizedFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large-file.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const result = await excelProcessor.processFile(oversizedFile)

      expect(result.success).toBe(false)
      expect(result.message).toContain('File size')
      expect(result.message).toContain('exceeds maximum allowed size')
    })

    it('should reject empty files', async () => {
      const emptyFile = new File([], 'empty-file.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const result = await excelProcessor.processFile(emptyFile)

      expect(result.success).toBe(false)
      expect(result.message).toContain('File is empty')
    })

    it('should reject unsupported file types', async () => {
      const csvFile = new File(['data'], 'data.csv', {
        type: 'text/csv'
      })

      const result = await excelProcessor.processFile(csvFile)

      expect(result.success).toBe(false)
      expect(result.message).toContain('File type .csv not supported')
    })

    it('should accept valid Excel files', async () => {
      const validFile = new File(['valid excel data'], 'valid-file.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const result = await excelProcessor.processFile(validFile)

      expect(result.success).toBe(true)
      expect(result.fileId).toBeDefined()
      expect(result.fileId).toMatch(/^file_\d+_[a-z0-9]+$/)
    })
  })

  describe('Excel Data Processing', () => {
    const createMockFile = (name: string = 'test-file.xlsx') => {
      return new File(['mock excel data'], name, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    }

    it('should process valid Excel data successfully', async () => {
      const file = createMockFile()
      const { inventoryService } = await import('./inventoryService')
      const { dataStorage } = await import('./dataStorage')
      
      vi.mocked(inventoryService.setInventoryData).mockResolvedValue()
      vi.mocked(dataStorage.saveFileMetadata).mockResolvedValue()
      vi.mocked(dataStorage.setActiveFileId).mockResolvedValue()

      const result = await excelProcessor.processFile(file)

      expect(result.success).toBe(true)
      expect(result.recordCount).toBeGreaterThan(0)
      expect(inventoryService.setInventoryData).toHaveBeenCalled()
      expect(dataStorage.saveFileMetadata).toHaveBeenCalled()
    })

    it('should handle Excel processing errors gracefully', async () => {
      const file = createMockFile()
      
      // Mock XLSX to throw an error
      const { utils } = await import('xlsx')
      vi.mocked(utils.sheet_to_json).mockImplementation(() => {
        throw new Error('Excel parsing failed')
      })

      const result = await excelProcessor.processFile(file)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Excel parsing failed')
    })

    it('should auto-activate files with no validation errors', async () => {
      const file = createMockFile()
      const { dataStorage, inventoryService } = await Promise.all([
        import('./dataStorage'),
        import('./inventoryService')
      ])
      
      vi.mocked(inventoryService.setInventoryData).mockResolvedValue()
      vi.mocked(dataStorage.saveFileMetadata).mockResolvedValue()
      vi.mocked(dataStorage.setActiveFileId).mockResolvedValue()

      const result = await excelProcessor.processFile(file)

      expect(result.success).toBe(true)
      expect(result.message).toContain('activated')
      expect(dataStorage.setActiveFileId).toHaveBeenCalled()
    })

    it('should not auto-activate files with validation errors', async () => {
      const file = createMockFile()
      
      // Mock XLSX to return invalid data (missing required columns)
      const { utils } = await import('xlsx')
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        ['Invalid', 'Headers'], // Missing required columns
        ['Data1', 'Data2']
      ])

      const result = await excelProcessor.processFile(file)

      expect(result.success).toBe(true)
      expect(result.validation.errors.length).toBeGreaterThan(0)
      expect(result.message).not.toContain('activated')
    })
  })

  describe('Data Validation', () => {
    const validHeaders = [
      'Material', 'Material Description', 'Plant', 'Storage Location', 
      'Base Unit of Measure', 'Unrestricted', 'Blocked'
    ]

    const validDataRow = [
      '10001001', 'Test Material', 'P001', 'WH01', 'EA', 1000, 50
    ]

    it('should validate required columns', async () => {
      const file = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      // Mock missing required columns
      const { utils } = await import('xlsx')
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        ['Material', 'Plant'], // Missing required columns
        ['10001', 'P001']
      ])

      const result = await excelProcessor.processFile(file)

      expect(result.validation.errors.length).toBeGreaterThan(0)
      expect(result.validation.errors.some(e => 
        e.message.includes('Required column') && e.message.includes('is missing')
      )).toBe(true)
    })

    it('should validate material codes', async () => {
      const file = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const { utils } = await import('xlsx')
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        validHeaders,
        ['', 'Valid Description', 'P001', 'WH01', 'EA', 1000, 50] // Empty material
      ])

      const result = await excelProcessor.processFile(file)

      expect(result.validation.errors.some(e => 
        e.message.includes('Material code cannot be empty')
      )).toBe(true)
    })

    it('should validate plant codes', async () => {
      const file = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const { utils } = await import('xlsx')
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        validHeaders,
        ['10001', 'Valid Description', '', 'WH01', 'EA', 1000, 50] // Empty plant
      ])

      const result = await excelProcessor.processFile(file)

      expect(result.validation.errors.some(e => 
        e.message.includes('Plant code cannot be empty')
      )).toBe(true)
    })

    it('should validate numeric quantities', async () => {
      const file = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const { utils } = await import('xlsx')
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        validHeaders,
        ['10001', 'Valid Description', 'P001', 'WH01', 'EA', 'invalid', 50] // Invalid unrestricted quantity
      ])

      const result = await excelProcessor.processFile(file)

      expect(result.validation.errors.some(e => 
        e.message.includes('must be a number')
      )).toBe(true)
    })

    it('should validate negative quantities', async () => {
      const file = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const { utils } = await import('xlsx')
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        validHeaders,
        ['10001', 'Valid Description', 'P001', 'WH01', 'EA', -100, 50] // Negative unrestricted
      ])

      const result = await excelProcessor.processFile(file)

      expect(result.validation.errors.some(e => 
        e.message.includes('cannot be negative')
      )).toBe(true)
    })

    it('should generate warnings for suspicious data', async () => {
      const file = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const { utils } = await import('xlsx')
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        validHeaders,
        ['10001', '', 'P001', 'WH01', 'EA', 1000, 50] // Empty description (warning)
      ])

      const result = await excelProcessor.processFile(file)

      expect(result.validation.warnings.some(w => 
        w.message.includes('Material description is empty')
      )).toBe(true)
    })

    it('should handle storage location validation with stock in transfer', async () => {
      const file = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const expandedHeaders = [
        ...validHeaders.slice(0, 6),
        'Stock in transfer',
        ...validHeaders.slice(6)
      ]
      
      const { utils } = await import('xlsx')
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        expandedHeaders,
        ['10001', 'Valid Description', 'P001', '', 'EA', 0, 100, 50] // Empty location with transfer stock
      ])

      const result = await excelProcessor.processFile(file)

      expect(result.validation.warnings.some(w => 
        w.message.includes('Storage Location is empty but will be displayed as "SIT"')
      )).toBe(true)
    })
  })

  describe('File Management Operations', () => {
    const mockFileMetadata = {
      id: 'test-file-123',
      name: 'test-inventory.xlsx',
      uploadDate: new Date(),
      isActive: false,
      recordCount: 100,
      validationStatus: 'valid' as const
    }

    const mockInventoryData = [
      {
        material: 123456,
        materialDescription: 'Test Material',
        plant: 'P001',
        storageLocation: 'WH01',
        baseUnitOfMeasure: 'EA',
        unrestricted: 100,
        stockInTransfer: 0,
        inQualityInsp: 0,
        restrictedUseStock: 0,
        blocked: 10,
        valueUnrestricted: 1000,
        totalShelfLife: 365,
        sled: 0,
        dateOfManufacture: 0,
        batch: 'BATCH001',
        totalQuantity: 110,
        status: 'blocked' as const
      }
    ]

    beforeEach(() => {
      const { dataStorage, inventoryService } = vi.hoisted(() => ({
        dataStorage: {
          getAllFileMetadata: vi.fn(),
          getFileMetadata: vi.fn(),
          saveFileMetadata: vi.fn(),
          setActiveFileId: vi.fn(),
          getInventoryData: vi.fn(),
          deleteFileMetadata: vi.fn()
        },
        inventoryService: {
          clearInventoryData: vi.fn(),
          loadStoredData: vi.fn(),
          setInventoryData: vi.fn()
        }
      }))
      
      vi.mocked(dataStorage.getAllFileMetadata).mockResolvedValue([mockFileMetadata])
      vi.mocked(dataStorage.getFileMetadata).mockResolvedValue(mockFileMetadata)
      vi.mocked(dataStorage.getInventoryData).mockResolvedValue(mockInventoryData)
    })

    it('should activate an existing file successfully', async () => {
      const { dataStorage, inventoryService } = await Promise.all([
        import('./dataStorage'),
        import('./inventoryService')
      ])

      await excelProcessor.activateFile('test-file-123')

      expect(inventoryService.clearInventoryData).toHaveBeenCalled()
      expect(dataStorage.setActiveFileId).toHaveBeenCalledWith('test-file-123')
      expect(inventoryService.loadStoredData).toHaveBeenCalledWith(mockInventoryData, 'test-file-123')
    })

    it('should handle activation of non-existent file', async () => {
      const { dataStorage } = await import('./dataStorage')
      vi.mocked(dataStorage.getFileMetadata).mockResolvedValue(null)

      await expect(excelProcessor.activateFile('non-existent-file')).rejects.toThrow('File not found')
    })

    it('should activate file with fresh data when provided', async () => {
      const freshData = [['Material', 'Description'], ['12345', 'Fresh Data']]
      const { inventoryService } = await import('./inventoryService')

      await excelProcessor.activateFile('test-file-123', freshData)

      expect(inventoryService.setInventoryData).toHaveBeenCalledWith(freshData, 'test-file-123')
    })

    it('should handle activation when no stored data exists', async () => {
      const { dataStorage, inventoryService } = await Promise.all([
        import('./dataStorage'),
        import('./inventoryService')
      ])
      vi.mocked(dataStorage.getInventoryData).mockResolvedValue([])

      await excelProcessor.activateFile('test-file-123')

      expect(inventoryService.clearInventoryData).toHaveBeenCalled()
    })

    it('should delete file and clear data if it was active', async () => {
      const activeFile = { ...mockFileMetadata, isActive: true }
      const { dataStorage, inventoryService } = await Promise.all([
        import('./dataStorage'),
        import('./inventoryService')
      ])
      vi.mocked(dataStorage.getFileMetadata).mockResolvedValue(activeFile)

      await excelProcessor.deleteFile('test-file-123')

      expect(inventoryService.clearInventoryData).toHaveBeenCalled()
      expect(dataStorage.deleteFileMetadata).toHaveBeenCalledWith('test-file-123')
    })

    it('should get file history', async () => {
      const { dataStorage } = await import('./dataStorage')

      const history = await excelProcessor.getFileHistory()

      expect(history).toEqual([mockFileMetadata])
      expect(dataStorage.getAllFileMetadata).toHaveBeenCalled()
    })
  })

  describe('Template Generation', () => {
    it('should generate Excel template blob', () => {
      const blob = excelProcessor.generateTemplate()

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(blob.size).toBeGreaterThan(0)
    })

    it('should download template file', () => {
      // Mock DOM methods
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      }
      
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

      excelProcessor.downloadTemplate('custom-template.xlsx')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockAnchor.download).toBe('custom-template.xlsx')
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor)
      expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor)

      // Cleanup
      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })

    it('should use default filename when not provided', () => {
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      }
      
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

      excelProcessor.downloadTemplate()

      expect(mockAnchor.download).toBe('inventory_template.xlsx')

      // Cleanup
      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })
  })

  describe('Utility Methods', () => {
    it('should generate unique file IDs', () => {
      const id1 = (excelProcessor as any).generateFileId()
      const id2 = (excelProcessor as any).generateFileId()

      expect(id1).toMatch(/^file_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^file_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('Error Handling', () => {
    it('should handle file processing errors gracefully', async () => {
      const file = new File(['mock'], 'error-file.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      // Mock file reading to throw an error
      const originalArrayBuffer = File.prototype.arrayBuffer
      File.prototype.arrayBuffer = vi.fn().mockRejectedValue(new Error('File reading failed'))

      const result = await excelProcessor.processFile(file)

      expect(result.success).toBe(false)
      expect(result.message).toContain('File reading failed')

      // Restore original method
      File.prototype.arrayBuffer = originalArrayBuffer
    })

    it('should handle database errors during file processing', async () => {
      const file = new File(['mock'], 'db-error-file.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const { dataStorage } = await import('./dataStorage')
      vi.mocked(dataStorage.saveFileMetadata).mockRejectedValue(new Error('Database error'))

      const result = await excelProcessor.processFile(file)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Database error')
    })
  })
})