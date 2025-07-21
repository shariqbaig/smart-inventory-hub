import React, { useState, useRef, useCallback, useEffect } from 'react';
import { excelProcessor, type ValidationResult } from '../services/excelProcessor';
import { dataStorage, type FileMetadata } from '../services/dataStorage';
import './FileManagement.css';

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
  const [showValidation, setShowValidation] = useState(false);
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
      setUploadedFiles(files);
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
        
        // If file has errors, switch to history tab and keep popup open
        if (!result.validation.isValid) {
          setShowValidation(true);
          setActiveTab('history'); // Switch to history tab to see the uploaded file
          await loadFileHistory(); // Refresh history to show new file at top
        } else {
          // File is valid, close popup and go to dashboard
          await loadFileHistory();
          onUploadSuccess({
            fileId: result.fileId,
            message: result.message,
            recordCount: result.recordCount,
            validation: result.validation
          });
          onClose(); // Close the file management popup
          return; // Exit early
        }
      } else {
        setError(result.message);
        setValidationResult(result.validation);
        setShowValidation(true);
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
      // Show loading state
      setError(null);
      
      // Activate the file
      await excelProcessor.activateFile(fileId);
      
      // Force inventory service to refresh its data immediately after activation
      const { inventoryService } = await import('../services/inventoryService');
      await inventoryService.refreshData();
      
      // Get updated file metadata
      const fileMetadata = await excelProcessor.getFileHistory();
      const activatedFile = fileMetadata.find(f => f.id === fileId);
      
      // Refresh file history to show updated status
      await loadFileHistory();
      
      // Notify parent component about successful activation
      onUploadSuccess({
        fileId,
        message: 'File activated successfully',
        recordCount: activatedFile?.recordCount || 0,
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
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error activating file:', error);
      setError('Failed to activate file: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
  const handleResetDatabase = async () => {
    if (!confirm('This will completely reset the database and remove all files. Are you sure?')) {
      return;
    }
    
    try {
      const { resetApplication } = await import('../services/init');
      await resetApplication();
      await loadFileHistory();
      setError(null);
      alert('Database reset successfully. You can now upload files fresh.');
    } catch (error) {
      console.error('Failed to reset database:', error);
      setError('Failed to reset database: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };


  const getValidationStatusBadge = (status: string) => {
    const badges = {
      'valid': <span className="badge badge-success">Valid</span>,
      'warning': <span className="badge badge-warning">Warnings</span>,
      'invalid': <span className="badge badge-error">Errors</span>
    };
    return badges[status as keyof typeof badges] || <span className="badge badge-neutral">Unknown</span>;
  };

  return (
    <div className="file-management-overlay" onClick={onClose}>
      <div className="file-management-modal" onClick={e => e.stopPropagation()}>
        <div className="file-management-header">
          <div className="header-content">
            <h2>File Management</h2>
            <p>Upload, manage, and validate your Excel inventory files</p>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload
          </button>
          <button 
            className={`tab-button ${activeTab === 'requirements' ? 'active' : ''}`}
            onClick={() => setActiveTab('requirements')}
          >
            Requirements
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
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
                    <div className="upload-icon">📤</div>
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
              />

              <div className="template-section">
                <h4>Need a template?</h4>
                <p>Download our Excel template with the required columns and sample data.</p>
                <button className="template-button" onClick={downloadTemplate}>
                  📥 Download Template
                </button>
                
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                  <h4 style={{ color: '#e60026' }}>Debug Tools</h4>
                  <p style={{ fontSize: '0.9rem', color: '#666' }}>If you're having data issues, try resetting the database.</p>
                  <button 
                    className="template-button" 
                    onClick={handleResetDatabase}
                    style={{ backgroundColor: '#e60026', color: 'white' }}
                  >
                    🗑️ Reset Database
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="requirements-section">
              <div className="requirements-intro">
                <h3>📋 Excel File Requirements</h3>
                <p>Ensure your Excel file meets these specifications for successful upload and validation. Use our template as a starting point to avoid common formatting issues.</p>
                
                <div className="template-section">
                  <h4>📥 Need a template?</h4>
                  <p>Download our Excel template with the required columns and sample data.</p>
                  <button className="template-button" onClick={downloadTemplate}>
                    📄 Download Template
                  </button>
                </div>
              </div>
              
              <div className="requirements-content">
                <div className="columns-section">
                  <h4 className="section-title">
                    <span className="title-icon">🔴</span>
                    Required Columns
                    <span className="requirement-badge required">Must Include</span>
                  </h4>
                  <div className="columns-grid">
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>📦 Material</h5>
                        <span className="column-type">Text/Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Unique material code or number</p>
                      <p><strong>Format:</strong> Letters, numbers, hyphens, underscores only</p>
                      <p><strong>Example:</strong> MAT-001, 12345, PART_A1</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>📝 Material Description</h5>
                        <span className="column-type">Text</span>
                      </div>
                      <p><strong>Purpose:</strong> Descriptive name of the material</p>
                      <p><strong>Format:</strong> Any text</p>
                      <p><strong>Example:</strong> Steel Bolts M8x20mm</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>🏭 Plant</h5>
                        <span className="column-type">Text</span>
                      </div>
                      <p><strong>Purpose:</strong> Manufacturing plant code</p>
                      <p><strong>Format:</strong> Plant identifier</p>
                      <p><strong>Example:</strong> Y012, PLANT_A, FAC001</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>📍 Storage Location</h5>
                        <span className="column-type">Text</span>
                      </div>
                      <p><strong>Purpose:</strong> Storage location code</p>
                      <p><strong>Format:</strong> Location identifier</p>
                      <p><strong>Example:</strong> YP01, WARE_A, BIN_123</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>📏 Base Unit of Measure</h5>
                        <span className="column-type">Text</span>
                      </div>
                      <p><strong>Purpose:</strong> Unit of measurement</p>
                      <p><strong>Format:</strong> Standard units</p>
                      <p><strong>Example:</strong> EA, KG, L, M</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>✅ Unrestricted</h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Available stock quantity</p>
                      <p><strong>Format:</strong> Non-negative numbers</p>
                      <p><strong>Example:</strong> 100, 0, 2500.5</p>
                    </div>
                    
                    <div className="column-item required">
                      <div className="column-header">
                        <h5>🚫 Blocked</h5>
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
                    <span className="title-icon">🟢</span>
                    Optional Columns
                    <span className="requirement-badge optional">Nice to Have</span>
                  </h4>
                  <div className="columns-grid">
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>🔄 Stock in Transfer</h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Stock currently being transferred</p>
                      <p><strong>Default:</strong> 0 if not provided</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>🔍 In Quality Inspection</h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Stock under quality inspection</p>
                      <p><strong>Default:</strong> 0 if not provided</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>⚠️ Restricted-Use Stock</h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Stock with restricted usage</p>
                      <p><strong>Default:</strong> 0 if not provided</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>💰 Value Unrestricted</h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Monetary value of unrestricted stock</p>
                      <p><strong>Format:</strong> Currency amount in PKR</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>⏰ Total Shelf Life</h5>
                        <span className="column-type">Number</span>
                      </div>
                      <p><strong>Purpose:</strong> Shelf life in days</p>
                      <p><strong>Format:</strong> Number of days</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>📅 SLED/BBD</h5>
                        <span className="column-type">Date</span>
                      </div>
                      <p><strong>Purpose:</strong> Shelf life expiration date</p>
                      <p><strong>Format:</strong> Excel date format</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>🏭 Date of Manufacture</h5>
                        <span className="column-type">Date</span>
                      </div>
                      <p><strong>Purpose:</strong> Manufacturing date</p>
                      <p><strong>Format:</strong> Excel date format</p>
                    </div>
                    
                    <div className="column-item optional">
                      <div className="column-header">
                        <h5>🏷️ Batch</h5>
                        <span className="column-type">Text</span>
                      </div>
                      <p><strong>Purpose:</strong> Batch or lot number</p>
                      <p><strong>Format:</strong> Any text or number</p>
                    </div>
                  </div>
                </div>

                <div className="validation-section">
                  <h4 className="section-title">
                    <span className="title-icon">✅</span>
                    Validation Rules
                    <span className="requirement-badge validation">Auto-Check</span>
                  </h4>
                  <div className="validation-rules-grid">
                    <div className="rule-card">
                      <div className="rule-icon">📦</div>
                      <div className="rule-content">
                        <h6>Material Code Validation</h6>
                        <p>Must not be empty and should contain only letters, numbers, hyphens, and underscores</p>
                      </div>
                    </div>
                    
                    <div className="rule-card">
                      <div className="rule-icon">🏭</div>
                      <div className="rule-content">
                        <h6>Plant Code Required</h6>
                        <p>Plant code field cannot be empty for any inventory item</p>
                      </div>
                    </div>
                    
                    <div className="rule-card">
                      <div className="rule-icon">📍</div>
                      <div className="rule-content">
                        <h6>Storage Location Logic</h6>
                        <p>Can be empty only if there's stock in transfer (will show as 'SIT')</p>
                      </div>
                    </div>
                    
                    <div className="rule-card">
                      <div className="rule-icon">🔢</div>
                      <div className="rule-content">
                        <h6>Quantity Fields</h6>
                        <p>All quantity fields must be numeric and non-negative numbers</p>
                      </div>
                    </div>
                    
                    <div className="rule-card">
                      <div className="rule-icon">🗑️</div>
                      <div className="rule-content">
                        <h6>Empty Row Handling</h6>
                        <p>Completely empty rows will be automatically ignored during processing</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tips-section">
                  <h4 className="section-title">
                    <span className="title-icon">💡</span>
                    Best Practices
                  </h4>
                  <div className="tips-grid">
                    <div className="tip-card">
                      <div className="tip-header">
                        <span className="tip-icon">📂</span>
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
                        <span className="tip-icon">🎯</span>
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
                        <span className="tip-icon">🚀</span>
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
                          {file.name}
                          {file.isActive && <span className="active-badge">Active</span>}
                        </div>
                        <div className="file-details">
                          <span>Uploaded: {new Date(file.uploadDate).toLocaleString()}</span>
                          <span>{file.recordCount} records</span>
                          {getValidationStatusBadge(file.validationStatus)}
                          {file.errorCount && file.errorCount > 0 && (
                            <span className="error-count">{file.errorCount} errors</span>
                          )}
                          {file.warningCount && file.warningCount > 0 && (
                            <span className="warning-count">{file.warningCount} warnings</span>
                          )}
                        </div>
                      </div>
                      <div className="file-actions">
                        {!file.isActive && file.validationStatus !== 'invalid' && (
                          <button
                            className="activate-button"
                            onClick={() => handleActivateFile(file.id)}
                          >
                            Activate
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

        {showValidation && validationResult && (
          <div className="validation-results">
            <div className="validation-header">
              <h4>Validation Results</h4>
              <button 
                className="close-validation"
                onClick={() => setShowValidation(false)}
              >
                ×
              </button>
            </div>
            
            <div className="validation-summary">
              <div className={`validation-status ${validationResult.isValid ? 'valid' : 'invalid'}`}>
                {validationResult.isValid ? '✅ File is valid' : '❌ File has validation issues'}
              </div>
              
              <div className="validation-stats">
                <span>Total Rows: {validationResult.summary.totalRows}</span>
                <span>Valid Rows: {validationResult.summary.validRows}</span>
                {validationResult.summary.errorRows > 0 && (
                  <span className="error-stat">Error Rows: {validationResult.summary.errorRows}</span>
                )}
                {validationResult.summary.warningRows > 0 && (
                  <span className="warning-stat">Warning Rows: {validationResult.summary.warningRows}</span>
                )}
              </div>
            </div>

            {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
              <div className="validation-details">
                {validationResult.errors.length > 0 && (
                  <div className="validation-errors">
                    <h5>Errors ({validationResult.errors.length})</h5>
                    <div className="validation-list">
                      {validationResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="validation-item error">
                          <strong>Row {error.row}, {error.column}:</strong> {error.message}
                          {error.value && <span className="error-value">Value: {error.value}</span>}
                        </div>
                      ))}
                      {validationResult.errors.length > 10 && (
                        <div className="more-items">
                          ... and {validationResult.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div className="validation-warnings">
                    <h5>Warnings ({validationResult.warnings.length})</h5>
                    <div className="validation-list">
                      {validationResult.warnings.slice(0, 5).map((warning, index) => (
                        <div key={index} className="validation-item warning">
                          <strong>Row {warning.row}, {warning.column}:</strong> {warning.message}
                          {warning.value && <span className="warning-value">Value: {warning.value}</span>}
                        </div>
                      ))}
                      {validationResult.warnings.length > 5 && (
                        <div className="more-items">
                          ... and {validationResult.warnings.length - 5} more warnings
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManagement;