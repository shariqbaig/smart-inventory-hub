import type { InventoryMetrics, LocationStats, PlantStats, MaterialDetail } from '../types';
import { dataStorage } from './dataStorage';

// Raw inventory item interface (matches backend structure)
export interface InventoryItem {
  material: number;
  materialDescription: string;
  plant: string;
  storageLocation: string;
  baseUnitOfMeasure: string;
  unrestricted: number;
  stockInTransfer: number;
  inQualityInsp: number;
  restrictedUseStock: number;
  blocked: number;
  valueUnrestricted: number;
  totalShelfLife: number;
  sled: number;
  dateOfManufacture: number;
  batch: string | number;
}

// Filter interface for data operations
export interface DrillDownFilter {
  plant?: string;
  storageLocation?: string;
  material?: number;
  status?: string;
  materialDescription?: string;
  search?: string;
}

class InventoryService {
  private inventoryData: InventoryItem[] = [];
  private isDataLoaded = false;

  async init(): Promise<void> {
    await dataStorage.init();
    await this.loadActiveFileData();
  }

  // Load data from the active file
  async loadActiveFileData(): Promise<void> {
    try {
      console.log('Loading active file data...');
      const activeFileId = await dataStorage.getActiveFileId();
      console.log('Active file ID:', activeFileId);
      
      if (!activeFileId) {
        console.warn('No active file found');
        this.clearInventoryData();
        return;
      }

      const rawData = await dataStorage.getInventoryData(activeFileId);
      console.log(`Retrieved ${rawData.length} records from storage for file ${activeFileId}`);
      
      if (!rawData.length) {
        console.warn('No data found for active file');
        this.clearInventoryData();
        return;
      }

      // Convert MaterialDetail back to InventoryItem format
      this.inventoryData = rawData.map(item => ({
        material: item.material,
        materialDescription: item.materialDescription,
        plant: item.plant,
        storageLocation: item.storageLocation,
        baseUnitOfMeasure: item.baseUnitOfMeasure,
        unrestricted: item.unrestricted,
        stockInTransfer: item.stockInTransfer,
        inQualityInsp: item.inQualityInsp,
        restrictedUseStock: item.restrictedUseStock,
        blocked: item.blocked,
        valueUnrestricted: item.valueUnrestricted,
        totalShelfLife: item.totalShelfLife,
        sled: item.sled,
        dateOfManufacture: item.dateOfManufacture,
        batch: item.batch,
      }));

      this.isDataLoaded = true;
      console.log(`Successfully loaded ${this.inventoryData.length} inventory items`);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      this.clearInventoryData();
    }
  }

  // Set inventory data directly (used by file upload)
  async setInventoryData(rawData: any[], fileId: string): Promise<void> {
    console.log(`Setting inventory data: ${rawData.length} records for file ${fileId}`);
    console.log('Raw data type check:', {
      isArray: Array.isArray(rawData),
      firstItemType: typeof rawData[0],
      firstItemKeys: rawData[0] ? Object.keys(rawData[0]) : 'N/A'
    });
    
    // Clear existing data first
    this.inventoryData = [];
    
    if (rawData.length === 0) {
      console.warn('No data to process');
      return;
    }

    // Check if data is in object format (from XLSX sheet_to_json without header: 1)
    if (rawData[0] && typeof rawData[0] === 'object' && !Array.isArray(rawData[0])) {
      console.log('Processing object format data...');
      this.processObjectFormatData(rawData, fileId);
    } else {
      console.log('Processing array format data...');
      this.processArrayFormatData(rawData, fileId);
    }

    console.log(`Successfully processed ${this.inventoryData.length} items`);
    
    // Complete the data processing and save to storage
    await this.completeDataProcessing(fileId);
  }

