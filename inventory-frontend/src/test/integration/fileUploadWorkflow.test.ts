import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dataStorage } from '../../services/dataStorage'
import { inventoryService } from '../../services/inventoryService'
import { excelProcessor } from '../../services/excelProcessor'
import type { MaterialDetail } from '../../types'

describe('File Upload Workflow Integration', () => {
  beforeEach(async () => {
    // Clear all data before each test
    await dataStorage.init()
    await dataStorage.clearAllData()
    inventoryService.clearInventoryData()
  })

  describe('Complete File Upload and Processing Workflow', () => {
    it('should process a valid Excel file end-to-end', async () => {
      // Create a mock Excel file
      const mockFile = new File(['mock excel data'], 'test-inventory.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      // Process the file
      const processResult = await excelProcessor.processFile(mockFile)

      // Verify the file was processed successfully
      expect(processResult.success).toBe(true)
      expect(processResult.fileId).toBeDefined()
      expect(processResult.recordCount).toBeGreaterThan(0)
      expect(processResult.validation.isValid).toBe(true)

      // Verify file metadata was saved
      const fileMetadata = await dataStorage.getFileMetadata(processResult.fileId)
      expect(fileMetadata).toBeDefined()
      expect(fileMetadata?.name).toBe('test-inventory.xlsx')
      expect(fileMetadata?.isActive).toBe(true) // Should be auto-activated since no errors
      expect(fileMetadata?.recordCount).toBe(processResult.recordCount)

      // Verify inventory data was saved and loaded
      const inventoryData = await dataStorage.getInventoryData(processResult.fileId)
      expect(inventoryData.length).toBeGreaterThan(0)
      expect(inventoryData[0]).toHaveProperty('material')
      expect(inventoryData[0]).toHaveProperty('materialDescription')
      expect(inventoryData[0]).toHaveProperty('plant')

      // Verify the inventory service has the data
      await inventoryService.init()
      expect(inventoryService.isDataLoaded_()).toBe(true)
      expect(inventoryService.getDataCount()).toBe(inventoryData.length)

      // Test metrics calculation
      const metrics = inventoryService.getInventoryMetrics()
      expect(metrics.totalInventory).toBeGreaterThan(0)
      expect(metrics.totalUnrestricted).toBeGreaterThanOrEqual(0)
      expect(metrics.totalBlocked).toBeGreaterThanOrEqual(0)
    })

    it('should handle file activation workflow', async () => {
      // Upload first file
      const file1 = new File(['mock file 1'], 'inventory-1.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const result1 = await excelProcessor.processFile(file1)
      expect(result1.success).toBe(true)

      // Upload second file (should become active)
      const file2 = new File(['mock file 2'], 'inventory-2.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const result2 = await excelProcessor.processFile(file2)
      expect(result2.success).toBe(true)

      // Verify second file is active
      const file2Metadata = await dataStorage.getFileMetadata(result2.fileId)
      expect(file2Metadata?.isActive).toBe(true)

      // Verify first file is no longer active
      const file1Metadata = await dataStorage.getFileMetadata(result1.fileId)
      expect(file1Metadata?.isActive).toBe(false)

      // Activate first file
      await excelProcessor.activateFile(result1.fileId)

      // Verify activation worked
      const updatedFile1 = await dataStorage.getFileMetadata(result1.fileId)
      const updatedFile2 = await dataStorage.getFileMetadata(result2.fileId)
      
      expect(updatedFile1?.isActive).toBe(true)
      expect(updatedFile2?.isActive).toBe(false)

      // Verify the inventory service loaded the correct data
      await inventoryService.refreshData()
      const activeFileId = await dataStorage.getActiveFileId()
      expect(activeFileId).toBe(result1.fileId)
    })

    it('should handle file deletion workflow', async () => {
      // Upload a file
      const file = new File(['mock file'], 'to-delete.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const result = await excelProcessor.processFile(file)
      expect(result.success).toBe(true)

      // Verify file exists
      const fileMetadata = await dataStorage.getFileMetadata(result.fileId)
      expect(fileMetadata).toBeDefined()

      // Verify data exists
      const inventoryData = await dataStorage.getInventoryData(result.fileId)
      expect(inventoryData.length).toBeGreaterThan(0)

      // Delete the file
      await excelProcessor.deleteFile(result.fileId)

      // Verify file metadata is deleted
      const deletedFile = await dataStorage.getFileMetadata(result.fileId)
      expect(deletedFile).toBeNull()

      // Verify associated data is deleted
      const deletedData = await dataStorage.getInventoryData(result.fileId)
      expect(deletedData).toHaveLength(0)

      // Verify inventory service state is cleared if it was the active file
      expect(inventoryService.isDataLoaded_()).toBe(false)
      expect(inventoryService.getDataCount()).toBe(0)
    })
  })

  describe('Data Processing and Analytics Integration', () => {
    const mockInventoryData: MaterialDetail[] = [
      {
        material: 123456,
        materialDescription: 'Test Material A',
        plant: 'P001',
        storageLocation: 'WH01',
        baseUnitOfMeasure: 'EA',
        unrestricted: 1000,
        stockInTransfer: 0,
        inQualityInsp: 0,
        restrictedUseStock: 0,
        blocked: 50,
        valueUnrestricted: 25000,
        totalShelfLife: 365,
        sled: 0,
        dateOfManufacture: 0,
        batch: 'BATCH001',
        totalQuantity: 1050,
        status: 'blocked'
      },
      {
        material: 789012,
        materialDescription: 'Test Material B',
        plant: 'P002',
        storageLocation: 'WH02',
        baseUnitOfMeasure: 'KG',
        unrestricted: 500,
        stockInTransfer: 100,
        inQualityInsp: 0,
        restrictedUseStock: 0,
        blocked: 0,
        valueUnrestricted: 15000,
        totalShelfLife: 180,
        sled: 0,
        dateOfManufacture: 0,
        batch: 'BATCH002',
        totalQuantity: 600,
        status: 'in-transfer'
      }
    ]

    it('should provide analytics after file processing', async () => {
      // Save mock data directly to test analytics
      await dataStorage.saveInventoryData('test-file', mockInventoryData)
      await dataStorage.setActiveFileId('test-file')
      await inventoryService.loadActiveFileData()

      // Test metrics calculation
      const metrics = inventoryService.getInventoryMetrics()
      expect(metrics.totalInventory).toBe(1650) // 1050 + 600
      expect(metrics.totalBlocked).toBe(50)
      expect(metrics.totalUnrestricted).toBe(1500) // 1000 + 500
      expect(metrics.totalInTransfer).toBe(100)

      // Test location statistics
      const locationStats = inventoryService.getLocationStats()
      expect(locationStats).toHaveLength(2)
      expect(locationStats.find(l => l.storageLocation === 'WH01')?.totalQuantity).toBe(1050)
      expect(locationStats.find(l => l.storageLocation === 'WH02')?.totalQuantity).toBe(600)

      // Test plant statistics
      const plantStats = inventoryService.getPlantStats()
      expect(plantStats).toHaveLength(2)
      expect(plantStats.find(p => p.plant === 'P001')?.totalQuantity).toBe(1050)
      expect(plantStats.find(p => p.plant === 'P002')?.totalQuantity).toBe(600)

      // Test material details with filtering
      const blockedMaterials = inventoryService.getBlockedMaterials()
      expect(blockedMaterials).toHaveLength(1)
      expect(blockedMaterials[0].material).toBe(123456)

      // Test drill-down functionality
      const p001Materials = await inventoryService.drillDownByPlant('P001')
      expect(p001Materials.materials).toHaveLength(1)
      expect(p001Materials.materials[0].plant).toBe('P001')
    })

    it('should handle multiple file scenarios', async () => {
      // Create two different datasets
      const dataset1: MaterialDetail[] = [
        {
          ...mockInventoryData[0],
          material: 111111,
          plant: 'P001',
          storageLocation: 'WH01'
        }
      ]

      const dataset2: MaterialDetail[] = [
        {
          ...mockInventoryData[1],
          material: 222222,
          plant: 'P002',
          storageLocation: 'WH02'
        }
      ]

      // Save both datasets
      await dataStorage.saveInventoryData('file-1', dataset1)
      await dataStorage.saveInventoryData('file-2', dataset2)

      // Set first file as active
      await dataStorage.setActiveFileId('file-1')
      await inventoryService.loadActiveFileData()

      // Verify only first dataset is loaded
      expect(inventoryService.getDataCount()).toBe(1)
      let metrics = inventoryService.getInventoryMetrics()
      expect(metrics.totalInventory).toBe(1050)

      // Switch to second file
      await excelProcessor.activateFile('file-2')

      // Verify second dataset is now loaded
      expect(inventoryService.getDataCount()).toBe(1)
      metrics = inventoryService.getInventoryMetrics()
      expect(metrics.totalInventory).toBe(600)
      expect(metrics.totalInTransfer).toBe(100)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle storage failures gracefully', async () => {
      // Mock storage failure
      const originalSaveInventoryData = dataStorage.saveInventoryData
      vi.spyOn(dataStorage, 'saveInventoryData').mockRejectedValue(new Error('Storage failure'))

      const file = new File(['mock file'], 'error-test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const result = await excelProcessor.processFile(file)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Storage failure')

      // Restore original method
      vi.mocked(dataStorage.saveInventoryData).mockRestore()
    })

    it('should handle service initialization failures', async () => {
      // Mock initialization failure
      vi.spyOn(dataStorage, 'init').mockRejectedValue(new Error('Init failure'))

      await expect(inventoryService.init()).rejects.toThrow()

      // Verify service state is not corrupted
      expect(inventoryService.isDataLoaded_()).toBe(false)
      expect(inventoryService.getDataCount()).toBe(0)

      // Restore original method
      vi.mocked(dataStorage.init).mockRestore()
    })
  })

  describe('Data Persistence Integration', () => {
    it('should persist data across service restarts', async () => {
      // Upload and process a file
      const file = new File(['mock file'], 'persistence-test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const result = await excelProcessor.processFile(file)
      expect(result.success).toBe(true)

      // Get initial metrics
      const initialMetrics = inventoryService.getInventoryMetrics()
      expect(initialMetrics.totalInventory).toBeGreaterThan(0)

      // Clear service data (simulating restart)
      inventoryService.clearInventoryData()
      expect(inventoryService.isDataLoaded_()).toBe(false)

      // Re-initialize service
      await inventoryService.init()

      // Verify data was restored
      expect(inventoryService.isDataLoaded_()).toBe(true)
      const restoredMetrics = inventoryService.getInventoryMetrics()
      expect(restoredMetrics).toEqual(initialMetrics)
    })

    it('should handle concurrent file operations', async () => {
      // Create multiple files
      const files = [
        new File(['file 1'], 'concurrent-1.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        new File(['file 2'], 'concurrent-2.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        new File(['file 3'], 'concurrent-3.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      ]

      // Process all files concurrently
      const results = await Promise.all(files.map(file => excelProcessor.processFile(file)))

      // Verify all files were processed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // Verify file history contains all files
      const history = await excelProcessor.getFileHistory()
      expect(history.length).toBeGreaterThanOrEqual(3)

      // Only the last processed file should be active
      const activeFiles = history.filter(file => file.isActive)
      expect(activeFiles).toHaveLength(1)
    })
  })
})