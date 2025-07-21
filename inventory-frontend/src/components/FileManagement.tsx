import React, { useState, useRef, useCallback } from 'react';
import { inventoryApi } from '../services/api';
import './FileManagement.css';

interface FileManagementProps {
  onUploadSuccess: (fileInfo: any) => void;
  onClose: () => void;
}

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  uploadedAt: string;
  uploadedDate?: string; // Human readable date
  uploadedTime?: string; // Human readable time
  size: number;
  isActive: boolean;
  recordCount?: number;
  validationStatus?: 'valid' | 'warnings' | 'errors';
}

interface ValidationError {
  row: number;
  column: string;
  value: any;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
  errorFileUrl?: string; // URL to download file with error annotations
  hasErrorFile?: boolean;
}

const FileManagement: React.FC<FileManagementProps> = ({ onUploadSuccess, onClose }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'requirements' | 'history'>('upload');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadFileHistory();
  }, []);

  // Prevent background scroll when modal is open
  React.useEffect(() => {
    // Save current body overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Disable body scroll
    document.body.style.overflow = 'hidden';
    
    // Cleanup: restore original overflow when component unmounts
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const loadFileHistory = async () => {
    try {
      setLoadingHistory(true);
      const files = await inventoryApi.getFileHistory();
      setUploadedFiles(files);
    } catch (err) {
      console.error('Error loading file history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return 'Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)';
    }

    if (file.size > 50 * 1024 * 1024) {
      return 'File size must be less than 50MB';
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
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.onload = async () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              const response = JSON.parse(xhr.responseText);
              
              if (response.validation) {
                setValidationResult(response.validation);
                
                // If file has errors, switch to history tab and keep popup open
                if (!response.validation.isValid) {
                  setShowValidation(true);
                  setActiveTab('history'); // Switch to history tab to see the uploaded file
                  await loadFileHistory(); // Refresh history to show new file at top
                } else {
                  // File is valid, close popup and go to dashboard
                  await loadFileHistory();
                  onUploadSuccess(response);
                  onClose(); // Close the file management popup
                  return; // Exit early to prevent calling onUploadSuccess again
                }
              } else {
                // No validation info, assume success and close popup
                await loadFileHistory();
                onUploadSuccess(response);
                onClose();
                return;
              }
              resolve(response);
            } catch (err) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.message || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));

        xhr.open('POST', `${inventoryApi.baseURL}/files/upload-file`);
        xhr.send(formData);
      });
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleActivateFile = async (fileId: string) => {
    try {
      await inventoryApi.activateFile(fileId);
      await loadFileHistory();
      onUploadSuccess({ activated: true });
      onClose(); // Close the popup after successful activation
    } catch (err: any) {
      console.error('Error activating file:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to activate file';
      setError(errorMessage);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      await inventoryApi.deleteFile(fileId);
      await loadFileHistory();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    }
  };

  const handleDownloadSample = async () => {
    try {
      const response = await fetch(`${inventoryApi.baseURL}/files/download-sample`);
      if (!response.ok) {
        throw new Error('Failed to download sample file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inventory_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading sample:', err);
      setError('Failed to download sample file');
    }
  };

  const handleDownloadCurrentData = async () => {
    try {
      const response = await fetch(`${inventoryApi.baseURL}/files/download-current-data`);
      if (!response.ok) {
        throw new Error('Failed to download current data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory_data_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading current data:', err);
      setError('Failed to download current data');
    }
  };

  const handleDownloadErrorFile = async () => {
    if (!validationResult?.errorFileUrl) {
      setError('Error file not available');
      return;
    }

    try {
      const response = await fetch(validationResult.errorFileUrl);
      if (!response.ok) {
        throw new Error('Failed to download error file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      link.download = `inventory_errors_${timestamp}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading error file:', err);
      setError('Failed to download error file');
    }
  };

  const handleDownloadFileErrors = async (fileId: string) => {
    try {
      const response = await fetch(`${inventoryApi.baseURL}/files/download-errors/${fileId}`);
      if (!response.ok) {
        throw new Error('Failed to download error file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      link.download = `inventory_errors_${timestamp}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading error file:', err);
      setError('Failed to download error file for selected file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getValidationBadge = (status?: string) => {
    switch (status) {
      case 'valid':
        return <span className="validation-badge valid">✅ Valid</span>;
      case 'warnings':
        return <span className="validation-badge warnings">⚠️ Warnings</span>;
      case 'errors':
        return <span className="validation-badge errors">❌ Errors</span>;
      default:
        return null;
    }
  };

  return (
    <div className="file-management-overlay">
      <div className="file-management-modal">
        <div className="file-management-header">
          <div className="header-content">
            <h2>📁 Inventory File Management</h2>
          </div>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📤 Upload & Validate
          </button>
          <button 
            className={`tab-button ${activeTab === 'requirements' ? 'active' : ''}`}
            onClick={() => setActiveTab('requirements')}
          >
            📋 Data Requirements
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            🕒 File History
          </button>
        </div>

        <div className="file-management-content">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="upload-tab">
              {/* Download Section */}
              <div className="section-card">
                <h3>📥 Download Templates & Current Data</h3>
                <div className="download-buttons">
                  <button onClick={handleDownloadSample} className="download-button sample">
                    <span className="button-icon">📋</span>
                    <div className="button-content">
                      <strong>Download Sample Template</strong>
                      <span>Get the correct Excel format with sample data</span>
                    </div>
                  </button>
                  <button onClick={handleDownloadCurrentData} className="download-button current">
                    <span className="button-icon">📊</span>
                    <div className="button-content">
                      <strong>Download Current Data</strong>
                      <span>Export currently loaded inventory data for editing</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload Section */}
              <div className="section-card">
                <h3>📤 Upload New Inventory File</h3>
                <div
                  className={`drag-drop-area ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleBrowseClick}
                >
                  {isUploading ? (
                    <div className="upload-progress">
                      <div className="progress-circle" style={{ '--progress': `${uploadProgress}%` } as any}>
                        <div className="progress-text">{uploadProgress}%</div>
                      </div>
                      <p>Uploading and validating...</p>
                    </div>
                  ) : (
                    <>
                      <div className="upload-icon">📤</div>
                      <h4>Drag & drop your Excel file here</h4>
                      <p>or <span className="browse-link">browse to choose file</span></p>
                      <p className="file-types">Supports: .xlsx, .xls, .csv (max 50MB)</p>
                      <div className="upload-requirements">
                        <p>✅ Must contain required columns: Material, Description, Plant, Location, Quantities</p>
                        <p>✅ Data will be automatically validated upon upload</p>
                      </div>
                    </>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />

                {error && (
                  <div className="error-message">
                    ⚠️ {error}
                  </div>
                )}

                {/* Validation Results */}
                {validationResult && showValidation && (
                  <div className="validation-results">
                    <div className="validation-header">
                      <h4>📊 File Validation Results</h4>
                      <div className="validation-header-actions">
                        {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
                          <button 
                            onClick={handleDownloadErrorFile}
                            className="header-download-button"
                            title="Download file with error details"
                          >
                            📥 Download Error Report
                          </button>
                        )}
                        <button onClick={() => setShowValidation(false)} className="close-validation">×</button>
                      </div>
                    </div>
                    
                    <div className="validation-summary">
                      <div className="summary-stats">
                        <div className="stat-item">
                          <span className="stat-label">Total Rows</span>
                          <span className="stat-value">{validationResult.summary.totalRows}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Valid Rows</span>
                          <span className="stat-value success">{validationResult.summary.validRows}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Errors</span>
                          <span className="stat-value error">{validationResult.summary.errorRows}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Warnings</span>
                          <span className="stat-value warning">{validationResult.summary.warningRows}</span>
                        </div>
                      </div>
                      
                      {(validationResult.hasErrorFile || (validationResult.errors.length > 0 || validationResult.warnings.length > 0)) && (
                        <div className="quick-download-section">
                          <div className="quick-download-info">
                            📋 <strong>Need to fix these issues?</strong> Download your file with detailed error annotations.
                          </div>
                          <button 
                            onClick={handleDownloadErrorFile}
                            className="quick-download-button"
                          >
                            📥 Download File with Error Details
                          </button>
                          {!validationResult.hasErrorFile && (
                            <div className="download-debug-info">
                              🔧 Debug: hasErrorFile={String(validationResult.hasErrorFile)}, errorFileUrl={validationResult.errorFileUrl || 'undefined'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {validationResult.errors.length > 0 && (
                      <div className="validation-section">
                        <h5>❌ Critical Errors (Must be fixed before activation)</h5>
                        <div className="error-summary">
                          <p className="error-intro">
                            🚨 Your file contains <strong>{validationResult.errors.length} critical errors</strong> across {new Set(validationResult.errors.map(e => e.row)).size} rows that must be fixed before the data can be processed.
                          </p>
                          {validationResult.hasErrorFile && (
                            <div className="error-download-action">
                              <button 
                                onClick={handleDownloadErrorFile}
                                className="error-download-button"
                              >
                                📥 Download Annotated File
                              </button>
                              <span className="error-download-hint">Get your file with detailed error information</span>
                            </div>
                          )}
                        </div>
                        <div className="validation-list">
                          {validationResult.errors.slice(0, 15).map((error, index) => (
                            <div key={index} className="validation-item error">
                              <div className="error-header">
                                <span className="row-number">📍 Row {error.row}</span>
                                <span className="column-badge">{error.column}</span>
                              </div>
                              <div className="error-details">
                                <span className="error-message">{error.message}</span>
                                <span className="error-value">Current value: "{String(error.value)}"</span>
                              </div>
                            </div>
                          ))}
                          {validationResult.errors.length > 15 && (
                            <div className="more-items">
                              📄 Showing first 15 of {validationResult.errors.length} total errors. Download the error file below for complete details.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {validationResult.warnings.length > 0 && (
                      <div className="validation-section">
                        <h5>⚠️ Warnings (Review recommended for data quality)</h5>
                        <div className="warning-summary">
                          <p className="warning-intro">
                            🔍 Found <strong>{validationResult.warnings.length} warnings</strong> across {new Set(validationResult.warnings.map(w => w.row)).size} rows. These won't prevent processing but should be reviewed.
                          </p>
                        </div>
                        <div className="validation-list">
                          {validationResult.warnings.slice(0, 10).map((warning, index) => (
                            <div key={index} className="validation-item warning">
                              <div className="warning-header">
                                <span className="row-number">📍 Row {warning.row}</span>
                                <span className="column-badge">{warning.column}</span>
                              </div>
                              <div className="warning-details">
                                <span className="warning-message">{warning.message}</span>
                                <span className="warning-value">Current value: "{String(warning.value)}"</span>
                              </div>
                            </div>
                          ))}
                          {validationResult.warnings.length > 10 && (
                            <div className="more-items">
                              📄 Showing first 10 of {validationResult.warnings.length} total warnings. Download the error file for complete details.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="validation-actions">
                      {validationResult.isValid ? (
                        <div className="success-message">
                          ✅ File validation passed! Your inventory data has been processed successfully and is ready for use in the dashboard.
                        </div>
                      ) : (
                        <div className="error-actions">
                          <div className="validation-note">
                            📝 Critical errors found that prevent data processing. Please fix these errors and re-upload the file.
                          </div>
                          
                          {validationResult.hasErrorFile && (
                            <div className="error-file-section">
                              <div className="error-file-header">
                                <h6>🚑 Download Annotated File with Detailed Error Information</h6>
                                <div className="error-file-highlight">
                                  ✨ We've enhanced your original file with detailed validation information!
                                </div>
                              </div>
                              
                              <div className="error-file-features">
                                <div className="feature-list">
                                  <div className="feature-item">
                                    ✅ <strong>Summary Sheet:</strong> Overview of all validation results
                                  </div>
                                  <div className="feature-item">
                                    📊 <strong>Status Column:</strong> Each row marked as VALID, WARNING, or ERROR
                                  </div>
                                  <div className="feature-item">
                                    🔍 <strong>Issue Details:</strong> Specific problems and suggested fixes for each row
                                  </div>
                                  <div className="feature-item">
                                    📍 <strong>Error Counts:</strong> Number of issues per row for easy prioritization
                                  </div>
                                </div>
                              </div>

                              <div className="download-action">
                                <button 
                                  onClick={handleDownloadErrorFile}
                                  className="error-file-download-button primary"
                                >
                                  📥 Download Enhanced File with Validation Details
                                </button>
                                <p className="download-note">
                                  📝 File includes your original data plus validation columns to help you fix issues quickly
                                </p>
                              </div>
                              
                              <div className="error-file-instructions">
                                <h6>🚫 Step-by-Step Fix Guide:</h6>
                                <div className="instruction-steps">
                                  <div className="step">
                                    <span className="step-number">1</span>
                                    <span className="step-text">Download the annotated file using the button above</span>
                                  </div>
                                  <div className="step">
                                    <span className="step-number">2</span>
                                    <span className="step-text">Open in Excel and check the "Validation_Summary" sheet first</span>
                                  </div>
                                  <div className="step">
                                    <span className="step-number">3</span>
                                    <span className="step-text">Go to "Inventory_With_Validation" sheet and filter by "ERROR" status</span>
                                  </div>
                                  <div className="step">
                                    <span className="step-number">4</span>
                                    <span className="step-text">Fix issues listed in the "Issues_Detail" column for each ERROR row</span>
                                  </div>
                                  <div className="step">
                                    <span className="step-number">5</span>
                                    <span className="step-text">Review WARNING rows and fix if needed for better data quality</span>
                                  </div>
                                  <div className="step">
                                    <span className="step-number">6</span>
                                    <span className="step-text">Delete all validation columns (Validation_Status, Error_Count, etc.)</span>
                                  </div>
                                  <div className="step">
                                    <span className="step-number">7</span>
                                    <span className="step-text">Save and re-upload your corrected file</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Requirements Tab */}
          {activeTab === 'requirements' && (
            <div className="requirements-tab">
              <div className="requirements-intro">
                <h3>📋 Excel Data Requirements for Inventory Management</h3>
                <p>
                  To maximize the capabilities of your inventory dashboard, ensure your Excel file follows 
                  these data structure requirements and best practices for inventory management.
                </p>
              </div>

              {/* Required Columns */}
              <div className="section-card">
                <h4>🔢 Required Columns (Mandatory)</h4>
                <div className="columns-grid">
                  <div className="column-item required">
                    <h5>Material</h5>
                    <p><strong>Type:</strong> Number/Text</p>
                    <p><strong>Example:</strong> 20152232, MAT001</p>
                    <p>Unique identifier for each product</p>
                  </div>
                  
                  <div className="column-item required">
                    <h5>Material Description</h5>
                    <p><strong>Type:</strong> Text</p>
                    <p><strong>Example:</strong> "RM SODIUM SULPHATE", "Dove Soap 100g"</p>
                    <p>Product name or description</p>
                  </div>
                  
                  <div className="column-item required">
                    <h5>Plant</h5>
                    <p><strong>Type:</strong> Text</p>
                    <p><strong>Example:</strong> Y012, Y013, UNI_PLANT_A</p>
                    <p>Manufacturing facility code</p>
                  </div>
                  
                  <div className="column-item required">
                    <h5>Storage Location</h5>
                    <p><strong>Type:</strong> Text</p>
                    <p><strong>Example:</strong> YP01, YM99, WH001</p>
                    <p>Specific warehouse location within plant</p>
                  </div>
                  
                  <div className="column-item required">
                    <h5>Base Unit of Measure</h5>
                    <p><strong>Type:</strong> Text</p>
                    <p><strong>Example:</strong> KG, L, PC, MT</p>
                    <p>Standard unit for quantities</p>
                  </div>
                  
                  <div className="column-item required">
                    <h5>Unrestricted</h5>
                    <p><strong>Type:</strong> Number</p>
                    <p><strong>Example:</strong> 10899.5, 0, 1500.25</p>
                    <p>Available inventory for production/sale</p>
                  </div>
                  
                  <div className="column-item required">
                    <h5>Blocked</h5>
                    <p><strong>Type:</strong> Number</p>
                    <p><strong>Example:</strong> 1230.5, 0, 250</p>
                    <p>Inventory blocked for quality/other issues</p>
                  </div>
                </div>
              </div>

              {/* Optional Columns */}
              <div className="section-card">
                <h4>📊 Optional Columns (Recommended)</h4>
                <div className="columns-grid">
                  <div className="column-item optional">
                    <h5>Stock in transfer</h5>
                    <p>Inventory being moved between locations</p>
                  </div>
                  <div className="column-item optional">
                    <h5>In Quality Insp.</h5>
                    <p>Products undergoing quality checks</p>
                  </div>
                  <div className="column-item optional">
                    <h5>Restricted-Use Stock</h5>
                    <p>Limited availability inventory</p>
                  </div>
                  <div className="column-item optional">
                    <h5>Batch</h5>
                    <p>Production batch identifier</p>
                  </div>
                  <div className="column-item optional">
                    <h5>SLED/BBD</h5>
                    <p>Shelf life or best before date</p>
                  </div>
                  <div className="column-item optional">
                    <h5>Value Unrestricted</h5>
                    <p>Monetary value of available stock</p>
                  </div>
                </div>
              </div>

              {/* Best Practices */}
              <div className="section-card">
                <h4>✅ Inventory Management Best Practices</h4>
                <div className="best-practices">
                  <div className="practice-item">
                    <h5>📋 Data Quality</h5>
                    <ul>
                      <li>Use consistent product codes</li>
                      <li>Maintain standardized plant/location naming</li>
                      <li>Ensure quantity values are numeric only</li>
                      <li>No merged cells or empty headers</li>
                    </ul>
                  </div>
                  <div className="practice-item">
                    <h5>🏭 Company Standards</h5>
                    <ul>
                      <li>Follow company SKU conventions</li>
                      <li>Use standard facility codes (Y012, Y013, etc.)</li>
                      <li>Include batch numbers for traceability</li>
                      <li>Maintain consistent unit measurements</li>
                    </ul>
                  </div>
                  <div className="practice-item">
                    <h5>📊 Dashboard Features</h5>
                    <ul>
                      <li>Plant-wise inventory analysis</li>
                      <li>Blocked stock monitoring</li>
                      <li>Product category filtering</li>
                      <li>Real-time KPI calculations</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Example Table */}
              <div className="section-card">
                <h4>📋 Example Excel Structure</h4>
                <div className="example-table-container">
                  <table className="example-table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Material Description</th>
                        <th>Plant</th>
                        <th>Storage Location</th>
                        <th>Base Unit of Measure</th>
                        <th>Unrestricted</th>
                        <th>Blocked</th>
                        <th>Batch</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>20152232</td>
                        <td>RM SODIUM SULPHATE</td>
                        <td>Y012</td>
                        <td>YP01</td>
                        <td>KG</td>
                        <td>10899.50</td>
                        <td>1230.50</td>
                        <td>24011717</td>
                      </tr>
                      <tr>
                        <td>20152233</td>
                        <td>DOVE SOAP 100G</td>
                        <td>Y013</td>
                        <td>YM99</td>
                        <td>PC</td>
                        <td>5000</td>
                        <td>250</td>
                        <td>24011718</td>
                      </tr>
                      <tr>
                        <td>20152234</td>
                        <td>SUNLIGHT DETERGENT 500ML</td>
                        <td>Y012</td>
                        <td>YP01</td>
                        <td>L</td>
                        <td>2500.75</td>
                        <td>0</td>
                        <td>24011719</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="history-tab">
              <div className="section-card">
                <h3>🕒 File History & Management</h3>
                {loadingHistory ? (
                  <div className="loading-files">Loading file history...</div>
                ) : uploadedFiles.length === 0 ? (
                  <div className="no-files">
                    <div className="no-files-icon">📁</div>
                    <h4>No files uploaded yet</h4>
                    <p>Upload your first inventory file to get started with the dashboard.</p>
                  </div>
                ) : (
                  <div className="files-list">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className={`file-item ${file.isActive ? 'active' : ''}`}>
                        <div className="file-main-info">
                          <div className="file-icon">📊</div>
                          <div className="file-details">
                            <div className="file-name-row">
                              {file.isActive && <span className="active-badge">ACTIVE</span>}
                              <span className="file-name">{file.originalName}</span>
                              {getValidationBadge(file.validationStatus)}
                            </div>
                            <div className="file-meta">
                              <span className="file-size">{formatFileSize(file.size)}</span>
                              <span className="file-date">
                                {file.uploadedDate || formatDate(file.uploadedAt)}
                                {file.uploadedTime && ` at ${file.uploadedTime}`}
                              </span>
                              {file.recordCount && (
                                <span className="record-count">{file.recordCount.toLocaleString()} records</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="file-actions">
                          {!file.isActive && (
                            <>
                              {file.validationStatus === 'errors' ? (
                                <button
                                  onClick={() => handleDownloadFileErrors(file.id)}
                                  className="file-action-button download-errors"
                                  title="Download error report for this file"
                                >
                                  📥 Download Errors
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivateFile(file.id)}
                                  className="file-action-button activate"
                                  title="Set as active file for dashboard"
                                >
                                  ✓ Activate
                                </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="file-action-button delete"
                            title="Delete file permanently"
                            disabled={file.isActive}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="file-management-footer">
          <div className="footer-info">
            <div className="company-footer-branding">
              <span>🌱</span>
              <span>Efficient Operations through Better Inventory Management</span>
            </div>
            <p>💡 Only one file can be active at a time. Upload new files or activate existing ones to switch data sources.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileManagement;