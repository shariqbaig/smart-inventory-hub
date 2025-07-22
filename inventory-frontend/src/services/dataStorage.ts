import type { MaterialDetail } from '../types';

// Database configuration
const DB_NAME = 'InventoryHub';
const DB_VERSION = 1;
const STORE_NAMES = {
  INVENTORY: 'inventory',
  FILES: 'files',
  SETTINGS: 'settings'
} as const;

// File metadata interface
export interface FileMetadata {
  id: string;
  name: string;
  uploadDate: Date;
  isActive: boolean;
  recordCount: number;
  validationStatus: 'valid' | 'invalid' | 'warning';
  errorCount?: number;
  warningCount?: number;
}

// Settings interface
export interface AppSettings {
  activeFileId: string | null;
  lastUpdated: Date;
}

class DataStorageService {
  private db: IDBDatabase | null = null;

  // Initialize the database
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create inventory store
        if (!db.objectStoreNames.contains(STORE_NAMES.INVENTORY)) {
          const inventoryStore = db.createObjectStore(STORE_NAMES.INVENTORY, {
            keyPath: 'id',
            autoIncrement: true
          });
          inventoryStore.createIndex('fileId', 'fileId', { unique: false });
          inventoryStore.createIndex('material', 'material', { unique: false });
          inventoryStore.createIndex('plant', 'plant', { unique: false });
          inventoryStore.createIndex('storageLocation', 'storageLocation', { unique: false });
          inventoryStore.createIndex('status', 'status', { unique: false });
        }

