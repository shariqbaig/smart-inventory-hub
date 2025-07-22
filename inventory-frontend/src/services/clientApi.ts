import type { InventoryMetrics, LocationStats, PlantStats, MaterialDetail } from '../types';
import { inventoryService } from './inventoryService';
import { excelProcessor } from './excelProcessor';
import { dataStorage, type FileMetadata } from './dataStorage';

// Client-side implementation of the inventory API
class ClientInventoryApi {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await dataStorage.init();
    await inventoryService.init();
    this.isInitialized = true;
    
    console.log('Client-side API initialized');
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // Get overall metrics
  async getMetrics(): Promise<InventoryMetrics> {
    await this.ensureInitialized();
    return inventoryService.getInventoryMetrics();
  }

  // Get location statistics
  async getLocationStats(): Promise<LocationStats[]> {
    await this.ensureInitialized();
    return inventoryService.getLocationStats();
  }

  // Get plant statistics
  async getPlantStats(): Promise<PlantStats[]> {
    await this.ensureInitialized();
    return inventoryService.getPlantStats();
  }

  // Get material details
  async getMaterialDetails(filters: any = {}): Promise<{ materials: MaterialDetail[], total: number }> {
    await this.ensureInitialized();
    
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    
    // Convert API filter format to service filter format
    const serviceFilters = {
      plant: filters.plant,
      storageLocation: filters.storageLocation,
      status: filters.status,
      search: filters.search || filters.materialDescription,
      materialDescription: filters.materialDescription
    };

    return inventoryService.getMaterialDetails(serviceFilters, page, limit);
  }

  // Get blocked materials
  async getBlockedMaterials(): Promise<MaterialDetail[]> {
    await this.ensureInitialized();
    return inventoryService.getBlockedMaterials();
  }

  // Get restricted materials
  async getRestrictedMaterials(): Promise<MaterialDetail[]> {
    await this.ensureInitialized();
    return inventoryService.getRestrictedMaterials();
  }

  // Drill down by location
  async drillDownByLocation(location: string): Promise<{ materials: MaterialDetail[], total: number }> {
    await this.ensureInitialized();
    return inventoryService.drillDownByLocation(location);
  }

  // Drill down by plant
  async drillDownByPlant(plant: string): Promise<{ materials: MaterialDetail[], total: number }> {
    await this.ensureInitialized();
    return inventoryService.drillDownByPlant(plant);
  }

  // File management endpoints
  async getFileHistory(): Promise<FileMetadata[]> {
    await this.ensureInitialized();
    return excelProcessor.getFileHistory();
  }

  async activateFile(fileId: string): Promise<void> {
    await this.ensureInitialized();
    await excelProcessor.activateFile(fileId);
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.ensureInitialized();
    await excelProcessor.deleteFile(fileId);
  }

  // For backwards compatibility with existing components
  baseURL = 'client-side';
}

// Export singleton instance with the same interface as the original API
export const clientInventoryApi = new ClientInventoryApi();

// Legacy export for compatibility
export const inventoryApi = clientInventoryApi;