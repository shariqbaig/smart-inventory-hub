import { Injectable, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { InventoryService } from '../inventory/inventory.service';

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

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  uploadedAt: string;
  uploadedDate: string; // Human readable date
  uploadedTime: string; // Human readable time
  size: number;
  isActive: boolean;
  recordCount: number;
  validationStatus: 'valid' | 'warnings' | 'errors';
  filePath?: string;
}

interface InternalUploadedFile extends UploadedFile {
  filePath: string;
}

@Injectable()
export class FilesService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');
  private readonly historyFile = path.join(process.cwd(), 'uploads', 'file-history.json');
  private filesMetadata: InternalUploadedFile[] = [];
  private activeFileId: string | null = null;

  constructor(
    @Inject(forwardRef(() => InventoryService))
    private inventoryService: InventoryService
  ) {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    
    // Load existing file history
    this.loadFileHistory();
  }

  private loadFileHistory(): void {
    try {
      if (fs.existsSync(this.historyFile)) {
        const historyData = fs.readFileSync(this.historyFile, 'utf8');
        const history = JSON.parse(historyData);
        this.filesMetadata = history.files || [];
        this.activeFileId = history.activeFileId || null;
        console.log(`Loaded ${this.filesMetadata.length} files from history`);
      } else {
        console.log('No file history found, starting fresh');
        this.saveFileHistory();
      }
    } catch (error) {
      console.error('Error loading file history:', error);
      this.filesMetadata = [];
      this.activeFileId = null;
    }
  }

  private saveFileHistory(): void {
    try {
      const historyData = {
        files: this.filesMetadata,
        activeFileId: this.activeFileId,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.historyFile, JSON.stringify(historyData, null, 2));
    } catch (error) {
      console.error('Error saving file history:', error);
    }
  }

  async processUploadedFile(file: Express.Multer.File): Promise<{
    message: string;
    fileId: string;
    recordCount: number;
    validation: ValidationResult;
  }> {
    const fileId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const fileName = `${fileId}_${file.originalname}`;
    const filePath = path.join(this.uploadsDir, fileName);

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    try {
      // Parse Excel file
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Validate the file
      const validation = this.validateExcelData(data, fileId, filePath);
      
      // Create human-readable date/time
      const uploadDate = new Date(timestamp);
      const uploadedDate = uploadDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const uploadedTime = uploadDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Create file metadata
      const fileMetadata: InternalUploadedFile = {
        id: fileId,
        filename: fileName,
        originalName: file.originalname,
        uploadedAt: timestamp,
        uploadedDate: uploadedDate,
        uploadedTime: uploadedTime,
        size: file.size,
        isActive: false, // Will be set to true below if valid
        recordCount: data.length - 1, // Exclude header row
        validationStatus: validation.isValid ? 'valid' : validation.errors.length > 0 ? 'errors' : 'warnings',
        filePath: filePath,
      };

      // Auto-activate if file has no errors (is valid)
      if (validation.isValid) {
        // Deactivate all existing files first
        this.filesMetadata.forEach(f => f.isActive = false);
        
        this.activeFileId = fileId;
        fileMetadata.isActive = true;
        
        console.log('Auto-activating uploaded file - no validation errors found');
      } else {
        fileMetadata.isActive = false;
        
        console.log('File has validation errors - not auto-activating. User must fix errors and manually activate.');
      }

      this.filesMetadata.push(fileMetadata);
      this.saveFileHistory(); // Save after adding new file

      // Refresh inventory data if this file became active
      if (fileMetadata.isActive) {
        console.log('File activated, setting inventory data directly...');
        const activeData = this.getActiveFileData();
        if (activeData && activeData.length > 0) {
          this.inventoryService.setInventoryData(activeData);
        } else {
          this.inventoryService.clearInventoryData();
        }
      }

      return {
        message: 'File uploaded successfully',
        fileId: fileId,
        recordCount: fileMetadata.recordCount,
        validation: validation,
      };
    } catch (error) {
      // Clean up file if processing failed
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw new HttpException(
        `Failed to process Excel file: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private validateExcelData(data: any[][], fileId: string, originalFilePath: string): ValidationResult {
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

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRows: data.length - 1, // Exclude header
        validRows,
        errorRows: errorRows.size,
        warningRows: warningRows.size,
      },
    };

    // Generate error file if there are errors
    if (errors.length > 0) {
      const errorFilePath = this.generateErrorFile(data, errors, warnings, fileId);
      result.errorFileUrl = `/files/download-errors/${fileId}`;
      result.hasErrorFile = true;
    }

    return result;
  }

  private generateErrorFile(data: any[][], errors: ValidationError[], warnings: ValidationError[], fileId: string): string {
    // Create a copy of the data with multiple annotation columns
    const modifiedData = data.map(row => [...row]);
    
    // Add annotation columns
    if (modifiedData[0]) {
      modifiedData[0].push('Validation_Status', 'Error_Count', 'Warning_Count', 'Issues_Detail');
    }

    // Create maps for errors and warnings by row
    const errorMap = new Map<number, ValidationError[]>();
    const warningMap = new Map<number, ValidationError[]>();

    errors.forEach(error => {
      if (!errorMap.has(error.row)) {
        errorMap.set(error.row, []);
      }
      errorMap.get(error.row)!.push(error);
    });

    warnings.forEach(warning => {
      if (!warningMap.has(warning.row)) {
        warningMap.set(warning.row, []);
      }
      warningMap.get(warning.row)!.push(warning);
    });

    // Add validation information to each row
    for (let i = 1; i < modifiedData.length; i++) {
      const rowNumber = i + 1;
      const rowErrors = errorMap.get(rowNumber) || [];
      const rowWarnings = warningMap.get(rowNumber) || [];
      
      let status = 'VALID';
      if (rowErrors.length > 0) {
        status = 'ERROR';
      } else if (rowWarnings.length > 0) {
        status = 'WARNING';
      }
      
      // Create detailed error messages
      const errorMessages = rowErrors.map(err => 
        `❌ ${err.column}: ${err.message} (Value: "${err.value}")`
      );
      const warningMessages = rowWarnings.map(warn => 
        `⚠️ ${warn.column}: ${warn.message} (Value: "${warn.value}")`
      );
      
      const allMessages = [...errorMessages, ...warningMessages];
      
      // Add the annotation columns
      modifiedData[i].push(
        status,                           // Validation_Status
        rowErrors.length.toString(),      // Error_Count
        rowWarnings.length.toString(),    // Warning_Count
        allMessages.length > 0 ? allMessages.join(' | ') : 'No issues found'
      );
    }

    // Create workbook with enhanced formatting
    const workbook = XLSX.utils.book_new();
    
    // Create a summary sheet first
    const summaryData = [
      ['Smart Inventory Hub - File Validation Report'],
      [''],
      ['Upload Date:', new Date().toLocaleString()],
      ['Total Rows:', (data.length - 1).toString()],
      ['Rows with Errors:', errors.length > 0 ? new Set(errors.map(e => e.row)).size.toString() : '0'],
      ['Rows with Warnings:', warnings.length > 0 ? new Set(warnings.map(w => w.row)).size.toString() : '0'],
      ['Total Error Count:', errors.length.toString()],
      ['Total Warning Count:', warnings.length.toString()],
      [''],
      ['Instructions for Fixing Errors:'],
      ['1. Review the "Inventory_With_Validation" sheet'],
      ['2. Focus on rows marked as "ERROR" in the Validation_Status column'],
      ['3. Fix the issues described in the Issues_Detail column'],
      ['4. Address warnings to improve data quality'],
      ['5. Delete the validation columns before re-uploading'],
      ['6. Re-upload the corrected file'],
      [''],
      ['Common Error Types:'],
      ['• Empty required fields (Material, Plant, Storage Location)'],
      ['• Invalid number formats for quantities'],
      ['• Negative quantity values'],
      ['• Missing or invalid characters in codes']
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }] as Array<{ wch: number }>;
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Validation_Summary');
    
    // Create the main data sheet
    const worksheet = XLSX.utils.aoa_to_sheet(modifiedData);
    
    // Add some basic formatting information
    const range = XLSX.utils.decode_range(worksheet['!ref']!);
    
    // Set column widths
    const colWidths: Array<{ wch: number }> = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (c === range.e.c - 3) colWidths.push({ wch: 15 }); // Status column
      else if (c === range.e.c - 2) colWidths.push({ wch: 12 }); // Error count
      else if (c === range.e.c - 1) colWidths.push({ wch: 12 }); // Warning count
      else if (c === range.e.c) colWidths.push({ wch: 50 }); // Issues detail
      else colWidths.push({ wch: 15 }); // Regular columns
    }
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory_With_Validation');

    const errorFileName = `${fileId}_errors.xlsx`;
    const errorFilePath = path.join(this.uploadsDir, errorFileName);
    XLSX.writeFile(workbook, errorFilePath);

    return errorFilePath;
  }

  async getFileHistory(): Promise<UploadedFile[]> {
    // Fix any data corruption where multiple files are marked as active
    this.fixMultipleActiveFiles();
    
    return this.filesMetadata
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()) // Sort by newest first
      .map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        uploadedAt: file.uploadedAt,
        uploadedDate: file.uploadedDate,
        uploadedTime: file.uploadedTime,
        size: file.size,
        isActive: file.isActive,
        recordCount: file.recordCount,
        validationStatus: file.validationStatus,
      }));
  }

  private fixMultipleActiveFiles(): void {
    const activeFiles = this.filesMetadata.filter(f => f.isActive);
    
    if (activeFiles.length > 1) {
      console.log(`Found ${activeFiles.length} active files, fixing...`);
      
      // Deactivate all files
      this.filesMetadata.forEach(f => f.isActive = false);
      
      // Activate the most recently uploaded valid file
      const validFiles = this.filesMetadata.filter(f => f.validationStatus === 'valid');
      if (validFiles.length > 0) {
        const mostRecent = validFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
        mostRecent.isActive = true;
        this.activeFileId = mostRecent.id;
        console.log(`Activated most recent valid file: ${mostRecent.originalName}`);
      } else if (this.filesMetadata.length > 0) {
        // If no valid files, activate the most recent one
        const mostRecent = this.filesMetadata.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
        mostRecent.isActive = true;
        this.activeFileId = mostRecent.id;
        console.log(`Activated most recent file: ${mostRecent.originalName}`);
      }
    }
  }

  async activateFile(fileId: string): Promise<{ message: string }> {
    const file = this.filesMetadata.find(f => f.id === fileId);
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // Prevent activation of files with errors
    if (file.validationStatus === 'errors') {
      throw new HttpException(
        'Cannot activate file with validation errors. Please download the error report, fix the issues, and upload a corrected file.',
        HttpStatus.BAD_REQUEST
      );
    }

    // Deactivate all files
    this.filesMetadata.forEach(f => f.isActive = false);
    
    // Activate the selected file
    file.isActive = true;
    this.activeFileId = fileId;
    
    // Save the updated state
    this.saveFileHistory();

    // Refresh inventory data with new active file
    console.log('File manually activated, setting inventory data directly...');
    console.log('Active file ID being set:', fileId);
    const activeData = this.getActiveFileData();
    console.log('Active data retrieved:', activeData ? `${activeData.length} records` : 'null');
    if (activeData && activeData.length > 0) {
      console.log('First record sample:', JSON.stringify(activeData[0], null, 2));
      this.inventoryService.setInventoryData(activeData);
    } else {
      console.log('No active data found, clearing inventory data');
      this.inventoryService.clearInventoryData();
    }

    return { message: 'File activated successfully' };
  }

  async deleteFile(fileId: string): Promise<{ message: string }> {
    const fileIndex = this.filesMetadata.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    const file = this.filesMetadata[fileIndex];
    
    // Cannot delete active file
    if (file.isActive) {
      throw new HttpException('Cannot delete active file', HttpStatus.BAD_REQUEST);
    }

    // Delete physical file
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    // Delete error file if exists
    const errorFilePath = path.join(this.uploadsDir, `${fileId}_errors.xlsx`);
    if (fs.existsSync(errorFilePath)) {
      fs.unlinkSync(errorFilePath);
    }

    // Remove from metadata
    this.filesMetadata.splice(fileIndex, 1);
    
    // Save the updated state
    this.saveFileHistory();

    return { message: 'File deleted successfully' };
  }

  async generateSampleFile(): Promise<string> {
    const sampleData = [
      [
        'Material', 'Material Description', 'Plant', 'Storage Location', 
        'Base Unit of Measure', 'Unrestricted', 'Blocked', 'Stock in transfer',
        'In Quality Insp.', 'Restricted-Use Stock', 'Value Unrestricted',
        'Total shelf life', 'SLED/BBD', 'Date of Manufacture', 'Batch'
      ],
      [
        '20152232', 'DOVE SOAP BAR 100G WHITE', 'Y012', 'YP01', 
        'PC', 5000, 250, 100, 50, 25, 125000, 365, 1735689600, 1704067200, '24011717'
      ],
      [
        '20153001', 'SUNLIGHT DISHWASHING LIQUID 500ML LEMON', 'Y013', 'YM01', 
        'L', 2500.75, 125.50, 50.25, 25.00, 10.00, 87525.25, 730, 1767225600, 1704153600, '24011718'
      ],
      [
        '30001001', 'RM SODIUM SULPHATE 25KG INDUSTRIAL', 'Y012', 'YP02', 
        'KG', 10899.50, 1230.50, 200.00, 150.00, 50.00, 326985.00, 1095, 1798761600, 1704240000, '24011719'
      ],
      [
        '20154001', 'MATERIAL IN TRANSFER', 'Y013', '', 
        'KG', 0, 0, 500.00, 0, 0, 0, 365, 1735689600, 1704067200, '24011720'
      ]
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 45 }, { wch: 8 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample_Data');

    const sampleFilePath = path.join(process.cwd(), 'assets', 'inventory_template.xlsx');
    XLSX.writeFile(workbook, sampleFilePath);

    return sampleFilePath;
  }

  async generateCurrentDataFile(): Promise<string> {
    if (!this.activeFileId) {
      throw new HttpException('No active file to export', HttpStatus.BAD_REQUEST);
    }

    const activeFile = this.filesMetadata.find(f => f.id === this.activeFileId);
    if (!activeFile || !fs.existsSync(activeFile.filePath)) {
      throw new HttpException('Active file not found', HttpStatus.NOT_FOUND);
    }

    // Copy the active file to a new export file
    const exportFileName = `current_data_${Date.now()}.xlsx`;
    const exportFilePath = path.join(this.uploadsDir, exportFileName);
    fs.copyFileSync(activeFile.filePath, exportFilePath);

    return exportFilePath;
  }

  async getErrorFile(fileId: string): Promise<string> {
    const errorFilePath = path.join(this.uploadsDir, `${fileId}_errors.xlsx`);
    if (!fs.existsSync(errorFilePath)) {
      throw new HttpException('Error file not found', HttpStatus.NOT_FOUND);
    }
    return errorFilePath;
  }

  getActiveFileData(): any[] | null {
    console.log('getActiveFileData called - activeFileId:', this.activeFileId);
    
    if (!this.activeFileId) {
      console.log('No activeFileId set');
      return null;
    }

    const activeFile = this.filesMetadata.find(f => f.id === this.activeFileId);
    console.log('Found active file:', activeFile ? activeFile.originalName : 'not found');
    console.log('Active file metadata:', activeFile ? { id: activeFile.id, filename: activeFile.filename, isActive: activeFile.isActive } : 'none');
    
    if (!activeFile || !fs.existsSync(activeFile.filePath)) {
      console.log('Active file not found or does not exist on disk');
      return null;
    }

    try {
      console.log('Reading file from path:', activeFile.filePath);
      const workbook = XLSX.readFile(activeFile.filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      console.log('Successfully read active file data:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('Error reading active file:', error);
      return null;
    }
  }
}