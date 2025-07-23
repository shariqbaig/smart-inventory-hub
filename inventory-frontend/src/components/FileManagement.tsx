import React, { useState, useRef, useCallback, useEffect } from 'react';
import { excelProcessor, type ValidationResult } from '../services/excelProcessor';
import { dataStorage, type FileMetadata } from '../services/dataStorage';
import './FileManagement.css';
import { 
  FiUpload, FiDownload, FiTrash2, FiShield, FiSettings, FiAward,
  FiClipboard, FiFileText, FiFolder, FiTarget, FiZap
} from 'react-icons/fi';
import { 
  BiPackage, BiBuilding, BiMap, BiRuler, BiCheck, BiTransfer, 
  BiSearchAlt, BiLockAlt, BiMoney, BiTime, BiCalendar, BiPurchaseTag, 
  BiText, BiHappy, BiError, BiCheckShield, BiData, BiCog
} from 'react-icons/bi';
import { 
  HiOutlineExclamation, HiOutlineInformationCircle, HiOutlineSparkles,
  HiOutlineLightBulb, HiOutlineClipboardCheck
} from 'react-icons/hi';

interface FileManagementProps {
  onUploadSuccess: (fileInfo: any) => void;
  onClose: () => void;
}


const FileManagement: React.FC<FileManagementProps> = ({ onUploadSuccess, onClose }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'requirements' | 'history'>('upload');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activatingFileId, setActivatingFileId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFileHistory();
    initializeDataStorage();
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const initializeDataStorage = async () => {
    try {
      await dataStorage.init();
    } catch (error) {
      console.error('Error initializing data storage:', error);
      setError('Failed to initialize local storage. Please check browser support.');
    }
  };

  const loadFileHistory = async () => {
    try {
      setLoadingHistory(true);
      const files = await dataStorage.getAllFileMetadata();
      
      // Sort by upload date, most recent first
      files.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
      
      // Ensure only one file is marked as active (get the actual active file from storage)
      const activeFileId = await dataStorage.getActiveFileId();
      const correctedFiles = files.map(file => ({
        ...file,
        isActive: file.id === activeFileId
      }));
      
      console.log('Loaded file history:', correctedFiles.map(f => ({ id: f.id, name: f.name, isActive: f.isActive })));
      setUploadedFiles(correctedFiles);
    } catch (err) {
      console.error('Error loading file history:', err);
      setError('Failed to load file history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return 'Please upload an Excel file (.xlsx, .xls)';
    }

    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setValidationResult(null); // Clear any previous validation results
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await excelProcessor.processFile(file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        setValidationResult(result.validation);
        
        // Check if file has ERRORS (not just warnings)
        const hasErrors = result.validation.errors.length > 0;
        
        if (hasErrors) {
          // File has errors - don't auto-activate, stay on upload tab to show validation results
          // Keep validation results visible to show user what needs to be fixed
          await loadFileHistory(); // Refresh history to show new file at top
        } else {
          // File is valid (no errors, may have warnings) - auto-activate and go to dashboard
          // Clear validation results since file is being activated successfully
          setValidationResult(null);
          await loadFileHistory();
          onUploadSuccess({
            fileId: result.fileId,
            message: result.message,
            recordCount: result.recordCount,
            validation: result.validation
          });
          
          // Log warnings but don't show validation UI since file is activated
          if (result.validation.warnings.length > 0) {
            console.log(`File activated with ${result.validation.warnings.length} warnings`);
          }
          
          onClose(); // Close the file management popup
          return; // Exit early
        }
      } else {
        setError(result.message);
        setValidationResult(result.validation);
      }

      // Refresh file history to show the new file
      await loadFileHistory();
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleActivateFile = async (fileId: string) => {
    try {
      console.log('Starting file activation for fileId:', fileId);
      
      // Show loading state
      setError(null);
      setActivatingFileId(fileId);
      
      // Activate the file
      console.log('Calling excelProcessor.activateFile...');
      await excelProcessor.activateFile(fileId);
      console.log('File activation completed successfully');
      
      // Force inventory service to refresh its data immediately after activation
      console.log('Refreshing inventory service data...');
      const { inventoryService } = await import('../services/inventoryService');
      
      // Add a delay to ensure the data is properly persisted and available
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear any existing data to force fresh load
      inventoryService.clearInventoryData();
      
      await inventoryService.refreshData();
      console.log('Inventory service refreshed');
      
      // Verify data was loaded
      const dataCount = inventoryService.getDataCount();
      console.log(`Verification: Inventory service now has ${dataCount} records loaded`);
      
      // Get updated file metadata
      console.log('Fetching updated file metadata...');
      const fileMetadata = await excelProcessor.getFileHistory();
      const activatedFile = fileMetadata.find(f => f.id === fileId);
      console.log('Activated file metadata:', activatedFile);
      
      // Refresh file history to show updated status
      console.log('Refreshing file history display...');
      await loadFileHistory();
      
      // Notify parent component about successful activation
      console.log('Notifying parent component...');
      onUploadSuccess({
        fileId,
        message: `File "${activatedFile?.name || 'Unknown'}" activated successfully`,
        recordCount: activatedFile?.recordCount || 0,
        isActivation: true, // Flag to indicate this is an activation, not new upload
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          summary: {
            totalRows: activatedFile?.recordCount || 0,
            validRows: activatedFile?.recordCount || 0,
            errorRows: 0,
            warningRows: 0
          }
        }
      });
      
      // Add a delay to allow dashboard refresh to complete
      console.log('Waiting for dashboard refresh to complete...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Close the modal
      console.log('Closing modal after successful activation');
      onClose();
    } catch (error) {
      console.error('Error activating file:', error);
      setError('Failed to activate file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActivatingFileId(null);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      await excelProcessor.deleteFile(fileId);
      await loadFileHistory();
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const downloadTemplate = () => {
    excelProcessor.downloadTemplate('inventory_template.xlsx');
  };

  // Debug method to completely reset the database
  const handleResetDatabase = () => {
    setShowResetConfirm(true);
  };

  const confirmResetDatabase = async () => {
    setIsResetting(true);
    
    try {
      const { resetApplication } = await import('../services/init');
      await resetApplication();
      await loadFileHistory();
      setError(null);
      setShowResetConfirm(false);
      
      // Show success message by switching to upload tab
      setActiveTab('upload');
    } catch (error) {
      console.error('Failed to reset database:', error);
      setError('Failed to reset database: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsResetting(false);
    }
  };

  const cancelResetDatabase = () => {
    setShowResetConfirm(false);
  };


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getValidationStatusBadge = (status: string) => {
    const badges = {
      'valid': <span className="validation-status valid">Valid</span>,
      'warning': <span className="validation-status warning">Warnings</span>,
      'invalid': <span className="validation-status invalid">Invalid</span>
    };
    return badges[status as keyof typeof badges] || <span className="validation-status unknown">Unknown</span>;
  };

  return (
    <div className="file-management-overlay" onClick={onClose}>
      <div className="file-management-modal" onClick={e => e.stopPropagation()}>
        <div className="file-management-header">
          <div className="header-content">
            <h2>File Management</h2>
            <p>Upload, manage, and validate your Excel inventory files</p>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close" tabIndex={4}>×</button>
        </div>

        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
            tabIndex={1}
          >
            Upload Inventory
          </button>
          <button 
            className={`tab-button ${activeTab === 'requirements' ? 'active' : ''}`}
            onClick={() => setActiveTab('requirements')}
            tabIndex={2}
          >
            Requirements
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            tabIndex={3}
          >
            History ({uploadedFiles.length})
          </button>
        </div>

        <div className="file-management-content">
          {activeTab === 'upload' && (
            <div className="section-card">
              <h3>Upload Inventory File</h3>
              
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div 
                className={`drag-drop-area ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="upload-progress">
                    <div className="progress-circle" style={{ '--progress': `${uploadProgress}%` } as React.CSSProperties}>
                      <span className="progress-text">{uploadProgress}%</span>
                    </div>
                    <p>Processing file... {uploadProgress}%</p>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">
                      <FiUpload size={48} />
                    </div>
                    <p><strong>Click to select</strong> or drag and drop your Excel file here</p>
                    <p className="file-types">
                      Supported formats: .xlsx, .xls (Max size: 10MB)
                    </p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                aria-label="Click to browse for files"
              />

              {/* Validation Results - Integrated into Upload Tab */}
              {validationResult && (
                <div className={`validation-summary-card ${validationResult.isValid ? 'success' : 'error'}`}>
                  <div className="validation-header-inline">
                    <div className="validation-status-inline">
                      {validationResult.isValid ? (
                        <>
                          <BiCheck className="status-icon success" size={24} />
                          <span className="status-text success">File validation passed!</span>
                        </>
                      ) : (
                        <>
                          <BiError className="status-icon error" size={24} />
                          <span className="status-text error">File has validation issues</span>
                        </>
                      )}
                    </div>
                    <button 
                      className="dismiss-validation"
                      onClick={() => setValidationResult(null)}
                      title="Dismiss validation results"
                    >
                      <span>×</span>
                    </button>
                  </div>
                  
                  <div className="validation-stats-inline">
                    <div className="stat-item">
                      <BiData className="stat-icon" size={16} />
                      <span>{validationResult.summary.totalRows} total rows</span>
                    </div>
                    <div className="stat-item success">
                      <BiCheckShield className="stat-icon" size={16} />
                      <span>{validationResult.summary.validRows} valid</span>
                    </div>
                    {validationResult.summary.errorRows > 0 && (
                      <div className="stat-item error">
                        <BiError className="stat-icon" size={16} />
                        <span>{validationResult.summary.errorRows} errors</span>
                      </div>
                    )}
                    {validationResult.summary.warningRows > 0 && (
                      <div className="stat-item warning">
                        <HiOutlineExclamation className="stat-icon" size={16} />
                        <span>{validationResult.summary.warningRows} warnings</span>
                      </div>
                    )}
                  </div>

                  {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
                    <div className="validation-issues">
                      {validationResult.errors.length > 0 && (
                        <div className="issues-section error">
                          <div className="issues-header">
                            <BiError className="section-icon" size={18} />
                            <h4>Critical Issues ({validationResult.errors.length})</h4>
                            <span className="severity-badge error">Must Fix</span>
                          </div>
                          <p className="issues-description">
                            These errors prevent your file from being activated. Please fix them and upload again.
                          </p>
                          <div className="issues-list">
                            {validationResult.errors.slice(0, 3).map((error, index) => (
                              <div key={index} className="issue-item error">
                                <div className="issue-location">
                                  <span className="row-indicator">Row {error.row}</span>
                                  <span className="column-indicator">{error.column}</span>
                                </div>
                                <div className="issue-content">
                                  <p className="issue-message">{error.message}</p>
                                  {error.value && (
                                    <p className="issue-value">Current value: <code>{error.value}</code></p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {validationResult.errors.length > 3 && (
                              <div className="more-issues">
                                <HiOutlineInformationCircle size={16} />
                                <span>... and {validationResult.errors.length - 3} more errors. Please download our template for guidance.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {validationResult.warnings.length > 0 && (
                        <div className="issues-section warning">
                          <div className="issues-header">
                            <HiOutlineExclamation className="section-icon" size={18} />
                            <h4>Warnings ({validationResult.warnings.length})</h4>
                            <span className="severity-badge warning">Review Recommended</span>
                          </div>
                          <p className="issues-description">
                            These warnings won't prevent activation, but you should review them for data quality.
                          </p>
                          <div className="issues-list">
                            {validationResult.warnings.slice(0, 2).map((warning, index) => (
                              <div key={index} className="issue-item warning">
                                <div className="issue-location">
                                  <span className="row-indicator">Row {warning.row}</span>
                                  <span className="column-indicator">{warning.column}</span>
                                </div>
                                <div className="issue-content">
                                  <p className="issue-message">{warning.message}</p>
                                  {warning.value && (
                                    <p className="issue-value">Current value: <code>{warning.value}</code></p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {validationResult.warnings.length > 2 && (
                              <div className="more-issues">
                                <HiOutlineInformationCircle size={16} />
                                <span>... and {validationResult.warnings.length - 2} more warnings</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="validation-actions">
                        <button 
                          className="template-button primary"
                          onClick={downloadTemplate}
                        >
                          <FiDownload size={16} />
                          Download Template
                        </button>
                        <button 
                          className="template-button secondary"
                          onClick={() => setActiveTab('requirements')}
                        >
                          <HiOutlineLightBulb size={16} />
                          View Requirements
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="template-section compact">
                <div className="template-actions">
                  <div className="action-group">
                    <h4>Need a template?</h4>
                    <button className="template-button primary" onClick={downloadTemplate}>
                      <FiDownload size={16} />
                      Download Template
                    </button>
                  </div>
                  
                  <div className="action-group debug-group">
                    <h4>Debug Tools</h4>
                    <button 
                      className="template-button danger" 
                      onClick={handleResetDatabase}
                    >
                      <FiTrash2 size={16} />
                      Reset Database
                    </button>
                  </div>
                </div>
                <p className="compact-description">
                  Download our template with required columns, or reset the database if you're having data issues.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="requirements-section">
              <div className="requirements-intro">
                <h3>
                  <FiClipboard size={24} className="section-icon" />
                  Excel File Requirements
                </h3>
                <p>Ensure your Excel file meets these specifications for successful upload and validation. Use our template as a starting point to avoid common formatting issues.</p>
                
                <div className="template-section">
                  <h4>
                    <FiDownload size={20} className="template-icon" />
                    Need a template?
                  </h4>
                  <p>Download our Excel template with the required columns and sample data.</p>
                  <button className="template-button" onClick={downloadTemplate}>
                    <FiFileText size={16} />
                    Download Template
                  </button>
                </div>
              </div>
              
              <div className="requirements-content">
                <div className="columns-section">
                  <h4 className="section-title">
                    <HiOutlineExclamation className="title-icon required-icon" size={28} />
                    <span className="section-title-text">Required Columns</span>
                    <span className="requirement-badge required">
                      <FiShield size={12} />
                      Must Include
                    </span>
                  </h4>
                  <div className="columns-grid">
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>
                          <BiPackage className="column-icon required-column-icon" />
                          <span className="column-title">Material</span>
                          <span className="required-star">*</span>
                        </h5>
                        <span className="column-type">Text/Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Unique material code or number</p>
                      <p><strong>Format:</strong> Letters, numbers, hyphens, underscores only</p>
                      <p><strong>Example:</strong> MAT-001, 12345, PART_A1</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>
                          <BiText className="column-icon required-column-icon" />
                          <span className="column-title">Material Description</span>
                          <span className="required-star">*</span>
                        </h5>
                        <span className="column-type">Text</span>
                      </div>
                      <p><strong>Purpose:</strong> Descriptive name of the material</p>
                      <p><strong>Format:</strong> Any text</p>
                      <p><strong>Example:</strong> Steel Bolts M8x20mm</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>
                          <BiBuilding className="column-icon required-column-icon" />
                          <span className="column-title">Plant</span>
                          <span className="required-star">*</span>
                        </h5>
                        <span className="column-type">Text</span>
                      </div>
                      <p><strong>Purpose:</strong> Manufacturing plant code</p>
                      <p><strong>Format:</strong> Plant identifier</p>
                      <p><strong>Example:</strong> Y012, PLANT_A, FAC001</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>
                          <BiMap className="column-icon required-column-icon" />
                          <span className="column-title">Storage Location</span>
                          <span className="required-star">*</span>
                        </h5>
                        <span className="column-type">Text</span>
                      </div>
                      <p><strong>Purpose:</strong> Storage location code</p>
                      <p><strong>Format:</strong> Location identifier</p>
                      <p><strong>Example:</strong> YP01, WARE_A, BIN_123</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>
                          <BiRuler className="column-icon required-column-icon" />
                          <span className="column-title">Base Unit of Measure</span>
                          <span className="required-star">*</span>
                        </h5>
                        <span className="column-type">Text</span>
                      </div>
                      <p><strong>Purpose:</strong> Unit of measurement</p>
                      <p><strong>Format:</strong> Standard units</p>
                      <p><strong>Example:</strong> EA, KG, L, M</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>
                          <BiCheck className="column-icon required-column-icon success-icon" />
                          <span className="column-title">Unrestricted Stock</span>
                          <span className="required-star">*</span>
                        </h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Available stock quantity</p>
                      <p><strong>Format:</strong> Non-negative numbers</p>
                      <p><strong>Example:</strong> 100, 0, 2500.5</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>
                          <BiError className="column-icon required-column-icon error-icon" />
                          <span className="column-title">Blocked Stock</span>
                          <span className="required-star">*</span>
                        </h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Blocked stock quantity</p>
                      <p><strong>Format:</strong> Non-negative numbers</p>
                      <p><strong>Example:</strong> 50, 0, 125.75</p>
                    </div>
                  </div>
                </div>

                <div className="columns-section">
                  <h4 className="section-title">
                    <HiOutlineInformationCircle className="title-icon optional-icon" size={28} />
                    <span className="section-title-text">Optional Columns</span>
                    <span className="requirement-badge optional">
                      <HiOutlineSparkles size={12} />
                      Nice to Have
                    </span>
                  </h4>
                  <div className="columns-grid">
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>
                          <BiTransfer className="column-icon optional-column-icon" />
                          <span className="column-title">Stock in Transfer</span>
                          <span className="optional-badge">Optional</span>
                        </h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Stock currently being transferred</p>
                      <p><strong>Default:</strong> 0 if not provided</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>
                          <BiSearchAlt className="column-icon optional-column-icon" />
                          <span className="column-title">In Quality Inspection</span>
                          <span className="optional-badge">Optional</span>
                        </h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Stock under quality inspection</p>
                      <p><strong>Default:</strong> 0 if not provided</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>
                          <BiLockAlt className="column-icon optional-column-icon" />
                          <span className="column-title">Restricted-Use Stock</span>
                          <span className="optional-badge">Optional</span>
                        </h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Stock with restricted usage</p>
                      <p><strong>Default:</strong> 0 if not provided</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>
                          <BiMoney className="column-icon optional-column-icon" />
                          <span className="column-title">Value Unrestricted</span>
                          <span className="optional-badge">Optional</span>
                        </h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Monetary value of unrestricted stock</p>
                      <p><strong>Format:</strong> Currency amount in PKR</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>
                          <BiTime className="column-icon optional-column-icon" />
                          <span className="column-title">Total Shelf Life</span>
                          <span className="optional-badge">Optional</span>
                        </h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Shelf life in days</p>
                      <p><strong>Format:</strong> Number of days</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>
                          <BiCalendar className="column-icon optional-column-icon" />
                          <span className="column-title">SLED/BBD</span>
                          <span className="optional-badge">Optional</span>
                        </h5>
                        <span className="column-type">Date</span>
                      </div>
                      <p><strong>Purpose:</strong> Shelf life expiration date</p>
                      <p><strong>Format:</strong> Excel date format</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>
                          <BiCalendar className="column-icon optional-column-icon" />
                          <span className="column-title">Date of Manufacture</span>
                          <span className="optional-badge">Optional</span>
                        </h5>
                        <span className="column-type">Date</span>
                      </div>
                      <p><strong>Purpose:</strong> Manufacturing date</p>
                      <p><strong>Format:</strong> Excel date format</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>
                          <BiPurchaseTag className="column-icon optional-column-icon" />
                          <span className="column-title">Batch</span>
                          <span className="optional-badge">Optional</span>
                        </h5>
                        <span className="column-type">Text</span>
                      </div>
                      <p><strong>Purpose:</strong> Batch or lot number</p>
                      <p><strong>Format:</strong> Any text or number</p>
                    </div>
                  </div>
                </div>

                <div className="validation-section">
                  <h4 className="section-title">
                    <HiOutlineClipboardCheck className="title-icon validation-icon" size={28} />
                    <span className="section-title-text">Validation Rules</span>
                    <span className="requirement-badge validation">
                      <BiCheckShield size={12} />
                      Auto-Check
                    </span>
                  </h4>
                  <div className="validation-rules-grid">
                    <div className="rule-card">
                      <div className="rule-icon">
                        <BiPackage size={24} />
                      </div>
                      <div className="rule-content">
                        <h6>
                          <BiCheckShield className="rule-check-icon" size={16} />
                          Material Code Validation
                        </h6>
                        <p>Must not be empty and should contain only letters, numbers, hyphens, and underscores</p>
                        <div className="rule-examples">
                          <span className="example-good">✓ MAT-001, PART_A1</span>
                          <span className="example-bad">✗ Empty, Special@Chars</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rule-card">
                      <div className="rule-icon">
                        <BiBuilding size={24} />
                      </div>
                      <div className="rule-content">
                        <h6>
                          <BiCheckShield className="rule-check-icon" size={16} />
                          Plant Code Required
                        </h6>
                        <p>Plant code field cannot be empty for any inventory item</p>
                        <div className="rule-examples">
                          <span className="example-good">✓ Y012, PLANT_A</span>
                          <span className="example-bad">✗ Empty, NULL</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rule-card">
                      <div className="rule-icon">
                        <BiMap size={24} />
                      </div>
                      <div className="rule-content">
                        <h6>
                          <BiCog className="rule-check-icon" size={16} />
                          Storage Location Logic
                        </h6>
                        <p>Can be empty only if there's stock in transfer (will show as 'SIT')</p>
                        <div className="rule-examples">
                          <span className="example-good">✓ YP01, SIT (if transfer &gt; 0)</span>
                          <span className="example-bad">✗ Empty with no transfer</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rule-card">
                      <div className="rule-icon">
                        <BiData size={24} />
                      </div>
                      <div className="rule-content">
                        <h6>
                          <BiCheckShield className="rule-check-icon" size={16} />
                          Quantity Fields
                        </h6>
                        <p>All quantity fields must be numeric and non-negative numbers</p>
                        <div className="rule-examples">
                          <span className="example-good">✓ 100, 0, 2500.5</span>
                          <span className="example-bad">✗ -50, ABC, NULL</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rule-card">
                      <div className="rule-icon">
                        <BiHappy size={24} />
                      </div>
                      <div className="rule-content">
                        <h6>
                          <FiSettings className="rule-check-icon" size={16} />
                          Empty Row Handling
                        </h6>
                        <p>Completely empty rows will be automatically ignored during processing</p>
                        <div className="rule-examples">
                          <span className="example-good">✓ Auto-cleanup enabled</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tips-section">
                  <h4 className="section-title">
                    <HiOutlineLightBulb className="title-icon tips-icon" size={28} />
                    <span className="section-title-text">Best Practices</span>
                    <span className="requirement-badge tips">
                      <FiAward size={12} />
                      Pro Tips
                    </span>
                  </h4>
                  <div className="tips-grid">
                    <div className="tip-card">
                      <div className="tip-header">
                        <FiFolder className="tip-icon" />
                        <h6>File Format</h6>
                      </div>
                      <ul>
                        <li>Use .xlsx or .xls format only</li>
                        <li>Keep file size under 10MB</li>
                        <li>Use first row for column headers</li>
                      </ul>
                    </div>
                    
                    <div className="tip-card">
                      <div className="tip-header">
                        <FiTarget className="tip-icon" />
                        <h6>Data Quality</h6>
                      </div>
                      <ul>
                        <li>Remove completely empty rows</li>
                        <li>Ensure consistent data formats</li>
                        <li>Use standard unit abbreviations</li>
                      </ul>
                    </div>
                    
                    <div className="tip-card">
                      <div className="tip-header">
                        <FiZap className="tip-icon" />
                        <h6>Performance</h6>
                      </div>
                      <ul>
                        <li>Avoid merged cells in data area</li>
                        <li>Keep formulas in separate columns</li>
                        <li>Remove unnecessary formatting</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-section">
              <h3>Upload History</h3>
              
              {loadingHistory ? (
                <div className="loading">Loading file history...</div>
              ) : uploadedFiles.length === 0 ? (
                <div className="no-files">
                  <p>No files uploaded yet.</p>
                  <button 
                    className="upload-first-button"
                    onClick={() => setActiveTab('upload')}
                  >
                    Upload your first file
                  </button>
                </div>
              ) : (
                <div className="files-list">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className={`file-item ${file.isActive ? 'active' : ''}`}>
                      <div className="file-info">
                        <div className="file-name">
                          <span className="filename-text">{file.name}</span>
                          {file.isActive && file.validationStatus !== 'invalid' && <span className="active-badge">Active</span>}
                          {file.isActive && file.validationStatus === 'invalid' && <span className="error-badge">Error</span>}
                        </div>
                        <div className="file-details">
                          <div className="file-compact-info">
                            <span className="upload-time">{formatDate(new Date(file.uploadDate))}</span>
                            <span className="record-count">{file.recordCount.toLocaleString()} records</span>
                            {getValidationStatusBadge(file.validationStatus)}
                            {file.errorCount > 0 && (
                              <span className="error-count">{file.errorCount} errors</span>
                            )}
                            {file.warningCount > 0 && (
                              <span className="warning-count">{file.warningCount} warnings</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="file-actions">
                        {!file.isActive && file.validationStatus !== 'invalid' && (
                          <button
                            className="activate-button"
                            onClick={() => handleActivateFile(file.id)}
                            disabled={activatingFileId === file.id}
                          >
                            {activatingFileId === file.id ? 'Activating...' : 'Activate'}
                          </button>
                        )}
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reset Database Confirmation Modal */}
        {showResetConfirm && (
          <div className="reset-confirm-overlay">
            <div className="reset-confirm-modal">
              <div className="reset-confirm-header">
                <h3>Confirm Database Reset</h3>
              </div>
              
              <div className="reset-confirm-content">
                <div className="reset-warning-message">
                  <div className="warning-icon">🚨</div>
                  <div className="warning-text">
                    <p><strong>This action cannot be undone!</strong></p>
                    <p>Resetting the database will:</p>
                    <ul>
                      <li>Delete all uploaded files and their data</li>
                      <li>Clear all inventory analytics</li>
                      <li>Reset the application to initial state</li>
                    </ul>
                    <p>Are you sure you want to continue?</p>
                  </div>
                </div>
                
                <div className="reset-confirm-actions">
                  <button 
                    className="cancel-reset-button"
                    onClick={cancelResetDatabase}
                    disabled={isResetting}
                  >
                    Cancel
                  </button>
                  <button 
                    className="confirm-reset-button"
                    onClick={confirmResetDatabase}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <>
                        <div className="reset-spinner"></div>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <FiTrash2 size={16} />
                        Reset Database
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FileManagement;