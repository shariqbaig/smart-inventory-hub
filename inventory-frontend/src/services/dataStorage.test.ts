import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dataStorage, type FileMetadata, type AppSettings } from './dataStorage'
import type { MaterialDetail } from '../types'

describe('DataStorageService', () => {
  beforeEach(async () => {
    // Clear all data before each test
    await dataStorage.init()
    await dataStorage.clearAllData()
  })

  describe('Database Initialization', () => {
    it('should initialize the database successfully', async () => {
      const result = await dataStorage.init()
      expect(result).toBeUndefined()
    })

    it('should handle database initialization errors gracefully', async () => {
      const originalIndexedDB = global.indexedDB
      // Mock indexedDB to throw an error
      global.indexedDB = {
        open: vi.fn(() => {
          const request = {
            onerror: null as any,
            onsuccess: null as any,
            onupgradeneeded: null as any
          }
          setTimeout(() => {
            if (request.onerror) {
              request.onerror()
            }
          }, 0)
          return request
        })
      } as any

      await expect(dataStorage.init()).rejects.toThrow('Failed to open database')
      
      // Restore original indexedDB
      global.indexedDB = originalIndexedDB
    })
  })

  describe('File Metadata Operations', () => {
    const mockFileMetadata: FileMetadata = {
      id: 'test-file-1',
      name: 'test-inventory.xlsx',
      uploadDate: new Date('2024-01-15'),
      isActive: false,
      recordCount: 100,
      validationStatus: 'valid',
      errorCount: 0,
      warningCount: 2
    }

    it('should save and retrieve file metadata', async () => {
      await dataStorage.saveFileMetadata(mockFileMetadata)
      const retrieved = await dataStorage.getFileMetadata('test-file-1')
      
      expect(retrieved).toEqual(mockFileMetadata)
    })

    it('should return null for non-existent file metadata', async () => {
      const retrieved = await dataStorage.getFileMetadata('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should retrieve all file metadata', async () => {
      const file1 = { ...mockFileMetadata, id: 'file-1' }
      const file2 = { ...mockFileMetadata, id: 'file-2', name: 'file2.xlsx' }
      
      await dataStorage.saveFileMetadata(file1)
      await dataStorage.saveFileMetadata(file2)
      
      const allFiles = await dataStorage.getAllFileMetadata()
      expect(allFiles).toHaveLength(2)
      expect(allFiles.find(f => f.id === 'file-1')).toEqual(file1)
      expect(allFiles.find(f => f.id === 'file-2')).toEqual(file2)
    })

    it('should delete file metadata and associated inventory data', async () => {
      // Save file metadata and some inventory data
      await dataStorage.saveFileMetadata(mockFileMetadata)
      
      const mockInventoryData: MaterialDetail[] = [
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
          status: 'blocked'
        }
      ]
      
      await dataStorage.saveInventoryData('test-file-1', mockInventoryData)
      
      // Verify data exists
      const retrievedData = await dataStorage.getInventoryData('test-file-1')
      expect(retrievedData).toHaveLength(1)
      
      // Delete file
      await dataStorage.deleteFileMetadata('test-file-1')
      
      // Verify both metadata and data are deleted
      const retrievedMetadata = await dataStorage.getFileMetadata('test-file-1')
      expect(retrievedMetadata).toBeNull()
      
      const retrievedDataAfterDelete = await dataStorage.getInventoryData('test-file-1')
      expect(retrievedDataAfterDelete).toHaveLength(0)
    })
  })

  describe('Inventory Data Operations', () => {
    const mockInventoryData: MaterialDetail[] = [
      {
        material: 123456,
        materialDescription: 'Test Material A',
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
        status: 'blocked'
      },
      {
        material: 789012,
        materialDescription: 'Test Material B',
        plant: 'P002',
        storageLocation: 'WH02',
        baseUnitOfMeasure: 'KG',
        unrestricted: 50,
        stockInTransfer: 20,
        inQualityInsp: 5,
        restrictedUseStock: 0,
        blocked: 0,
        valueUnrestricted: 500,
        totalShelfLife: 180,
        sled: 0,
        dateOfManufacture: 0,
        batch: 'BATCH002',
        totalQuantity: 75,
        status: 'in-transfer'
      }
    ]

    it('should save and retrieve inventory data for a specific file', async () => {
      await dataStorage.saveInventoryData('test-file-1', mockInventoryData)
      const retrieved = await dataStorage.getInventoryData('test-file-1')
      
      expect(retrieved).toHaveLength(2)
      expect(retrieved[0]).toEqual(mockInventoryData[0])
      expect(retrieved[1]).toEqual(mockInventoryData[1])
    })

    it('should handle empty inventory data', async () => {
      await dataStorage.saveInventoryData('empty-file', [])
      const retrieved = await dataStorage.getInventoryData('empty-file')
      
      expect(retrieved).toHaveLength(0)
    })

    it('should clear existing data before saving new data', async () => {
      // Save initial data
      await dataStorage.saveInventoryData('test-file-1', mockInventoryData)
      
      // Save new data (should replace existing)
      const newData = [mockInventoryData[0]] // Only first item
      await dataStorage.saveInventoryData('test-file-1', newData)
      
      const retrieved = await dataStorage.getInventoryData('test-file-1')
      expect(retrieved).toHaveLength(1)
      expect(retrieved[0]).toEqual(mockInventoryData[0])
    })

    it('should retrieve all inventory data when no fileId is provided', async () => {
      await dataStorage.saveInventoryData('file-1', [mockInventoryData[0]])
      await dataStorage.saveInventoryData('file-2', [mockInventoryData[1]])
      
      const allData = await dataStorage.getInventoryData()
      expect(allData).toHaveLength(2)
    })

    it('should clear inventory data for a specific file', async () => {
      await dataStorage.saveInventoryData('file-1', mockInventoryData)
      await dataStorage.saveInventoryData('file-2', [mockInventoryData[0]])
      
      await dataStorage.clearInventoryData('file-1')
      
      const file1Data = await dataStorage.getInventoryData('file-1')
      const file2Data = await dataStorage.getInventoryData('file-2')
      
      expect(file1Data).toHaveLength(0)
      expect(file2Data).toHaveLength(1)
    })

    it('should clear all inventory data when no fileId is provided', async () => {
      await dataStorage.saveInventoryData('file-1', mockInventoryData)
      await dataStorage.saveInventoryData('file-2', [mockInventoryData[0]])
      
      await dataStorage.clearInventoryData()
      
      const allData = await dataStorage.getInventoryData()
      expect(allData).toHaveLength(0)
    })
  })

  describe('Settings Operations', () => {
    const mockSettings: AppSettings = {
      activeFileId: 'test-file-1',
      lastUpdated: new Date('2024-01-15')
    }

    it('should save and retrieve app settings', async () => {
      await dataStorage.saveSettings(mockSettings)
      const retrieved = await dataStorage.getSettings()
      
      expect(retrieved).toEqual(mockSettings)
    })

    it('should return null when no settings exist', async () => {
      const retrieved = await dataStorage.getSettings()
      expect(retrieved).toBeNull()
    })

    it('should set and get active file ID', async () => {
      await dataStorage.setActiveFileId('active-file-123')
      const retrievedId = await dataStorage.getActiveFileId()
      
      expect(retrievedId).toBe('active-file-123')
    })

    it('should handle null active file ID', async () => {
      await dataStorage.setActiveFileId(null)
      const retrievedId = await dataStorage.getActiveFileId()
      
      expect(retrievedId).toBeNull()
    })

    it('should update existing settings when setting active file ID', async () => {
      // Set initial settings
      await dataStorage.saveSettings(mockSettings)
      
      // Update active file ID
      await dataStorage.setActiveFileId('new-active-file')
      
      const updatedSettings = await dataStorage.getSettings()
      expect(updatedSettings?.activeFileId).toBe('new-active-file')
      expect(updatedSettings?.lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('Utility Methods', () => {
    it('should clear all data from all stores', async () => {
      // Add data to all stores
      await dataStorage.saveFileMetadata({
        id: 'test-file',
        name: 'test.xlsx',
        uploadDate: new Date(),
        isActive: true,
        recordCount: 100,
        validationStatus: 'valid'
      })
      
      await dataStorage.saveInventoryData('test-file', [{
        material: 123456,
        materialDescription: 'Test',
        plant: 'P001',
        storageLocation: 'WH01',
        baseUnitOfMeasure: 'EA',
        unrestricted: 100,
        stockInTransfer: 0,
        inQualityInsp: 0,
        restrictedUseStock: 0,
        blocked: 0,
        valueUnrestricted: 1000,
        totalShelfLife: 365,
        sled: 0,
        dateOfManufacture: 0,
        batch: 'BATCH001',
        totalQuantity: 100,
        status: 'unrestricted'
      }])
      
      await dataStorage.setActiveFileId('test-file')
      
      // Clear all data
      await dataStorage.clearAllData()
      
      // Verify all data is cleared
      const files = await dataStorage.getAllFileMetadata()
      const inventory = await dataStorage.getInventoryData()
      const settings = await dataStorage.getSettings()
      
      expect(files).toHaveLength(0)
      expect(inventory).toHaveLength(0)
      expect(settings).toBeNull()
    })

    it('should return database size information', async () => {
      // Add some data
      await dataStorage.saveFileMetadata({
        id: 'test-file',
        name: 'test.xlsx',
        uploadDate: new Date(),
        isActive: true,
        recordCount: 1,
        validationStatus: 'valid'
      })
      
      await dataStorage.saveInventoryData('test-file', [{
        material: 123456,
        materialDescription: 'Test',
        plant: 'P001',
        storageLocation: 'WH01',
        baseUnitOfMeasure: 'EA',
        unrestricted: 100,
        stockInTransfer: 0,
        inQualityInsp: 0,
        restrictedUseStock: 0,
        blocked: 0,
        valueUnrestricted: 1000,
        totalShelfLife: 365,
        sled: 0,
        dateOfManufacture: 0,
        batch: 'BATCH001',
        totalQuantity: 100,
        status: 'unrestricted'
      }])
      
      await dataStorage.setActiveFileId('test-file')
      
      const size = await dataStorage.getDatabaseSize()
      
      expect(size.files).toBe(1)
      expect(size.inventory).toBe(1)
      expect(size.settings).toBe(1)
    })
  })

  describe('Debug Methods', () => {
    it('should execute debug storage contents without errors', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      // Add some test data
      await dataStorage.saveFileMetadata({
        id: 'debug-test',
        name: 'debug.xlsx',
        uploadDate: new Date(),
        isActive: true,
        recordCount: 1,
        validationStatus: 'valid'
      })
      
      await dataStorage.debugStorageContents()
      
      expect(consoleSpy).toHaveBeenCalledWith('=== STORAGE DEBUG ===')
      expect(consoleSpy).toHaveBeenCalledWith('=== END STORAGE DEBUG ===')
    })
  })
})