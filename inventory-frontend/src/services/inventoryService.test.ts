import { describe, it, expect, beforeEach, vi } from 'vitest'
import { inventoryService, type InventoryItem, type DrillDownFilter } from './inventoryService'
import type { MaterialDetail } from '../types'

// Mock the dataStorage service
vi.mock('./dataStorage', () => ({
  dataStorage: {
    init: vi.fn().mockResolvedValue(undefined),
    getActiveFileId: vi.fn(),
    getInventoryData: vi.fn(),
    saveInventoryData: vi.fn(),
    setActiveFileId: vi.fn()
  }
}))

describe('InventoryService', () => {
  const mockInventoryItems: InventoryItem[] = [
    {
      material: 123456,
      materialDescription: 'Test Material A - Electronics',
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
      sled: 44927,
      dateOfManufacture: 44562,
      batch: 'BATCH001'
    },
    {
      material: 789012,
      materialDescription: 'Test Material B - Chemicals',
      plant: 'P002',
      storageLocation: 'WH02',
      baseUnitOfMeasure: 'KG',
      unrestricted: 500,
      stockInTransfer: 100,
      inQualityInsp: 25,
      restrictedUseStock: 0,
      blocked: 0,
      valueUnrestricted: 15000,
      totalShelfLife: 180,
      sled: 0,
      dateOfManufacture: 0,
      batch: 'BATCH002'
    },
    {
      material: 345678,
      materialDescription: 'Test Material C - Restricted Item',
      plant: 'P001',
      storageLocation: 'WH03',
      baseUnitOfMeasure: 'PCS',
      unrestricted: 0,
      stockInTransfer: 0,
      inQualityInsp: 0,
      restrictedUseStock: 200,
      blocked: 0,
      valueUnrestricted: 0,
      totalShelfLife: 0,
      sled: 0,
      dateOfManufacture: 0,
      batch: 'BATCH003'
    }
  ]

  const mockMaterialDetails: MaterialDetail[] = [
    {
      ...mockInventoryItems[0],
      totalQuantity: 1050,
      status: 'blocked'
    },
    {
      ...mockInventoryItems[1],
      totalQuantity: 625,
      status: 'in-transfer'
    },
    {
      ...mockInventoryItems[2],
      totalQuantity: 200,
      status: 'restricted'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    inventoryService.clearInventoryData()
  })

  describe('Initialization', () => {
    it('should initialize and load active file data', async () => {
      const { dataStorage } = await import('./dataStorage')
      vi.mocked(dataStorage.getActiveFileId).mockResolvedValue('active-file-123')
      vi.mocked(dataStorage.getInventoryData).mockResolvedValue(mockMaterialDetails)

      await inventoryService.init()

      expect(dataStorage.init).toHaveBeenCalled()
      expect(dataStorage.getActiveFileId).toHaveBeenCalled()
      expect(dataStorage.getInventoryData).toHaveBeenCalledWith('active-file-123')
    })

    it('should handle no active file gracefully', async () => {
      const { dataStorage } = await import('./dataStorage')
      vi.mocked(dataStorage.getActiveFileId).mockResolvedValue(null)

      await inventoryService.init()

      expect(inventoryService.isDataLoaded_()).toBe(false)
      expect(inventoryService.getDataCount()).toBe(0)
    })

    it('should handle empty data gracefully', async () => {
      const { dataStorage } = await import('./dataStorage')
      vi.mocked(dataStorage.getActiveFileId).mockResolvedValue('active-file-123')
      vi.mocked(dataStorage.getInventoryData).mockResolvedValue([])

      await inventoryService.loadActiveFileData()

      expect(inventoryService.isDataLoaded_()).toBe(false)
      expect(inventoryService.getDataCount()).toBe(0)
    })
  })

  describe('Data Loading and Management', () => {
    it('should load stored data correctly', async () => {
      await inventoryService.loadStoredData(mockMaterialDetails, 'test-file-123')

      expect(inventoryService.isDataLoaded_()).toBe(true)
      expect(inventoryService.getDataCount()).toBe(3)
    })

    it('should handle empty stored data', async () => {
      await inventoryService.loadStoredData([], 'test-file-123')

      expect(inventoryService.isDataLoaded_()).toBe(false)
      expect(inventoryService.getDataCount()).toBe(0)
    })

    it('should clear inventory data', () => {
      // First load some data
      inventoryService.loadStoredData(mockMaterialDetails, 'test-file-123')
      expect(inventoryService.isDataLoaded_()).toBe(true)

      // Then clear it
      inventoryService.clearInventoryData()
      expect(inventoryService.isDataLoaded_()).toBe(false)
      expect(inventoryService.getDataCount()).toBe(0)
    })

    it('should refresh data from storage', async () => {
      const { dataStorage } = await import('./dataStorage')
      vi.mocked(dataStorage.getActiveFileId).mockResolvedValue('active-file-123')
      vi.mocked(dataStorage.getInventoryData).mockResolvedValue(mockMaterialDetails)

      await inventoryService.refreshData()

      expect(dataStorage.getActiveFileId).toHaveBeenCalled()
      expect(dataStorage.getInventoryData).toHaveBeenCalledWith('active-file-123')
    })
  })

  describe('Data Processing', () => {
    beforeEach(async () => {
      await inventoryService.loadStoredData(mockMaterialDetails, 'test-file-123')
    })

    describe('processObjectFormatData', () => {
      it('should process object format Excel data correctly', async () => {
        const objectData = [
          {
            'Material': '999888',
            'Material Description': 'Object Format Material',
            'Plant': 'P999',
            'Storage Location': 'OBJ01',
            'Base Unit of Measure': 'EA',
            'Unrestricted': 200,
            'Blocked': 20,
            'Value Unrestricted': 2000
          }
        ]

        const { dataStorage } = await import('./dataStorage')
        vi.mocked(dataStorage.saveInventoryData).mockResolvedValue()
        vi.mocked(dataStorage.setActiveFileId).mockResolvedValue()

        await inventoryService.setInventoryData(objectData, 'obj-test-file')

        expect(dataStorage.saveInventoryData).toHaveBeenCalled()
        expect(dataStorage.setActiveFileId).toHaveBeenCalledWith('obj-test-file')
      })

      it('should handle missing storage location with stock in transfer', async () => {
        const objectData = [
          {
            'Material': '777666',
            'Material Description': 'Transfer Material',
            'Plant': 'P777',
            'Storage Location': '', // Empty location
            'Stock in transfer': 150, // Has transfer stock
            'Base Unit of Measure': 'KG',
            'Unrestricted': 0,
            'Blocked': 0
          }
        ]

        const { dataStorage } = await import('./dataStorage')
        vi.mocked(dataStorage.saveInventoryData).mockResolvedValue()
        vi.mocked(dataStorage.setActiveFileId).mockResolvedValue()

        await inventoryService.setInventoryData(objectData, 'transfer-test-file')

        expect(dataStorage.saveInventoryData).toHaveBeenCalled()
        // Should have converted empty location to 'SIT' due to stock in transfer
      })
    })

    describe('processArrayFormatData', () => {
      it('should process array format Excel data correctly', async () => {
        const arrayData = [
          ['Material', 'Material Description', 'Plant', 'Storage Location', 'Base Unit of Measure', 'Unrestricted', 'Blocked', 'Value Unrestricted'],
          ['555444', 'Array Format Material', 'P555', 'ARR01', 'PCS', 300, 30, 3000]
        ]

        const { dataStorage } = await import('./dataStorage')
        vi.mocked(dataStorage.saveInventoryData).mockResolvedValue()
        vi.mocked(dataStorage.setActiveFileId).mockResolvedValue()

        await inventoryService.setInventoryData(arrayData, 'arr-test-file')

        expect(dataStorage.saveInventoryData).toHaveBeenCalled()
        expect(dataStorage.setActiveFileId).toHaveBeenCalledWith('arr-test-file')
      })
    })
  })

  describe('Metrics Calculations', () => {
    beforeEach(async () => {
      await inventoryService.loadStoredData(mockMaterialDetails, 'test-file-123')
    })

    it('should calculate inventory metrics correctly', () => {
      const metrics = inventoryService.getInventoryMetrics()

      expect(metrics.totalInventory).toBe(1875) // 1050 + 625 + 200
      expect(metrics.totalBlocked).toBe(50)
      expect(metrics.totalUnrestricted).toBe(1500) // 1000 + 500
      expect(metrics.totalRestricted).toBe(200)
      expect(metrics.totalInTransfer).toBe(100)
      expect(metrics.totalInQualityInsp).toBe(25)
      expect(metrics.totalUnrestrictedValue).toBe(40000) // 25000 + 15000
    })

    it('should return zero metrics when no data is loaded', () => {
      inventoryService.clearInventoryData()
      const metrics = inventoryService.getInventoryMetrics()

      expect(metrics.totalInventory).toBe(0)
      expect(metrics.totalBlocked).toBe(0)
      expect(metrics.totalUnrestricted).toBe(0)
      expect(metrics.totalInventoryValue).toBe(0)
    })

    it('should calculate filtered metrics correctly', () => {
      const filter: DrillDownFilter = { plant: 'P001' }
      const metrics = inventoryService.getInventoryMetrics(filter)

      // Only materials from P001 (first and third items)
      expect(metrics.totalInventory).toBe(1250) // 1050 + 200
      expect(metrics.totalBlocked).toBe(50)
      expect(metrics.totalRestricted).toBe(200)
    })
  })

  describe('Location Statistics', () => {
    beforeEach(async () => {
      await inventoryService.loadStoredData(mockMaterialDetails, 'test-file-123')
    })

    it('should calculate location statistics correctly', () => {
      const locationStats = inventoryService.getLocationStats()

      expect(locationStats).toHaveLength(3)
      
      const wh01Stats = locationStats.find(l => l.storageLocation === 'WH01')
      expect(wh01Stats).toBeDefined()
      expect(wh01Stats?.totalQuantity).toBe(1050)
      expect(wh01Stats?.blockedQuantity).toBe(50)
      expect(wh01Stats?.unrestrictedQuantity).toBe(1000)
      expect(wh01Stats?.materialCount).toBe(1)
    })

    it('should sort location statistics by total quantity descending', () => {
      const locationStats = inventoryService.getLocationStats()

      expect(locationStats[0].totalQuantity).toBeGreaterThanOrEqual(locationStats[1].totalQuantity)
      expect(locationStats[1].totalQuantity).toBeGreaterThanOrEqual(locationStats[2].totalQuantity)
    })

    it('should return empty array when no data is loaded', () => {
      inventoryService.clearInventoryData()
      const locationStats = inventoryService.getLocationStats()

      expect(locationStats).toHaveLength(0)
    })
  })

  describe('Plant Statistics', () => {
    beforeEach(async () => {
      await inventoryService.loadStoredData(mockMaterialDetails, 'test-file-123')
    })

    it('should calculate plant statistics correctly', () => {
      const plantStats = inventoryService.getPlantStats()

      expect(plantStats).toHaveLength(2) // P001 and P002
      
      const p001Stats = plantStats.find(p => p.plant === 'P001')
      expect(p001Stats).toBeDefined()
      expect(p001Stats?.totalQuantity).toBe(1250) // 1050 + 200
      expect(p001Stats?.materialCount).toBe(2)
      expect(p001Stats?.locations).toContain('WH01')
      expect(p001Stats?.locations).toContain('WH03')
    })

    it('should return empty array when no data is loaded', () => {
      inventoryService.clearInventoryData()
      const plantStats = inventoryService.getPlantStats()

      expect(plantStats).toHaveLength(0)
    })
  })

  describe('Material Details', () => {
    beforeEach(async () => {
      await inventoryService.loadStoredData(mockMaterialDetails, 'test-file-123')
    })

    it('should get paginated material details', () => {
      const result = inventoryService.getMaterialDetails(undefined, 1, 2)

      expect(result.materials).toHaveLength(2)
      expect(result.total).toBe(3)
      expect(result.materials[0].material).toBe(123456)
      expect(result.materials[0].status).toBe('blocked')
    })

    it('should filter materials by search term', () => {
      const filter: DrillDownFilter = { materialDescription: 'Electronics' }
      const result = inventoryService.getMaterialDetails(filter)

      expect(result.materials).toHaveLength(1)
      expect(result.materials[0].materialDescription).toContain('Electronics')
    })

    it('should filter materials by status', () => {
      const filter: DrillDownFilter = { status: 'blocked' }
      const result = inventoryService.getMaterialDetails(filter)

      expect(result.materials).toHaveLength(1)
      expect(result.materials[0].status).toBe('blocked')
    })

    it('should filter materials by plant', () => {
      const filter: DrillDownFilter = { plant: 'P002' }
      const result = inventoryService.getMaterialDetails(filter)

      expect(result.materials).toHaveLength(1)
      expect(result.materials[0].plant).toBe('P002')
    })

    it('should return empty results when no data is loaded', () => {
      inventoryService.clearInventoryData()
      const result = inventoryService.getMaterialDetails()

      expect(result.materials).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('Specialized Material Queries', () => {
    beforeEach(async () => {
      await inventoryService.loadStoredData(mockMaterialDetails, 'test-file-123')
    })

    it('should get blocked materials only', () => {
      const blockedMaterials = inventoryService.getBlockedMaterials()

      expect(blockedMaterials).toHaveLength(1)
      expect(blockedMaterials[0].blocked).toBeGreaterThan(0)
      expect(blockedMaterials[0].status).toBe('blocked')
    })

    it('should get restricted materials only', () => {
      const restrictedMaterials = inventoryService.getRestrictedMaterials()

      expect(restrictedMaterials).toHaveLength(1)
      expect(restrictedMaterials[0].restrictedUseStock).toBeGreaterThan(0)
      expect(restrictedMaterials[0].status).toBe('restricted')
    })
  })

  describe('Drill-down Methods', () => {
    beforeEach(async () => {
      await inventoryService.loadStoredData(mockMaterialDetails, 'test-file-123')
    })

    it('should drill down by location', async () => {
      const result = await inventoryService.drillDownByLocation('WH01')

      expect(result.materials).toHaveLength(1)
      expect(result.materials[0].storageLocation).toBe('WH01')
    })

    it('should drill down by plant', async () => {
      const result = await inventoryService.drillDownByPlant('P001')

      expect(result.materials).toHaveLength(2)
      expect(result.materials.every(m => m.plant === 'P001')).toBe(true)
    })
  })

  describe('Data Filtering', () => {
    beforeEach(async () => {
      await inventoryService.loadStoredData(mockMaterialDetails, 'test-file-123')
    })

    it('should handle complex filters', () => {
      const filter: DrillDownFilter = {
        plant: 'P001',
        status: 'blocked'
      }
      const result = inventoryService.getMaterialDetails(filter)

      expect(result.materials).toHaveLength(1)
      expect(result.materials[0].plant).toBe('P001')
      expect(result.materials[0].status).toBe('blocked')
    })

    it('should handle search filter', () => {
      const filter = { search: 'Electronics' } as any
      const result = inventoryService.getMaterialDetails(filter)

      expect(result.materials).toHaveLength(1)
      expect(result.materials[0].materialDescription).toContain('Electronics')
    })

    it('should return all data when no filters applied', () => {
      const result = inventoryService.getMaterialDetails()

      expect(result.materials).toHaveLength(3)
      expect(result.total).toBe(3)
    })
  })
})