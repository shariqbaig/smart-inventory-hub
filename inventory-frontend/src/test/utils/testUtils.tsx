import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '../../contexts/ThemeContext'
import type { MaterialDetail } from '../../types'

// Custom render function with providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock data generators
export const generateMockMaterialDetail = (overrides: Partial<MaterialDetail> = {}): MaterialDetail => {
  return {
    material: 123456,
    materialDescription: 'Test Material',
    plant: 'P001',
    storageLocation: 'WH01',
    baseUnitOfMeasure: 'EA',
    unrestricted: 1000,
    stockInTransfer: 0,
    inQualityInsp: 0,
    restrictedUseStock: 0,
    blocked: 50,
    valueUnrestricted: 25000,
    totalShelfLife: 365,
    sled: 0,
    dateOfManufacture: 0,
    batch: 'BATCH001',
    totalQuantity: 1050,
    status: 'blocked',
    ...overrides
  }
}

export const generateMockMaterialDetails = (count: number): MaterialDetail[] => {
  return Array.from({ length: count }, (_, index) => 
    generateMockMaterialDetail({
      material: 100000 + index,
      materialDescription: `Test Material ${index + 1}`,
      plant: `P00${(index % 3) + 1}`,
      storageLocation: `WH0${(index % 4) + 1}`,
      unrestricted: Math.floor(Math.random() * 1000) + 100,
      blocked: Math.floor(Math.random() * 100),
      valueUnrestricted: Math.floor(Math.random() * 10000) + 1000,
      batch: `BATCH${String(index + 1).padStart(3, '0')}`,
      status: ['blocked', 'unrestricted', 'restricted', 'in-transfer', 'quality-inspection'][index % 5] as any
    })
  )
}

export const createMockExcelFile = (
  filename: string = 'test.xlsx',
  content: string = 'mock excel content'
): File => {
  return new File([content], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

export const createMockFileMetadata = (overrides: any = {}) => {
  return {
    id: 'test-file-123',
    name: 'test-inventory.xlsx',
    uploadDate: new Date('2024-01-15'),
    isActive: false,
    recordCount: 100,
    validationStatus: 'valid' as const,
    errorCount: 0,
    warningCount: 0,
    ...overrides
  }
}

// Wait for async operations
export const waitForAsync = (ms: number = 0): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Mock intersection observer for charts
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  })
  window.IntersectionObserver = mockIntersectionObserver
}

// Mock resize observer for responsive components
export const mockResizeObserver = () => {
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
}

// Setup common mocks
export const setupCommonMocks = () => {
  mockIntersectionObserver()
  mockResizeObserver()
  
  // Mock window.matchMedia for responsive tests
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
  
  // Mock scrollTo
  window.scrollTo = vi.fn()
}

// Test data validation helpers
export const isValidMaterialDetail = (item: any): item is MaterialDetail => {
  return (
    typeof item.material === 'number' &&
    typeof item.materialDescription === 'string' &&
    typeof item.plant === 'string' &&
    typeof item.storageLocation === 'string' &&
    typeof item.baseUnitOfMeasure === 'string' &&
    typeof item.unrestricted === 'number' &&
    typeof item.blocked === 'number' &&
    ['blocked', 'unrestricted', 'restricted', 'in-transfer', 'quality-inspection'].includes(item.status)
  )
}

// Performance testing helpers
export const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now()
  renderFn()
  // Wait for React to finish rendering
  await waitForAsync(0)
  const end = performance.now()
  return end - start
}

// Accessibility testing helpers
export const getByTextContent = (text: string) => {
  return (content: string, node: Element | null) => {
    const hasText = (node: Element | null) => node?.textContent === text
    const nodeHasText = hasText(node)
    const childrenDontHaveText = node ? Array.from(node.children).every(child => !hasText(child)) : false
    return nodeHasText && childrenDontHaveText
  }
}

// Export everything including the custom render
export * from '@testing-library/react'
export { customRender as render }