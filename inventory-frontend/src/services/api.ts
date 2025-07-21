import axios from 'axios';
import type { InventoryMetrics, LocationStats, PlantStats, MaterialDetail } from '../types';

const API_BASE_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const inventoryApi = {
  // Get overall metrics
  getMetrics: async (): Promise<InventoryMetrics> => {
    const response = await api.get('/inventory/metrics');
    return response.data;
  },

  // Get location statistics
  getLocationStats: async (): Promise<LocationStats[]> => {
    const response = await api.get('/inventory/locations');
    return response.data;
  },

  // Get plant statistics
  getPlantStats: async (): Promise<PlantStats[]> => {
    const response = await api.get('/inventory/plants');
    return response.data;
  },

  // Get material details
  getMaterialDetails: async (filters: any = {}): Promise<{ materials: MaterialDetail[], total: number }> => {
    const params = new URLSearchParams();
    
    // Add all filter parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    const url = `/inventory/materials?${params.toString()}`;
    // console.log('API Call:', url);
    
    const response = await api.get(url);
    // console.log('API Response count:', response.data?.materials?.length || 0);
    return response.data;
  },

  // Get blocked materials
  getBlockedMaterials: async (): Promise<MaterialDetail[]> => {
    const response = await api.get('/inventory/blocked-materials');
    return response.data;
  },

  // Get restricted materials
  getRestrictedMaterials: async (): Promise<MaterialDetail[]> => {
    const response = await api.get('/inventory/restricted-materials');
    return response.data;
  },

  // Drill down by location
  drillDownByLocation: async (location: string): Promise<{ materials: MaterialDetail[], total: number }> => {
    const response = await api.get(`/inventory/drill-down/location/${encodeURIComponent(location)}`);
    return response.data;
  },

  // Drill down by plant
  drillDownByPlant: async (plant: string): Promise<{ materials: MaterialDetail[], total: number }> => {
    const response = await api.get(`/inventory/drill-down/plant/${encodeURIComponent(plant)}`);
    return response.data;
  },

  // File management endpoints
  getFileHistory: async (): Promise<any[]> => {
    const response = await api.get('/files/history');
    return response.data;
  },

  activateFile: async (fileId: string): Promise<void> => {
    await api.post(`/files/${fileId}/activate`);
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/files/${fileId}`);
  },

  // For accessing base URL in components
  baseURL: API_BASE_URL,
};