  private processObjectFormatData(objectData: any[], fileId: string): void {
    console.log('Sample object row:', JSON.stringify(objectData[0], null, 2));
    
    this.inventoryData = objectData.map((row: any, rowIndex: number) => {
      // Helper function to safely parse numbers
      const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined || value === '') return defaultValue;
        const parsed = Number(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      // Helper function to safely parse strings
      const safeString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        return String(value).trim();
      };

      // Helper to find column value by partial key match
      const findValue = (partialKey: string, defaultValue: any = '') => {
        const keys = Object.keys(row);
        const foundKey = keys.find(key => 
          key.toLowerCase().includes(partialKey.toLowerCase())
        );
        return foundKey ? row[foundKey] : defaultValue;
      };

      const storageLocation = safeString(findValue('storage location'));
      const stockInTransfer = safeNumber(findValue('transfer'));
      
      // If storage location is empty but there's stock in transfer, show as "SIT"
      const displayLocation = (!storageLocation && stockInTransfer > 0) 
        ? 'SIT' 
        : storageLocation || 'Unknown Location';
      
      const processedItem = {
        material: safeNumber(findValue('material')),
        materialDescription: safeString(findValue('description'), `Material ${rowIndex + 1}`),
        plant: safeString(findValue('plant'), 'Unknown Plant'),
        storageLocation: displayLocation,
        baseUnitOfMeasure: safeString(findValue('unit'), 'EA'),
        unrestricted: safeNumber(findValue('unrestricted')),
        stockInTransfer: stockInTransfer,
        inQualityInsp: safeNumber(findValue('quality')),
        restrictedUseStock: safeNumber(findValue('restricted')),
        blocked: safeNumber(findValue('blocked')),
        valueUnrestricted: safeNumber(findValue('value')),
        totalShelfLife: safeNumber(findValue('shelf')),
        sled: safeNumber(findValue('sled')),
        dateOfManufacture: safeNumber(findValue('manufacture')),
        batch: safeString(findValue('batch')),
      };

      console.log(`Processed object item ${rowIndex + 1}:`, processedItem);
      return processedItem;
    }).filter(item => item !== null);
  }

  private processArrayFormatData(arrayData: any[], fileId: string): void {
    // Get headers from first row
    const headers = arrayData[0];
    const dataRows = arrayData.slice(1); // Skip header row
    
    console.log('Excel headers:', headers);
    console.log('Sample data row:', dataRows[0]);
    
    // Create column index mapping
    const getColumnIndex = (columnName: string): number => {
      const index = headers.findIndex((header: any) => 
        String(header).trim().toLowerCase().includes(columnName.toLowerCase())
      );
      return index;
    };

    // Define column mappings
    const columnMapping = {
      material: getColumnIndex('material'),
      materialDescription: getColumnIndex('description'),
      plant: getColumnIndex('plant'),
      storageLocation: getColumnIndex('storage location'),
      baseUnitOfMeasure: getColumnIndex('unit'),
      unrestricted: getColumnIndex('unrestricted'),
      stockInTransfer: getColumnIndex('transfer'),
      inQualityInsp: getColumnIndex('quality'),
      restrictedUseStock: getColumnIndex('restricted'),
      blocked: getColumnIndex('blocked'),
      valueUnrestricted: getColumnIndex('value'),
      totalShelfLife: getColumnIndex('shelf life'),
      sled: getColumnIndex('sled'),
      dateOfManufacture: getColumnIndex('manufacture'),
      batch: getColumnIndex('batch')
    };

    console.log('Column mapping:', columnMapping);
    
    this.inventoryData = dataRows.map((row: any[], rowIndex: number) => {
      // Helper function to safely parse numbers
      const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined || value === '') return defaultValue;
        const parsed = Number(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      // Helper function to safely parse strings
      const safeString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        return String(value).trim();
      };

      // Helper to get value by column index
      const getValue = (columnIndex: number, defaultValue: any = '') => {
        if (columnIndex === -1 || !row[columnIndex]) return defaultValue;
        return row[columnIndex];
      };

      const storageLocation = safeString(getValue(columnMapping.storageLocation));
      const stockInTransfer = safeNumber(getValue(columnMapping.stockInTransfer));
      
      const processedItem = {
        material: safeNumber(getValue(columnMapping.material)),
        materialDescription: safeString(getValue(columnMapping.materialDescription), `Material ${rowIndex + 1}`),
        plant: safeString(getValue(columnMapping.plant), 'Unknown Plant'),
        storageLocation: storageLocation || 'Unknown Location',
        baseUnitOfMeasure: safeString(getValue(columnMapping.baseUnitOfMeasure), 'EA'),
        unrestricted: safeNumber(getValue(columnMapping.unrestricted)),
        stockInTransfer: stockInTransfer,
        inQualityInsp: safeNumber(getValue(columnMapping.inQualityInsp)),
        restrictedUseStock: safeNumber(getValue(columnMapping.restrictedUseStock)),
        blocked: safeNumber(getValue(columnMapping.blocked)),
        valueUnrestricted: safeNumber(getValue(columnMapping.valueUnrestricted)),
        totalShelfLife: safeNumber(getValue(columnMapping.totalShelfLife)),
        sled: safeNumber(getValue(columnMapping.sled)),
        dateOfManufacture: safeNumber(getValue(columnMapping.dateOfManufacture)),
        batch: safeString(getValue(columnMapping.batch)),
      };

      console.log(`Processed array item ${rowIndex + 1}:`, processedItem);
      return processedItem;
    }).filter(item => item !== null);
  }

  private async completeDataProcessing(fileId: string): Promise<void> {
    // Convert to MaterialDetail format for storage
    const materialDetails: MaterialDetail[] = this.inventoryData.map(item => {
      const totalQuantity = item.unrestricted + item.stockInTransfer + item.inQualityInsp + item.restrictedUseStock + item.blocked;
      let status: 'blocked' | 'unrestricted' | 'restricted' | 'in-transfer' | 'quality-inspection' = 'unrestricted';
      
      if (item.blocked > 0) status = 'blocked';
      else if (item.restrictedUseStock > 0) status = 'restricted';
      else if (item.stockInTransfer > 0) status = 'in-transfer';
      else if (item.inQualityInsp > 0) status = 'quality-inspection';

      return {
        ...item,
        totalQuantity,
        status,
      };
    });

    // Save to storage
    await dataStorage.saveInventoryData(fileId, materialDetails);
    await dataStorage.setActiveFileId(fileId);
    
    this.isDataLoaded = true;
    console.log(`Successfully set and saved ${this.inventoryData.length} inventory items`);
  }

  clearInventoryData(): void {
    console.log('Clearing inventory data - resetting service state');
    this.inventoryData = [];
    this.isDataLoaded = false;
  }

  async refreshData(): Promise<void> {
    console.log('Refreshing inventory data...');
    await this.loadActiveFileData();
  }

  // Load already processed data directly (used when activating existing files)
  async loadStoredData(materialDetails: MaterialDetail[], fileId: string): Promise<void> {
    console.log(`[InventoryService] Loading stored data: ${materialDetails.length} records for file ${fileId}`);
    
    // Clear existing data first
    this.inventoryData = [];
    
    if (materialDetails.length === 0) {
      console.warn(`[InventoryService] No stored data provided for file ${fileId}`);
      this.isDataLoaded = false;
      return;
    }
    
    console.log(`[InventoryService] Sample stored data being loaded:`, {
      material: materialDetails[0]?.material,
      materialDescription: materialDetails[0]?.materialDescription?.substring(0, 50) + '...',
      plant: materialDetails[0]?.plant,
      unrestricted: materialDetails[0]?.unrestricted,
      blocked: materialDetails[0]?.blocked
    });
    
    // Convert MaterialDetail back to InventoryItem format for the service
    this.inventoryData = materialDetails.map(item => ({
      material: item.material,
      materialDescription: item.materialDescription,
      plant: item.plant,
      storageLocation: item.storageLocation,
      baseUnitOfMeasure: item.baseUnitOfMeasure,
      unrestricted: item.unrestricted,
      stockInTransfer: item.stockInTransfer,
      inQualityInsp: item.inQualityInsp,
      restrictedUseStock: item.restrictedUseStock,
      blocked: item.blocked,
      valueUnrestricted: item.valueUnrestricted,
      totalShelfLife: item.totalShelfLife,
      sled: item.sled,
      dateOfManufacture: item.dateOfManufacture,
      batch: item.batch,
    }));

    this.isDataLoaded = true;
    console.log(`[InventoryService] Successfully loaded ${this.inventoryData.length} inventory items from storage`);
    console.log(`[InventoryService] Service state - isDataLoaded: ${this.isDataLoaded}, recordCount: ${this.inventoryData.length}`);
  }

  getInventoryMetrics(filters?: DrillDownFilter): InventoryMetrics {
    console.log(`Getting metrics - Data loaded: ${this.isDataLoaded}, Records: ${this.inventoryData.length}`);
    
    if (!this.isDataLoaded || this.inventoryData.length === 0) {
      console.log('No data available for metrics calculation');
      return {
        totalInventory: 0,
        totalBlocked: 0,
        totalUnrestricted: 0,
        totalRestricted: 0,
        totalInTransfer: 0,
        totalInQualityInsp: 0,
        totalInventoryValue: 0,
        totalBlockedValue: 0,
        totalUnrestrictedValue: 0,
        totalRestrictedValue: 0,
        totalInTransferValue: 0,
        totalInQualityInspValue: 0,
      };
    }

    const filteredData = this.filterData(filters);

    return {
      totalInventory: this.sum(filteredData, ['unrestricted', 'stockInTransfer', 'inQualityInsp', 'restrictedUseStock', 'blocked']),
      totalBlocked: this.sum(filteredData, ['blocked']),
      totalUnrestricted: this.sum(filteredData, ['unrestricted']),
      totalRestricted: this.sum(filteredData, ['restrictedUseStock']),
      totalInTransfer: this.sum(filteredData, ['stockInTransfer']),
      totalInQualityInsp: this.sum(filteredData, ['inQualityInsp']),
      totalInventoryValue: this.calculateTotalValue(filteredData),
      totalBlockedValue: this.calculateBlockedValue(filteredData),
      totalUnrestrictedValue: this.sum(filteredData, ['valueUnrestricted']),
      totalRestrictedValue: this.calculateRestrictedValue(filteredData),
      totalInTransferValue: this.calculateInTransferValue(filteredData),
      totalInQualityInspValue: this.calculateInQualityInspValue(filteredData),
    };
  }

  getLocationStats(filters?: DrillDownFilter): LocationStats[] {
    if (!this.isDataLoaded || this.inventoryData.length === 0) {
      return [];
    }

    const filteredData = this.filterData(filters);
    const locationMap = new Map<string, LocationStats>();

    filteredData.forEach(item => {
      const location = item.storageLocation;
      if (!locationMap.has(location)) {
        locationMap.set(location, {
          storageLocation: location,
          totalQuantity: 0,
          blockedQuantity: 0,
          unrestrictedQuantity: 0,
          materialCount: 0,
          totalValue: 0,
          blockedValue: 0,
          unrestrictedValue: 0,
        });
      }

      const stats = locationMap.get(location)!;
      stats.totalQuantity += item.unrestricted + item.stockInTransfer + item.inQualityInsp + item.restrictedUseStock + item.blocked;
      stats.blockedQuantity += item.blocked;
      stats.unrestrictedQuantity += item.unrestricted;
      stats.materialCount += 1;
      
      // Calculate values
      stats.unrestrictedValue += item.valueUnrestricted;
      
      // Always add the unrestricted value to total value
      stats.totalValue += item.valueUnrestricted;
      
      // Estimate other values based on unit value if we have unrestricted stock
      if (item.unrestricted > 0 && item.valueUnrestricted > 0) {
        const unitValue = item.valueUnrestricted / item.unrestricted;
        // Add estimated value for other stock types
        stats.totalValue += unitValue * (item.stockInTransfer + item.inQualityInsp + item.restrictedUseStock + item.blocked);
        stats.blockedValue += unitValue * item.blocked;
      }
    });

    return Array.from(locationMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }

  getPlantStats(filters?: DrillDownFilter): PlantStats[] {
    if (!this.isDataLoaded || this.inventoryData.length === 0) {
      return [];
    }

    const filteredData = this.filterData(filters);
    const plantMap = new Map<string, PlantStats>();

    filteredData.forEach(item => {
      const plant = item.plant;
      if (!plantMap.has(plant)) {
        plantMap.set(plant, {
          plant: plant,
          totalQuantity: 0,
          blockedQuantity: 0,
          unrestrictedQuantity: 0,
          materialCount: 0,
          locations: [],
          totalValue: 0,
          blockedValue: 0,
          unrestrictedValue: 0,
        });
      }

      const stats = plantMap.get(plant)!;
      stats.totalQuantity += item.unrestricted + item.stockInTransfer + item.inQualityInsp + item.restrictedUseStock + item.blocked;
      stats.blockedQuantity += item.blocked;
      stats.unrestrictedQuantity += item.unrestricted;
      stats.materialCount += 1;
      
      // Calculate values
      stats.unrestrictedValue += item.valueUnrestricted;
      
      // Always add the unrestricted value to total value
      stats.totalValue += item.valueUnrestricted;
      
      // Estimate other values based on unit value if we have unrestricted stock
      if (item.unrestricted > 0 && item.valueUnrestricted > 0) {
        const unitValue = item.valueUnrestricted / item.unrestricted;
        // Add estimated value for other stock types
        stats.totalValue += unitValue * (item.stockInTransfer + item.inQualityInsp + item.restrictedUseStock + item.blocked);
        stats.blockedValue += unitValue * item.blocked;
      }
      
      if (!stats.locations.includes(item.storageLocation)) {
        stats.locations.push(item.storageLocation);
      }
    });

    return Array.from(plantMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }

  getMaterialDetails(filters?: DrillDownFilter, page: number = 1, limit: number = 50): { materials: MaterialDetail[], total: number } {
    console.log('getMaterialDetails called with filters:', filters, 'page:', page, 'limit:', limit);
    
    if (!this.isDataLoaded || this.inventoryData.length === 0) {
      console.log('No data loaded - returning empty results');
      return { materials: [], total: 0 };
    }

    const filteredData = this.filterData(filters);
    console.log('Filtered data count:', filteredData.length);
    
    const materialsWithDetails: MaterialDetail[] = filteredData.map(item => {
      const totalQuantity = item.unrestricted + item.stockInTransfer + item.inQualityInsp + item.restrictedUseStock + item.blocked;
      let status: 'blocked' | 'unrestricted' | 'restricted' | 'in-transfer' | 'quality-inspection' = 'unrestricted';
      
      if (item.blocked > 0) status = 'blocked';
      else if (item.restrictedUseStock > 0) status = 'restricted';
      else if (item.stockInTransfer > 0) status = 'in-transfer';
      else if (item.inQualityInsp > 0) status = 'quality-inspection';

      return {
        ...item,
        totalQuantity,
        status,
      };
    });

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMaterials = materialsWithDetails.slice(startIndex, endIndex);

    return {
      materials: paginatedMaterials,
      total: materialsWithDetails.length,
    };
  }

  getBlockedMaterials(filters?: DrillDownFilter): MaterialDetail[] {
    if (!this.isDataLoaded || this.inventoryData.length === 0) {
      return [];
    }

    const allMaterials = this.getMaterialDetails(filters, 1, 10000);
    return allMaterials.materials.filter(material => material.blocked > 0);
  }

  getRestrictedMaterials(filters?: DrillDownFilter): MaterialDetail[] {
    if (!this.isDataLoaded || this.inventoryData.length === 0) {
      return [];
    }

    const allMaterials = this.getMaterialDetails(filters, 1, 10000);
    return allMaterials.materials.filter(material => material.restrictedUseStock > 0);
  }

  // Drill-down methods
  async drillDownByLocation(location: string): Promise<{ materials: MaterialDetail[], total: number }> {
    return this.getMaterialDetails({ storageLocation: location }, 1, 10000);
  }

  async drillDownByPlant(plant: string): Promise<{ materials: MaterialDetail[], total: number }> {
    return this.getMaterialDetails({ plant }, 1, 10000);
  }

  private filterData(filters?: DrillDownFilter): InventoryItem[] {
    if (!filters) {
      console.log('No filters applied, returning all data:', this.inventoryData.length);
      return this.inventoryData;
    }

    console.log('Applying filters:', filters);
    
    const result = this.inventoryData.filter(item => {
      if (filters.plant && item.plant !== filters.plant) {
        return false;
      }
      if (filters.storageLocation && item.storageLocation !== filters.storageLocation) {
        return false;
      }
      if (filters.material && item.material !== filters.material) {
        return false;
      }
      if (filters.materialDescription && !item.materialDescription.toLowerCase().includes(filters.materialDescription.toLowerCase())) {
        return false;
      }
      if ((filters as any).search && !item.materialDescription.toLowerCase().includes(((filters as any).search as string).toLowerCase())) {
        return false;
      }
      
      if (filters.status) {
        switch (filters.status) {
          case 'blocked':
            if (item.blocked <= 0) return false;
            break;
          case 'unrestricted':
            if (item.unrestricted <= 0 || item.blocked > 0) return false;
            break;
          case 'restricted':
            if (item.restrictedUseStock <= 0) return false;
            break;
          case 'in-transfer':
            if (item.stockInTransfer <= 0) return false;
            break;
          case 'quality-inspection':
            if (item.inQualityInsp <= 0) return false;
            break;
        }
      }

      return true;
    });
    
    console.log('Filter result count:', result.length);
    return result;
  }

  private sum(data: InventoryItem[], fields: (keyof InventoryItem)[]): number {
    return data.reduce((total, item) => {
      return total + fields.reduce((fieldTotal, field) => {
        const value = item[field];
        return fieldTotal + (typeof value === 'number' ? value : 0);
      }, 0);
    }, 0);
  }

  private calculateTotalValue(data: InventoryItem[]): number {
    return data.reduce((total, item) => {
      // Calculate total value by estimating value per unit and multiplying by total quantity
      const totalQuantity = item.unrestricted + item.stockInTransfer + item.inQualityInsp + item.restrictedUseStock + item.blocked;
      if (totalQuantity === 0 || item.unrestricted === 0) {
        return total;
      }
      
      // Use unrestricted value as base and estimate unit value
      const unitValue = item.valueUnrestricted / item.unrestricted;
      return total + (unitValue * totalQuantity);
    }, 0);
  }

  private calculateBlockedValue(data: InventoryItem[]): number {
    return data.reduce((total, item) => {
      if (item.unrestricted === 0 || item.blocked === 0) {
        return total;
      }
      
      // Estimate blocked value based on unrestricted unit value
      const unitValue = item.valueUnrestricted / item.unrestricted;
      return total + (unitValue * item.blocked);
    }, 0);
  }

  private calculateRestrictedValue(data: InventoryItem[]): number {
    return data.reduce((total, item) => {
      if (item.unrestricted === 0 || item.restrictedUseStock === 0) {
        return total;
      }
      
      // Estimate restricted value based on unrestricted unit value
      const unitValue = item.valueUnrestricted / item.unrestricted;
      return total + (unitValue * item.restrictedUseStock);
    }, 0);
  }

  private calculateInTransferValue(data: InventoryItem[]): number {
    return data.reduce((total, item) => {
      if (item.unrestricted === 0 || item.stockInTransfer === 0) {
        return total;
      }
      
      // Estimate in-transfer value based on unrestricted unit value
      const unitValue = item.valueUnrestricted / item.unrestricted;
      return total + (unitValue * item.stockInTransfer);
    }, 0);
  }

  private calculateInQualityInspValue(data: InventoryItem[]): number {
    return data.reduce((total, item) => {
      if (item.unrestricted === 0 || item.inQualityInsp === 0) {
        return total;
      }
      
      // Estimate quality inspection value based on unrestricted unit value
      const unitValue = item.valueUnrestricted / item.unrestricted;
      return total + (unitValue * item.inQualityInsp);
    }, 0);
  }

  // Helper methods for file management integration
  isDataLoaded_(): boolean {
    return this.isDataLoaded;
  }

  getDataCount(): number {
    return this.inventoryData.length;
  }
}

// Export singleton instance
export const inventoryService = new InventoryService();