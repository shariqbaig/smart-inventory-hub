import React, { useState, useRef, useCallback } from 'react';
import { inventoryApi } from '../services/api';
import './FileUpload.css';

interface FileUploadProps {
  onUploadSuccess: (fileInfo: any) => void;
  onClose: () => void;
}

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  uploadedAt: string;
  size: number;
  isActive: boolean;
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
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onClose }) => {
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
    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return 'Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)';
    }

    // Check file size (max 50MB)
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

      // Create XMLHttpRequest for progress tracking
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
              
              // Handle validation results
              if (response.validation) {
                setValidationResult(response.validation);
                setShowValidation(true);
              }
              
              await loadFileHistory(); // Refresh file list
              onUploadSuccess(response);
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

        xhr.open('POST', `${inventoryApi.baseURL}/upload-file`);
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
    } catch (err) {
      console.error('Error activating file:', err);
      setError('Failed to activate file');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
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

  const handleDownloadSample = async () => {
    try {
      const response = await fetch(`${inventoryApi.baseURL}/download-sample`);
      if (!response.ok) {
        throw new Error('Failed to download sample file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inventory_sample_template.xlsx';
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
      const response = await fetch(`${inventoryApi.baseURL}/download-current-data`);
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

  return (
    <div className="file-upload-overlay">
      <div className="file-upload-modal">
        <div className="file-upload-header">
          <h2>📁 File Management</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="file-upload-content">
          {/* Download Section */}
          <div className="download-section">
            <h3>Download Templates & Data</h3>
            <div className="download-buttons">
              <button onClick={handleDownloadSample} className="download-button sample">
                📥 Download Sample Template
                <span className="button-subtitle">Get the correct Excel format with sample data</span>
              </button>
              <button onClick={handleDownloadCurrentData} className="download-button current">
                📤 Download Current Data
                <span className="button-subtitle">Export currently loaded inventory data</span>
              </button>
            </div>
          </div>

          {/* Upload Section */}
          <div className="upload-section">
            <h3>Upload New File</h3>
            <div
              className={`drag-drop-area ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
            >
              {isUploading ? (
                <div className="upload-progress">
                  <div className="progress-circle">
                    <div className="progress-text">{uploadProgress}%</div>
                  </div>
                  <p>Uploading...</p>
                </div>
              ) : (
                <>
                  <div className="upload-icon">📤</div>
                  <h4>Drag & drop your Excel file here</h4>
                  <p>or <span className="browse-link">browse to choose</span></p>
                  <p className="file-types">Supports: .xlsx, .xls, .csv (max 50MB)</p>
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
                  <h4>File Validation Results</h4>
                  <button onClick={() => setShowValidation(false)} className="close-validation">×</button>
                </div>
                
                <div className="validation-summary">
                  <div className="summary-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total Rows:</span>
                      <span className="stat-value">{validationResult.summary.totalRows}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Valid Rows:</span>
                      <span className="stat-value success">{validationResult.summary.validRows}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Errors:</span>
                      <span className="stat-value error">{validationResult.summary.errorRows}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Warnings:</span>
                      <span className="stat-value warning">{validationResult.summary.warningRows}</span>
                    </div>
                  </div>
                </div>

                {validationResult.errors.length > 0 && (
                  <div className="validation-section">
                    <h5>❌ Errors (Must be fixed)</h5>
                    <div className="validation-list">
                      {validationResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="validation-item error">
                          <span className="row-number">Row {error.row}</span>
                          <span className="column-name">Column: {error.column}</span>
                          <span className="error-message">{error.message}</span>
                          <span className="error-value">Value: "{String(error.value)}"</span>
                        </div>
                      ))}
                      {validationResult.errors.length > 10 && (
                        <div className="more-errors">
                          ... and {validationResult.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div className="validation-section">
                    <h5>⚠️ Warnings (Review recommended)</h5>
                    <div className="validation-list">
                      {validationResult.warnings.slice(0, 5).map((warning, index) => (
                        <div key={index} className="validation-item warning">
                          <span className="row-number">Row {warning.row}</span>
                          <span className="column-name">Column: {warning.column}</span>
                          <span className="warning-message">{warning.message}</span>
                          <span className="warning-value">Value: "{String(warning.value)}"</span>
                        </div>
                      ))}
                      {validationResult.warnings.length > 5 && (
                        <div className="more-warnings">
                          ... and {validationResult.warnings.length - 5} more warnings
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="validation-actions">
                  {validationResult.isValid ? (
                    <div className="success-message">
                      ✅ File validation passed! Your data has been processed successfully.
                    </div>
                  ) : (
                    <div className="validation-note">
                      📝 Please fix the errors and re-upload the file. Warnings are optional but recommended to address.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* File History Section */}
          <div className="file-history-section">
            <h3>File History</h3>
            {loadingHistory ? (
              <div className="loading-files">Loading files...</div>
            ) : uploadedFiles.length === 0 ? (
              <div className="no-files">No files uploaded yet</div>
            ) : (
              <div className="files-list">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className={`file-item ${file.isActive ? 'active' : ''}`}>
                    <div className="file-info">
                      <div className="file-name">
                        {file.isActive && <span className="active-badge">ACTIVE</span>}
                        <span className="name">{file.originalName}</span>
                      </div>
                      <div className="file-details">
                        <span className="size">{formatFileSize(file.size)}</span>
                        <span className="date">{formatDate(file.uploadedAt)}</span>
                      </div>
                    </div>
                    <div className="file-actions">
                      {!file.isActive && (
                        <button
                          onClick={() => handleActivateFile(file.id)}
                          className="activate-button"
                          title="Set as active file"
                        >
                          ✓ Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="delete-button"
                        title="Delete file"
                        disabled={file.isActive}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="file-upload-footer">
          <p className="upload-info">
            💡 Only one file can be active at a time. Upload a new file or activate an existing one to switch data sources.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;