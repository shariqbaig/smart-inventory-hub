import { inventoryApi } from './clientApi';
import { dataStorage } from './dataStorage';
import { inventoryService } from './inventoryService';

// Initialize all client-side services
export const initializeServices = async (): Promise<void> => {
  try {
    console.log('Initializing client-side services...');
    
    // Initialize the client-side API (which will init storage and inventory services)
    await inventoryApi.initialize();
    
    console.log('Client-side services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize client-side services:', error);
    throw error;
  }
};

// Utility function to completely reset the application
export const resetApplication = async (): Promise<void> => {
  try {
    console.log('Resetting application...');
    
    // Clear all data
    await dataStorage.clearAllData();
    
    // Clear inventory service
    inventoryService.clearInventoryData();
    
    console.log('✓ Application reset complete');
  } catch (error) {
    console.error('Failed to reset application:', error);
    throw error;
  }
};