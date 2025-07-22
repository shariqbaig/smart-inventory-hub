import * as XLSX from 'xlsx';
import type { FileMetadata } from './dataStorage';
import { dataStorage } from './dataStorage';
import { inventoryService } from './inventoryService';

export interface ValidationError {
  row: number;
  column: string;
  value: any;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
  errorFileUrl?: string;
  hasErrorFile?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  fileId: string;
  recordCount: number;
  validation: ValidationResult;
  fileMetadata: FileMetadata;
}

class ExcelProcessorService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly SUPPORTED_EXTENSIONS = ['.xlsx', '.xls'];

  async processFile(file: File): Promise<ProcessingResult> {
    try {
      // Basic file validation
      this.validateFileBasics(file);

      // Generate unique file ID
      const fileId = this.generateFileId();
      const timestamp = new Date();

      // Read Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      console.log('Excel workbook sheets:', workbook.SheetNames);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Try different approaches to read the data
      console.log('Worksheet range:', worksheet['!ref']);
      console.log('Raw worksheet data (first few cells):');
      console.log('A1:', worksheet['A1']);
      console.log('B1:', worksheet['B1']);
      console.log('C1:', worksheet['C1']);
      console.log('A2:', worksheet['A2']);
      console.log('B2:', worksheet['B2']);
      console.log('C2:', worksheet['C2']);
      
      // Read as array of arrays (rows)
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      console.log('Raw Excel data (header: 1):', JSON.stringify(rawData.slice(0, 3), null, 2));
      
      // Also try reading as objects
      const objectData = XLSX.utils.sheet_to_json(worksheet) as any[];
      console.log('Raw Excel data (as objects):', JSON.stringify(objectData.slice(0, 2), null, 2));

      // Clean and process the Excel data
      const data = this.cleanExcelData(rawData);
      console.log('Processed Excel data:', data.length, 'rows after cleaning');
      console.log('Processed headers:', JSON.stringify(data[0], null, 2));
      if (data[1]) {
        console.log('Sample processed row:', JSON.stringify(data[1], null, 2));
      }

      // Validate Excel data
      const validation = this.validateExcelData(data, fileId);
      
      // Create file metadata
      const fileMetadata: FileMetadata = {
        id: fileId,
        name: file.name,
        uploadDate: timestamp,
        isActive: false, // Will be set to true below if valid
        recordCount: Math.max(0, data.length - 1), // Exclude header row
        validationStatus: validation.isValid ? 'valid' : validation.errors.length > 0 ? 'invalid' : 'warning',
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
      };

      // Save file metadata
      await dataStorage.saveFileMetadata(fileMetadata);

      let message = 'File uploaded successfully';

      // Always process and save the data to storage, regardless of validation errors
      // Try to use the object format data if available, otherwise use array format
      const processingData = objectData.length > 0 ? objectData : data;
      console.log('Using processing data format:', objectData.length > 0 ? 'objects' : 'arrays');
      console.log('Processing and saving data to storage for future activation...');
      
      // Process the data and save it to storage (but don't activate yet)
      await inventoryService.setInventoryData(processingData, fileId);
      
      // Auto-activate if file has no errors (warnings are OK)
      const hasErrors = validation.errors.length > 0;
      if (!hasErrors) {
        // Since data is already processed and saved, just set the file as active
        await dataStorage.setActiveFileId(fileId);
        fileMetadata.isActive = true;
        
        // Save the updated file metadata with active status
        await dataStorage.saveFileMetadata(fileMetadata);
        
        const warningCount = validation.warnings.length;
        message += warningCount > 0 ? ` and activated (${warningCount} warnings)` : ' and activated';
        console.log(`Auto-activating uploaded file - no errors found (${warningCount} warnings)`);
      } else {
        console.log('File has validation errors - data saved but not auto-activating. User must fix errors and manually activate.');
        message += ' with validation errors - data saved for later activation';
      }

      return {
        success: true,
        message,
        fileId,
        recordCount: fileMetadata.recordCount,
        validation,
        fileMetadata
      };
    } catch (error) {
      console.error('Error processing file:', error);
      return {
        success: false,
        message: `Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fileId: '',
        recordCount: 0,
        validation: {
          isValid: false,
          errors: [{
            row: 0,
            column: 'File',
            value: '',
            message: error instanceof Error ? error.message : 'Unknown processing error'
          }],
          warnings: [],
          summary: {
            totalRows: 0,
            validRows: 0,
            errorRows: 0,
            warningRows: 0
          }
        },
        fileMetadata: {
          id: '',
          name: file.name,
          uploadDate: new Date(),
          isActive: false,
          recordCount: 0,
          validationStatus: 'invalid'
        }
      };
    }
  }

  private cleanExcelData(rawData: any[][]): any[][] {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    // Clean headers and data
    const cleanedData = rawData.map((row, rowIndex) => {
      if (!row) return [];
      
      return row.map((cell, cellIndex) => {
        // Handle null, undefined, or empty cells
        if (cell === null || cell === undefined) {
          return '';
        }

        // Convert to string and trim
        let cleanCell = String(cell).trim();

        // For numeric columns, ensure proper number parsing
        if (rowIndex > 0) { // Skip header row
          const headers = rawData[0] || [];
          const header = headers[cellIndex];
          
          // Define numeric columns
          const numericColumns = [
            'Unrestricted', 'Stock in transfer', 'In Quality Insp.', 
            'Restricted-Use Stock', 'Blocked', 'Value Unrestricted', 
            'Total shelf life', 'SLED/BBD', 'Date of Manufacture'
          ];

          if (header && numericColumns.includes(String(header).trim())) {
            // Clean numeric values
            cleanCell = cleanCell.replace(/[^0-9.-]/g, ''); // Remove non-numeric chars except decimal and minus
            if (cleanCell === '' || cleanCell === '-' || isNaN(Number(cleanCell))) {
              return 0; // Default to 0 for empty numeric fields
            }
            return Number(cleanCell);
          }
        }

        return cleanCell;
      });
    });

    // Filter out completely empty rows
    return cleanedData.filter((row, index) => {
      if (index === 0) return true; // Always keep header row
      return row.some(cell => cell !== '' && cell !== 0);
    });
  }

  private validateFileBasics(file: File): void {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }

    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!this.SUPPORTED_EXTENSIONS.includes(extension)) {
      throw new Error(`File type ${extension} not supported. Please upload .xlsx or .xls files only.`);
    }
  }

  private validateExcelData(data: any[][], fileId: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    if (data.length === 0) {
      errors.push({
        row: 0,
        column: 'File',
        value: '',
        message: 'File is empty'
      });
    }

    const requiredColumns = [
      'Material',
      'Material Description', 
      'Plant',
      'Storage Location',
      'Base Unit of Measure',
      'Unrestricted',
      'Blocked'
    ];

    const headers = data[0] || [];
    
    // Check for required columns
    for (const requiredCol of requiredColumns) {
      if (!headers.includes(requiredCol)) {
        errors.push({
          row: 1,
          column: requiredCol,
          value: '',
          message: `Required column '${requiredCol}' is missing`
        });
      }
    }

    // Validate data rows
    let validRows = 0;
    const errorRows = new Set<number>();
    const warningRows = new Set<number>();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      let hasErrors = false;
      let hasWarnings = false;

      // Check Material column
      const materialIndex = headers.indexOf('Material');
      if (materialIndex >= 0) {
        const material = row[materialIndex];
        if (!material || material.toString().trim() === '') {
          errors.push({
            row: i + 1,
            column: 'Material',
            value: material,
            message: 'Material code cannot be empty'
          });
          hasErrors = true;
        } else {
          // Additional material validation
          const materialStr = material.toString().trim();
          if (materialStr.length < 3) {
            warnings.push({
              row: i + 1,
              column: 'Material',
              value: material,
              message: 'Material code is very short (less than 3 characters)'
            });
            hasWarnings = true;
          }
          if (!/^[A-Za-z0-9_-]+$/.test(materialStr)) {
            warnings.push({
              row: i + 1,
              column: 'Material',
              value: material,
              message: 'Material code contains special characters (recommended: letters, numbers, hyphens, underscores only)'
            });
            hasWarnings = true;
          }
        }
      } else {
        errors.push({
          row: i + 1,
          column: 'Material',
          value: '',
          message: 'Material column is missing from this row'
        });
        hasErrors = true;
      }

      // Check Description
      const descIndex = headers.indexOf('Material Description');
      if (descIndex >= 0) {
        const description = row[descIndex];
        if (!description || description.toString().trim() === '') {
          warnings.push({
            row: i + 1,
            column: 'Material Description',
            value: description,
            message: 'Material description is empty'
          });
          hasWarnings = true;
        }
      }

      // Check Plant
      const plantIndex = headers.indexOf('Plant');
      if (plantIndex >= 0) {
        const plant = row[plantIndex];
        if (!plant || plant.toString().trim() === '') {
          errors.push({
            row: i + 1,
            column: 'Plant',
            value: plant,
            message: 'Plant code cannot be empty'
          });
          hasErrors = true;
        } else {
          const plantStr = plant.toString().trim();
          if (plantStr.length > 10) {
            warnings.push({
              row: i + 1,
              column: 'Plant',
              value: plant,
              message: 'Plant code is unusually long (over 10 characters)'
            });
            hasWarnings = true;
          }
        }
      } else {
        errors.push({
          row: i + 1,
          column: 'Plant',
          value: '',
          message: 'Plant column is missing from this row'
        });
        hasErrors = true;
      }

      // Check Storage Location (can be empty if Stock in transfer exists)
      const locationIndex = headers.indexOf('Storage Location');
      const stockInTransferIndex = headers.indexOf('Stock in transfer');
      
      if (locationIndex >= 0) {
        const location = row[locationIndex];
        const stockInTransfer = stockInTransferIndex >= 0 ? Number(row[stockInTransferIndex]) || 0 : 0;
        
        if (!location || location.toString().trim() === '') {
          // Only require storage location if there's no stock in transfer
          if (stockInTransfer <= 0) {
            errors.push({
              row: i + 1,
              column: 'Storage Location',
              value: location,
              message: 'Storage Location cannot be empty unless there is Stock in transfer'
            });
            hasErrors = true;
          } else {
            // Add informational warning for empty location with transfer stock
            warnings.push({
              row: i + 1,
              column: 'Storage Location',
              value: location,
              message: 'Storage Location is empty but will be displayed as "SIT" due to Stock in transfer'
            });
            hasWarnings = true;
          }
        }
      } else {
        errors.push({
          row: i + 1,
          column: 'Storage Location',
          value: '',
          message: 'Storage Location column is missing from this row'
        });
        hasErrors = true;
      }

      // Check Base Unit of Measure
      const unitIndex = headers.indexOf('Base Unit of Measure');
      if (unitIndex >= 0) {
        const unit = row[unitIndex];
        if (!unit || unit.toString().trim() === '') {
          warnings.push({
            row: i + 1,
            column: 'Base Unit of Measure',
            value: unit,
            message: 'Base Unit of Measure is empty (will default to generic unit)'
          });
          hasWarnings = true;
        }
      }

      // Check quantities with enhanced validation
      const unrestrictedIndex = headers.indexOf('Unrestricted');
      if (unrestrictedIndex >= 0) {
        const unrestricted = row[unrestrictedIndex];
        if (unrestricted !== undefined && unrestricted !== null && unrestricted !== '') {
          const numValue = Number(unrestricted);
          if (isNaN(numValue)) {
            errors.push({
              row: i + 1,
              column: 'Unrestricted',
              value: unrestricted,
              message: 'Unrestricted quantity must be a number'
            });
            hasErrors = true;
          } else if (numValue < 0) {
            errors.push({
              row: i + 1,
              column: 'Unrestricted',
              value: unrestricted,
              message: 'Unrestricted quantity cannot be negative'
            });
            hasErrors = true;
          } else if (numValue > 1000000000) {
            warnings.push({
              row: i + 1,
              column: 'Unrestricted',
              value: unrestricted,
              message: 'Unrestricted quantity is extremely large (over 1 billion)'
            });
            hasWarnings = true;
          }
        }
      }

      const blockedIndex = headers.indexOf('Blocked');
      if (blockedIndex >= 0) {
        const blocked = row[blockedIndex];
        if (blocked !== undefined && blocked !== null && blocked !== '') {
          const numValue = Number(blocked);
          if (isNaN(numValue)) {
            errors.push({
              row: i + 1,
              column: 'Blocked',
              value: blocked,
              message: 'Blocked quantity must be a number'
            });
            hasErrors = true;
          } else if (numValue < 0) {
            errors.push({
              row: i + 1,
              column: 'Blocked',
              value: blocked,
              message: 'Blocked quantity cannot be negative'
            });
            hasErrors = true;
          } else if (numValue > 1000000000) {
            warnings.push({
              row: i + 1,
              column: 'Blocked',
              value: blocked,
              message: 'Blocked quantity is extremely large (over 1 billion)'
            });
            hasWarnings = true;
          }
        }
      }

      // Check for logical inconsistencies
      if (unrestrictedIndex >= 0 && blockedIndex >= 0) {
        const unrestrictedVal = Number(row[unrestrictedIndex]) || 0;
        const blockedVal = Number(row[blockedIndex]) || 0;
        
        if (unrestrictedVal === 0 && blockedVal === 0) {
          warnings.push({
            row: i + 1,
            column: 'Quantities',
            value: `Unrestricted: ${unrestrictedVal}, Blocked: ${blockedVal}`,
            message: 'Both unrestricted and blocked quantities are zero'
          });
          hasWarnings = true;
        }
      }

      // Check if row is completely empty
      if (row.every(cell => !cell || cell.toString().trim() === '')) {
        warnings.push({
          row: i + 1,
          column: 'All Columns',
          value: '',
          message: 'Row appears to be completely empty'
        });
        hasWarnings = true;
      }

      if (hasErrors) {
        errorRows.add(i + 1);
      } else if (!hasWarnings) {
        validRows++;
      }

      if (hasWarnings) {
        warningRows.add(i + 1);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRows: Math.max(0, data.length - 1), // Exclude header row
        validRows,
        errorRows: errorRows.size,
        warningRows: warningRows.size,
      }
    };
  }

  async activateFile(fileId: string, data?: any[]): Promise<void> {
    console.log(`[ExcelProcessor] Starting activation of file: ${fileId}`);
    
    // Clear service state only (not storage data)
    console.log('[ExcelProcessor] Clearing inventory service state...');
    inventoryService.clearInventoryData();
    
    // Deactivate all existing files
    const allFiles = await dataStorage.getAllFileMetadata();
    for (const file of allFiles) {
      if (file.isActive) {
        file.isActive = false;
        await dataStorage.saveFileMetadata(file);
      }
    }

    // Activate the selected file
    const fileMetadata = await dataStorage.getFileMetadata(fileId);
    if (!fileMetadata) {
      throw new Error('File not found');
    }

    fileMetadata.isActive = true;
    await dataStorage.saveFileMetadata(fileMetadata);

    // Set the active file ID in storage
    await dataStorage.setActiveFileId(fileId);

    // If data is provided (fresh upload), process and set it directly
    if (data && data.length > 0) {
      console.log('Processing fresh upload data...');
      await inventoryService.setInventoryData(data, fileId);
    } else {
      // For existing files, check if data is already saved in processed format
      console.log(`[ExcelProcessor] Activating existing file: ${fileId}, checking for stored data...`);
      
      // Get the stored processed data
      const storedData = await dataStorage.getInventoryData(fileId);
      console.log(`[ExcelProcessor] Retrieved data for activation: ${storedData?.length || 0} records`);
      
      if (storedData && storedData.length > 0) {
        console.log(`[ExcelProcessor] Found ${storedData.length} stored processed records, loading directly into inventory service...`);
        console.log(`[ExcelProcessor] Sample stored data:`, {
          material: storedData[0]?.material,
          materialDescription: storedData[0]?.materialDescription?.substring(0, 50) + '...',
          plant: storedData[0]?.plant,
          unrestricted: storedData[0]?.unrestricted,
          blocked: storedData[0]?.blocked
        });
        
        // Data is already in MaterialDetail format, so load it directly into the service
        // without re-processing through setInventoryData
        await inventoryService.loadStoredData(storedData, fileId);
        console.log(`[ExcelProcessor] Successfully loaded ${storedData.length} records into inventory service`);
      } else {
        console.warn(`[ExcelProcessor] No stored data found for fileId ${fileId}, inventory will be empty`);
        console.warn(`[ExcelProcessor] This might indicate data was not properly saved during initial upload`);
        inventoryService.clearInventoryData();
      }
    }

    console.log(`Successfully activated file: ${fileMetadata.name} (${fileMetadata.recordCount} records)`);
  }

  async deleteFile(fileId: string): Promise<void> {
    const fileMetadata = await dataStorage.getFileMetadata(fileId);
    if (!fileMetadata) {
      throw new Error('File not found');
    }

    // If this was the active file, clear inventory data
    if (fileMetadata.isActive) {
      inventoryService.clearInventoryData();
    }

    // Delete from storage
    await dataStorage.deleteFileMetadata(fileId);
    
    console.log(`Deleted file: ${fileMetadata.name}`);
  }

  async getFileHistory(): Promise<FileMetadata[]> {
    return await dataStorage.getAllFileMetadata();
  }

  generateTemplate(): Blob {
    // Create sample data
    const templateData = [
      [
        'Material',
        'Material Description',
        'Plant',
        'Storage Location',
        'Base Unit of Measure',
        'Unrestricted',
        'Stock in transfer',
        'In Quality Insp.',
        'Restricted-Use Stock',
        'Blocked',
        'Value Unrestricted',
        'Total shelf life',
        'SLED/BBD',
        'Date of Manufacture',
        'Batch'
      ],
      [
        '10001001',
        'Sample Material A',
        'P001',
        'WH01',
        'EA',
        1000,
        0,
        0,
        0,
        50,
        25000,
        365,
        44927,
        44562,
        'BATCH001'
      ],
      [
        '10001002',
        'Sample Material B',
        'P001',
        'WH02',
        'KG',
        500,
        100,
        0,
        0,
        0,
        15000,
        0,
        0,
        0,
        'BATCH002'
      ]
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Add some styling/formatting
    ws['!cols'] = [
      { wch: 12 }, // Material
      { wch: 25 }, // Description
      { wch: 8 },  // Plant
      { wch: 15 }, // Storage Location
      { wch: 8 },  // Base Unit
      { wch: 12 }, // Unrestricted
      { wch: 12 }, // Stock in transfer
      { wch: 12 }, // Quality Insp
      { wch: 15 }, // Restricted
      { wch: 10 }, // Blocked
      { wch: 15 }, // Value
      { wch: 12 }, // Shelf life
      { wch: 12 }, // SLED
      { wch: 15 }, // Date of Manufacture
      { wch: 12 }  // Batch
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  downloadTemplate(filename: string = 'inventory_template.xlsx'): void {
    const blob = this.generateTemplate();
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  private convertMaterialDetailsToExcelRows(materialDetails: any[]): any[][] {
    if (!materialDetails || materialDetails.length === 0) {
      return [];
    }

    // Create header row
    const headers = [
      'Material',
      'Material Description', 
      'Plant',
      'Storage Location',
      'Base Unit of Measure',
      'Unrestricted',
      'Stock in transfer',
      'In Quality Insp.',
      'Restricted-Use Stock',
      'Blocked',
      'Value Unrestricted',
      'Total shelf life',
      'SLED/BBD',
      'Date of Manufacture',
      'Batch'
    ];

    // Convert MaterialDetail objects back to Excel row format
    const dataRows = materialDetails.map(item => [
      item.material,
      item.materialDescription,
      item.plant,
      item.storageLocation === 'SIT' ? '' : item.storageLocation, // Convert 'SIT' back to empty for storage location
      item.baseUnitOfMeasure,
      item.unrestricted || 0,
      item.stockInTransfer || 0,
      item.inQualityInsp || 0,
      item.restrictedUseStock || 0,
      item.blocked || 0,
      item.valueUnrestricted || 0,
      item.totalShelfLife || 0,
      item.sled || 0,
      item.dateOfManufacture || 0,
      item.batch || ''
    ]);

    return [headers, ...dataRows];
  }

  private generateFileId(): string {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance
export const excelProcessor = new ExcelProcessorService();