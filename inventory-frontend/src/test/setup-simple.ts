import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock window.URL methods
global.URL.createObjectURL = vi.fn(() => 'mocked-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock window.confirm
global.confirm = vi.fn(() => true)

// Mock File.prototype.arrayBuffer
File.prototype.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8))