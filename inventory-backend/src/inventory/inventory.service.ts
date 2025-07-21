import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import {
  InventoryItem,
  InventoryMetrics,
  LocationStats,
  PlantStats,
  MaterialDetail,
  DrillDownFilter,
} from './inventory.interface';

@Injectable()
export class InventoryService {
  private inventoryData: InventoryItem[] = [];
  private isDataLoaded = false;

  constructor() {
    this.loadInventoryData();
  }

  private async loadInventoryData(): Promise<void> {
    try {
      let rawData;
      let dataSource = 'no active file';
      
      // Check for uploaded files using Files API
      const activeFilePath = await this.getActiveFileFromAPI();
      
      if (activeFilePath) {
        try {
          const workbook = XLSX.readFile(activeFilePath);
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          rawData = XLSX.utils.sheet_to_json(worksheet);
          dataSource = `uploaded file: ${path.basename(activeFilePath)}`;
        } catch (error) {
          console.error('Error reading active file:', error.message);
          throw new Error(`Failed to read active file: ${error.message}`);
        }
      }
      
      // No fallback - require an active file to be uploaded
      if (!rawData) {
        console.warn('No active file found. Please upload and activate an inventory file.');
        this.inventoryData = [];
        this.isDataLoaded = false;
        return;
      }
      
      console.log(`Loading data from ${dataSource}`);
      console.log(`Raw data count: ${rawData.length}`);

      this.inventoryData = rawData.map((row: any) => {
        const storageLocation = String(row['Storage Location'] || '').trim();
        const stockInTransfer = Number(row['Stock in transfer']) || 0;
        
        // If storage location is empty but there's stock in transfer, show as "SIT"
        const displayLocation = (!storageLocation && stockInTransfer > 0) 
          ? 'SIT' 
          : storageLocation || 'Unknown Location';
        
        return {
          material: Number(row['Material']),
          materialDescription: String(row['Material Description']),
          plant: String(row['Plant']),
          storageLocation: displayLocation,
          baseUnitOfMeasure: String(row['Base Unit of Measure']),
          unrestricted: Number(row['Unrestricted']) || 0,
          stockInTransfer: stockInTransfer,
          inQualityInsp: Number(row['In Quality Insp.']) || 0,
          restrictedUseStock: Number(row['Restricted-Use Stock']) || 0,
          blocked: Number(row['Blocked']) || 0,
          valueUnrestricted: Number(row['Value Unrestricted']) || 0,
          totalShelfLife: Number(row['Total shelf life']) || 0,
          sled: Number(row['SLED/BBD']) || 0,
          dateOfManufacture: Number(row['Date of Manufacture']) || 0,
          batch: row['Batch'],
        };
      });

      this.isDataLoaded = true;
      console.log(`Successfully loaded ${this.inventoryData.length} inventory items from ${dataSource}`);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      this.inventoryData = [];
      this.isDataLoaded = false;
    }
  }

  // Method to refresh data when a new file is activated
  refreshData(): void {
    console.log('Refreshing inventory data...');
    this.loadInventoryData().catch(console.error);
  }

  // Method for FilesService to directly provide data
  setInventoryData(data: any[]): void {
    console.log(`Setting inventory data directly from FilesService: ${data.length} records`);
    console.log('First record sample (before transformation):', JSON.stringify(data[0], null, 2));
    
    this.inventoryData = data.map((row: any) => {
      const storageLocation = String(row['Storage Location'] || '').trim();
      const stockInTransfer = Number(row['Stock in transfer']) || 0;
      
      // If storage location is empty but there's stock in transfer, show as "SIT"
      const displayLocation = (!storageLocation && stockInTransfer > 0) 
        ? 'SIT' 
        : storageLocation || 'Unknown Location';
      
      return {
        material: Number(row['Material']),
        materialDescription: String(row['Material Description']),
        plant: String(row['Plant']),
        storageLocation: displayLocation,
        baseUnitOfMeasure: String(row['Base Unit of Measure']),
        unrestricted: Number(row['Unrestricted']) || 0,
        stockInTransfer: stockInTransfer,
        inQualityInsp: Number(row['In Quality Insp.']) || 0,
        restrictedUseStock: Number(row['Restricted-Use Stock']) || 0,
        blocked: Number(row['Blocked']) || 0,
        valueUnrestricted: Number(row['Value Unrestricted']) || 0,
        totalShelfLife: Number(row['Total shelf life']) || 0,
        sled: Number(row['SLED/BBD']) || 0,
        dateOfManufacture: Number(row['Date of Manufacture']) || 0,
        batch: row['Batch'],
      };
    });

    this.isDataLoaded = true;
    console.log(`Successfully set ${this.inventoryData.length} inventory items`);
    console.log('First transformed record:', JSON.stringify(this.inventoryData[0], null, 2));
    
    // Calculate and log metrics to verify data is set correctly
    const totalInventory = this.inventoryData.reduce((sum, item) => 
      sum + item.unrestricted + item.stockInTransfer + item.inQualityInsp + item.restrictedUseStock + item.blocked, 0);
    console.log('Total inventory after data update:', totalInventory);
  }

  // Clear data when no active file
  clearInventoryData(): void {
    console.log('Clearing inventory data - no active file');
    this.inventoryData = [];
    this.isDataLoaded = false;
  }

  private async getActiveFileFromAPI(): Promise<string | null> {
    try {
      // Use direct injection to avoid circular dependency
      const filesService = this.getFilesService();
      if (filesService) {
        const activeData = filesService.getActiveFileData();
        if (activeData && activeData.length > 0) {
          console.log(`Found active file data directly from FilesService (${activeData.length} records)`);
          return 'DIRECT_DATA'; // Special marker to indicate we have direct data
        }
      }
      
      console.log('No active file found in FilesService');
      return null;
    } catch (error) {
      console.log('Could not access FilesService directly:', error.message);
      return null;
    }
  }

  private getFilesService(): any {
    try {
      // Use require to avoid circular dependency at startup
      const { FilesService } = require('../files/files.service');
      // This is a hack to get the singleton instance - in production this should be proper DI
      return global['filesServiceInstance'];
    } catch (error) {
      console.log('Could not get FilesService instance:', error.message);
      return null;
    }
  }

  async getDebugInfo(): Promise<any> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const activeFile = await this.getActiveFileFromAPI();
    
    return {
      inventoryDataCount: this.inventoryData.length,
      isDataLoaded: this.isDataLoaded,
      uploadsDir,
      activeUploadedFile: activeFile,
      firstInventoryRecord: this.inventoryData[0] || null,
    };
  }

  getInventoryMetrics(filters?: DrillDownFilter): InventoryMetrics {
    if (!this.isDataLoaded || this.inventoryData.length === 0) {
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
}