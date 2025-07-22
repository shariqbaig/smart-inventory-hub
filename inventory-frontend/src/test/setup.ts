import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// Mock window.URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock the XLSX library for file processing tests
vi.mock('xlsx', () => ({
  read: vi.fn(() => ({
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: {
        '!ref': 'A1:O3',
        A1: { v: 'Material' },
        B1: { v: 'Material Description' },
        C1: { v: 'Plant' },
        D1: { v: 'Storage Location' },
        A2: { v: '10001001' },
        B2: { v: 'Sample Material A' },
        C2: { v: 'P001' },
        D2: { v: 'WH01' }
      }
    }
  })),
  utils: {
    sheet_to_json: vi.fn(() => [
      ['Material', 'Material Description', 'Plant', 'Storage Location', 'Base Unit of Measure', 'Unrestricted', 'Stock in transfer', 'In Quality Insp.', 'Restricted-Use Stock', 'Blocked', 'Value Unrestricted', 'Total shelf life', 'SLED/BBD', 'Date of Manufacture', 'Batch'],
      ['10001001', 'Sample Material A', 'P001', 'WH01', 'EA', 1000, 0, 0, 0, 50, 25000, 365, 44927, 44562, 'BATCH001'],
      ['10001002', 'Sample Material B', 'P001', 'WH02', 'KG', 500, 100, 0, 0, 0, 15000, 0, 0, 0, 'BATCH002']
    ]),
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    write: vi.fn(() => new ArrayBuffer(8))
  }
}))

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Setup IndexedDB mock
Object.defineProperty(window, 'indexedDB', {
  value: require('fake-indexeddb/lib/fakeIndexedDB'),
})

// Mock file reader for Excel upload tests
global.FileReader = class {
  readAsArrayBuffer = vi.fn()
  result: ArrayBuffer | null = null
  onload: ((event: any) => void) | null = null
  
  constructor() {
    setTimeout(() => {
      this.result = new ArrayBuffer(8)
      if (this.onload) {
        this.onload({ target: { result: this.result } })
      }
    }, 0)
  }
} as any

// Mock File.prototype.arrayBuffer
File.prototype.arrayBuffer = vi.fn().mockImplementation(() => 
  Promise.resolve(new ArrayBuffer(8))
)