        // Create files store
        if (!db.objectStoreNames.contains(STORE_NAMES.FILES)) {
          db.createObjectStore(STORE_NAMES.FILES, {
            keyPath: 'id'
          });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(STORE_NAMES.SETTINGS)) {
          db.createObjectStore(STORE_NAMES.SETTINGS, {
            keyPath: 'key'
          });
        }
      };
    });
  }

  // Ensure database is initialized
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Generic method to perform database operations
  private async performOperation<T>(
    storeName: string,
    operation: (store: IDBObjectStore) => IDBRequest,
    mode: IDBTransactionMode = 'readonly'
  ): Promise<T> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onerror = () => {
        reject(new Error(`Database operation failed: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  // Inventory Data Operations
  async saveInventoryData(fileId: string, data: MaterialDetail[]): Promise<void> {
    console.log(`[DataStorage] Saving ${data.length} inventory records for fileId: ${fileId}`);
    
    // Clear existing data for this file first
    await this.clearInventoryData(fileId);
    
    if (data.length > 0) {
      console.log(`[DataStorage] Sample data being saved:`, {
        material: data[0].material,
        materialDescription: data[0].materialDescription?.substring(0, 50) + '...',
        plant: data[0].plant,
        storageLocation: data[0].storageLocation,
        unrestricted: data[0].unrestricted,
        blocked: data[0].blocked
      });
    }

    // Then add new data in a separate transaction
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAMES.INVENTORY], 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.INVENTORY);
      let completed = 0;
      const total = data.length;

      if (total === 0) {
        resolve();
        return;
      }

      transaction.oncomplete = () => {
        console.log(`[DataStorage] Successfully saved ${total} inventory records for fileId: ${fileId}`);
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      };

      // Add all items to the store
      data.forEach((item, index) => {
        const request = store.add({
          ...item,
          fileId,
          id: `${fileId}_${index}`
        });

        request.onerror = () => {
          reject(new Error(`Failed to add item ${index}: ${request.error?.message}`));
        };

        request.onsuccess = () => {
          completed++;
          // Don't resolve here - wait for transaction to complete
        };
      });
    });
  }

  async getInventoryData(fileId?: string): Promise<MaterialDetail[]> {
    console.log(`[DataStorage] Getting inventory data for fileId: ${fileId}`);
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAMES.INVENTORY], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.INVENTORY);

    return new Promise((resolve, reject) => {
      let request: IDBRequest;

      if (fileId) {
        const index = store.index('fileId');
        request = index.getAll(fileId);
        console.log(`[DataStorage] Querying inventory data by fileId index: ${fileId}`);
      } else {
        request = store.getAll();
        console.log(`[DataStorage] Querying all inventory data`);
      }

      request.onerror = () => {
        console.error(`[DataStorage] Error retrieving inventory data for fileId ${fileId}:`, request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        const rawResults = request.result;
        console.log(`[DataStorage] Raw query results for fileId ${fileId}:`, rawResults.length, 'records');
        
        if (rawResults.length > 0) {
          console.log(`[DataStorage] Sample raw record:`, {
            id: rawResults[0].id,
            fileId: rawResults[0].fileId,
            material: rawResults[0].material,
            materialDescription: rawResults[0].materialDescription?.substring(0, 50) + '...'
          });
        }
        
        const results = rawResults.map((item: any) => {
          // Remove the internal id and fileId before returning
          const { id, fileId: fId, ...cleanItem } = item;
          return cleanItem as MaterialDetail;
        });
        console.log(`[DataStorage] Returning ${results.length} cleaned inventory records for fileId: ${fileId}`);
        resolve(results);
      };
    });
  }

  async clearInventoryData(fileId?: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAMES.INVENTORY], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.INVENTORY);

    if (fileId) {
      // Clear data for specific file
      const index = store.index('fileId');
      const request = index.getAllKeys(fileId);
      
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const keys = request.result;
          const deletePromises = keys.map(key => {
            return new Promise<void>((resolve, reject) => {
              const deleteRequest = store.delete(key);
              deleteRequest.onerror = () => reject(deleteRequest.error);
              deleteRequest.onsuccess = () => resolve();
            });
          });
          
          Promise.all(deletePromises).then(() => resolve()).catch(reject);
        };
      });
    } else {
      // Clear all data
      return this.performOperation(STORE_NAMES.INVENTORY, (store) => store.clear(), 'readwrite');
    }
  }

  // File Management Operations
  async saveFileMetadata(metadata: FileMetadata): Promise<void> {
    return this.performOperation(
      STORE_NAMES.FILES,
      (store) => store.put(metadata),
      'readwrite'
    );
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    const result = await this.performOperation<FileMetadata>(
      STORE_NAMES.FILES,
      (store) => store.get(fileId)
    );
    return result || null;
  }

  async getAllFileMetadata(): Promise<FileMetadata[]> {
    return this.performOperation<FileMetadata[]>(
      STORE_NAMES.FILES,
      (store) => store.getAll()
    );
  }

  async deleteFileMetadata(fileId: string): Promise<void> {
    // Delete file metadata
    await this.performOperation(
      STORE_NAMES.FILES,
      (store) => store.delete(fileId),
      'readwrite'
    );
    
    // Delete associated inventory data
    await this.clearInventoryData(fileId);
  }

  // Settings Operations
  async saveSettings(settings: AppSettings): Promise<void> {
    return this.performOperation(
      STORE_NAMES.SETTINGS,
      (store) => store.put({ key: 'app', ...settings }),
      'readwrite'
    );
  }

  async getSettings(): Promise<AppSettings | null> {
    const result = await this.performOperation<any>(
      STORE_NAMES.SETTINGS,
      (store) => store.get('app')
    );
    
    if (!result) return null;
    
    const { key, ...settings } = result;
    return settings as AppSettings;
  }

  async getActiveFileId(): Promise<string | null> {
    const settings = await this.getSettings();
    return settings?.activeFileId || null;
  }

  async setActiveFileId(fileId: string | null): Promise<void> {
    const currentSettings = await this.getSettings() || {
      activeFileId: null,
      lastUpdated: new Date()
    };
    
    await this.saveSettings({
      ...currentSettings,
      activeFileId: fileId,
      lastUpdated: new Date()
    });
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    console.log('Clearing all IndexedDB data...');
    await Promise.all([
      this.performOperation(STORE_NAMES.INVENTORY, (store) => store.clear(), 'readwrite'),
      this.performOperation(STORE_NAMES.FILES, (store) => store.clear(), 'readwrite'),
      this.performOperation(STORE_NAMES.SETTINGS, (store) => store.clear(), 'readwrite')
    ]);
    console.log('All IndexedDB data cleared');
  }

  async getDatabaseSize(): Promise<{ inventory: number; files: number; settings: number }> {
    const [inventory, files, settings] = await Promise.all([
      this.performOperation<number>(STORE_NAMES.INVENTORY, (store) => store.count()),
      this.performOperation<number>(STORE_NAMES.FILES, (store) => store.count()),
      this.performOperation<number>(STORE_NAMES.SETTINGS, (store) => store.count())
    ]);

    return { inventory, files, settings };
  }

  // Debug method to inspect storage contents
  async debugStorageContents(): Promise<void> {
    console.log('=== STORAGE DEBUG ===');
    
    // Check all files
    const allFiles = await this.getAllFileMetadata();
    console.log('All files in storage:', allFiles.map(f => ({
      id: f.id,
      name: f.name,
      isActive: f.isActive,
      recordCount: f.recordCount,
      validationStatus: f.validationStatus
    })));
    
    // Check active file
    const activeFileId = await this.getActiveFileId();
    console.log('Active file ID:', activeFileId);
    
    // Check inventory data for each file
    for (const file of allFiles) {
      const data = await this.getInventoryData(file.id);
      console.log(`Data for file ${file.name} (${file.id}):`, data.length, 'records');
    }
    
    // Check total inventory data
    const allData = await this.getInventoryData();
    console.log('Total inventory records in storage:', allData.length);
    
    console.log('=== END STORAGE DEBUG ===');
  }
}

// Export singleton instance
export const dataStorage = new DataStorageService();

// Global debug function for browser console
(window as any).debugStorage = () => dataStorage.debugStorageContents();