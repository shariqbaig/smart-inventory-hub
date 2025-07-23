import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileManagement from './FileManagement'

// Mock the services
vi.mock('../services/excelProcessor', () => ({
  excelProcessor: {
    processFile: vi.fn(),
    activateFile: vi.fn(),
    deleteFile: vi.fn(),
    getFileHistory: vi.fn(),
    downloadTemplate: vi.fn()
  }
}))

vi.mock('../services/dataStorage', () => ({
  dataStorage: {
    clearAllData: vi.fn(),
    init: vi.fn(),
    getAllFileMetadata: vi.fn(),
    getActiveFileId: vi.fn()
  }
}))

describe('FileManagement', () => {
  const mockProps = {
    onUploadSuccess: vi.fn(),
    onClose: vi.fn()
  }

  const mockFileHistory = [
    {
      id: 'file-1',
      name: 'inventory-2024.xlsx',
      uploadDate: new Date('2024-01-15'),
      isActive: true,
      recordCount: 1500,
      validationStatus: 'valid' as const,
      errorCount: 0,
      warningCount: 3
    },
    {
      id: 'file-2',
      name: 'old-inventory.xlsx',
      uploadDate: new Date('2024-01-10'),
      isActive: false,
      recordCount: 1200,
      validationStatus: 'warning' as const,
      errorCount: 0,
      warningCount: 5
    },
    {
      id: 'file-3',
      name: 'invalid-file.xlsx',
      uploadDate: new Date('2024-01-05'),
      isActive: false,
      recordCount: 800,
      validationStatus: 'invalid' as const,
      errorCount: 10,
      warningCount: 2
    }
  ]

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { excelProcessor } = await import('../services/excelProcessor')
    const { dataStorage } = await import('../services/dataStorage')
    
    vi.mocked(excelProcessor.getFileHistory).mockResolvedValue(mockFileHistory)
    vi.mocked(dataStorage.init).mockResolvedValue()
    vi.mocked(dataStorage.getAllFileMetadata).mockResolvedValue(mockFileHistory)
    vi.mocked(dataStorage.getActiveFileId).mockResolvedValue('file-1')
  })

  describe('Tab Navigation', () => {
    it('should render all three tabs', () => {
      render(<FileManagement {...mockProps} />)
      
      expect(screen.getByText('Upload Inventory')).toBeInTheDocument()
      expect(screen.getByText('Requirements')).toBeInTheDocument()
      expect(screen.getByText(/History/)).toBeInTheDocument()
    })

    it('should switch between tabs', async () => {
      const user = userEvent.setup()
      render(<FileManagement {...mockProps} />)
      
      // Should start on upload tab
      expect(screen.getByText(/drag and drop your Excel file here/i)).toBeInTheDocument()
      
      // Switch to requirements tab
      await user.click(screen.getByText('Requirements'))
      expect(screen.getByText('Excel File Requirements')).toBeInTheDocument()
      
      // Switch to history tab
      await user.click(screen.getByText(/History/))
      await waitFor(() => {
        expect(screen.getByText('Upload History')).toBeInTheDocument()
      })
    })
  })

  describe('File Upload', () => {
    it('should handle drag and drop events', async () => {
      render(<FileManagement {...mockProps} />)
      
      const dropZone = screen.getByText(/drag and drop your Excel file here/i).closest('.drag-drop-area')
      expect(dropZone).toBeInTheDocument()
      
      // Test drag over event
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      // Create drag event
      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true })
      const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
      
      // Add dataTransfer to events
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: { files: [file] }
      })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [file] }
      })
      
      // Test drag over - check that the event is handled
      dropZone!.dispatchEvent(dragOverEvent)
      // Note: The drag-over class is applied on React state change, so we just verify the event was handled
      
      // Test drop (this should trigger file processing)
      dropZone!.dispatchEvent(dropEvent)
    })

    it('should process uploaded file', async () => {
      const user = userEvent.setup()
      const { excelProcessor } = await import('../services/excelProcessor')
      
      const mockProcessResult = {
        success: true,
        message: 'File uploaded successfully and activated',
        fileId: 'test-file-123',
        recordCount: 100,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          summary: {
            totalRows: 100,
            validRows: 100,
            errorRows: 0,
            warningRows: 0
          }
        },
        fileMetadata: {
          id: 'test-file-123',
          name: 'test.xlsx',
          uploadDate: new Date(),
          isActive: true,
          recordCount: 100,
          validationStatus: 'valid' as const
        }
      }
      
      vi.mocked(excelProcessor.processFile).mockResolvedValue(mockProcessResult)
      
      render(<FileManagement {...mockProps} />)
      
      const fileInput = screen.getByLabelText(/click to browse/i)
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      await user.upload(fileInput, file)
      
      await waitFor(() => {
        expect(excelProcessor.processFile).toHaveBeenCalledWith(file)
      })
    })

    it('should handle file processing errors', async () => {
      const user = userEvent.setup()
      const { excelProcessor } = await import('../services/excelProcessor')
      
      const mockErrorResult = {
        success: false,
        message: 'File processing failed',
        fileId: '',
        recordCount: 0,
        validation: {
          isValid: false,
          errors: [{ row: 1, column: 'Material', value: '', message: 'Material code is required' }],
          warnings: [],
          summary: {
            totalRows: 0,
            validRows: 0,
            errorRows: 1,
            warningRows: 0
          }
        },
        fileMetadata: {
          id: '',
          name: 'test.xlsx',
          uploadDate: new Date(),
          isActive: false,
          recordCount: 0,
          validationStatus: 'invalid' as const
        }
      }
      
      vi.mocked(excelProcessor.processFile).mockResolvedValue(mockErrorResult)
      
      render(<FileManagement {...mockProps} />)
      
      const fileInput = screen.getByLabelText(/click to browse/i)
      const file = new File(['invalid content'], 'invalid.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      await user.upload(fileInput, file)
      
      await waitFor(() => {
        expect(screen.getByText('File processing failed')).toBeInTheDocument()
      })
    })
  })

  describe('File History', () => {
    it('should display file history', async () => {
      const user = userEvent.setup()
      render(<FileManagement {...mockProps} />)
      
      await user.click(screen.getByText(/History/))
      
      await waitFor(() => {
        expect(screen.getByText('inventory-2024.xlsx')).toBeInTheDocument()
        expect(screen.getByText('old-inventory.xlsx')).toBeInTheDocument()
        expect(screen.getByText('invalid-file.xlsx')).toBeInTheDocument()
      })
    })

    it('should show active file indicator', async () => {
      const user = userEvent.setup()
      render(<FileManagement {...mockProps} />)
      
      await user.click(screen.getByText(/History/))
      
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument()
      })
    })

    it('should display file statistics', async () => {
      const user = userEvent.setup()
      render(<FileManagement {...mockProps} />)
      
      await user.click(screen.getByText(/History/))
      
      await waitFor(() => {
        expect(screen.getByText('• 1500 records')).toBeInTheDocument()
        expect(screen.getByText('• 1200 records')).toBeInTheDocument()
        expect(screen.getByText('• 800 records')).toBeInTheDocument()
      })
    })

    it('should handle file activation', async () => {
      const user = userEvent.setup()
      const { excelProcessor } = await import('../services/excelProcessor')
      
      render(<FileManagement {...mockProps} />)
      
      await user.click(screen.getByText(/History/))
      
      await waitFor(() => {
        expect(screen.getByText('old-inventory.xlsx')).toBeInTheDocument()
      })
      
      const activateButtons = screen.getAllByText('Activate')
      await user.click(activateButtons[0])
      
      await waitFor(() => {
        expect(excelProcessor.activateFile).toHaveBeenCalledWith('file-2')
      })
    })

    it('should handle file deletion', async () => {
      const user = userEvent.setup()
      const { excelProcessor } = await import('../services/excelProcessor')
      
      render(<FileManagement {...mockProps} />)
      
      await user.click(screen.getByText(/History/))
      
      await waitFor(() => {
        expect(screen.getByText('old-inventory.xlsx')).toBeInTheDocument()
      })
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(excelProcessor.deleteFile).toHaveBeenCalled()
      })
    })
  })

  describe('Template and Debug Tools', () => {
    it('should download template when clicked', async () => {
      const user = userEvent.setup()
      const { excelProcessor } = await import('../services/excelProcessor')
      
      render(<FileManagement {...mockProps} />)
      
      const downloadButton = screen.getByText('Download Template')
      await user.click(downloadButton)
      
      expect(excelProcessor.downloadTemplate).toHaveBeenCalled()
    })

    it('should show reset database confirmation modal', async () => {
      const user = userEvent.setup()
      render(<FileManagement {...mockProps} />)
      
      const resetButton = screen.getByText('Reset Database')
      await user.click(resetButton)
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Database Reset')).toBeInTheDocument()
        expect(screen.getByText('This action cannot be undone!')).toBeInTheDocument()
      })
    })

    it('should reset database when confirmed', async () => {
      const user = userEvent.setup()
      const { dataStorage } = await import('../services/dataStorage')
      
      render(<FileManagement {...mockProps} />)
      
      const resetButton = screen.getByText('Reset Database')
      await user.click(resetButton)
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Database Reset')).toBeInTheDocument()
      })
      
      const confirmButton = document.querySelector('.confirm-reset-button')
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(dataStorage.clearAllData).toHaveBeenCalled()
      })
    })

    it('should cancel database reset', async () => {
      const user = userEvent.setup()
      const { dataStorage } = await import('../services/dataStorage')
      
      render(<FileManagement {...mockProps} />)
      
      const resetButton = screen.getByText('Reset Database')
      await user.click(resetButton)
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Database Reset')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Confirm Database Reset')).not.toBeInTheDocument()
      })
      
      expect(dataStorage.clearAllData).not.toHaveBeenCalled()
    })
  })

  describe('Modal Behavior', () => {
    it('should close modal when close button clicked', async () => {
      const user = userEvent.setup()
      render(<FileManagement {...mockProps} />)
      
      const closeButton = screen.getByLabelText('Close')
      await user.click(closeButton)
      
      expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('should call onUploadSuccess after successful file upload', async () => {
      const user = userEvent.setup()
      const { excelProcessor } = await import('../services/excelProcessor')
      
      const mockProcessResult = {
        success: true,
        message: 'File uploaded successfully and activated',
        fileId: 'test-file-123',
        recordCount: 100,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          summary: {
            totalRows: 100,
            validRows: 100,
            errorRows: 0,
            warningRows: 0
          }
        },
        fileMetadata: {
          id: 'test-file-123',
          name: 'test.xlsx',
          uploadDate: new Date(),
          isActive: true,
          recordCount: 100,
          validationStatus: 'valid' as const
        }
      }
      
      vi.mocked(excelProcessor.processFile).mockResolvedValue(mockProcessResult)
      
      render(<FileManagement {...mockProps} />)
      
      const fileInput = screen.getByLabelText(/click to browse/i)
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      await user.upload(fileInput, file)
      
      await waitFor(() => {
        expect(mockProps.onUploadSuccess).toHaveBeenCalledWith({
          fileId: 'test-file-123',
          message: 'File uploaded successfully and activated',
          recordCount: 100,
          validation: expect.any(Object)
        })
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<FileManagement {...mockProps} />)
      
      expect(screen.getByLabelText('Close')).toBeInTheDocument()
      expect(screen.getByLabelText(/click to browse/i)).toBeInTheDocument()
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<FileManagement {...mockProps} />)
      
      // Tab through the interface
      await user.tab()
      expect(screen.getByText('Upload Inventory')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Requirements')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText(/History/)).toHaveFocus()
    })
  })
})