import { describe, it, expect } from 'vitest'

describe('Basic Test Setup', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to mocked IndexedDB', () => {
    expect(window.indexedDB).toBeDefined()
  })

  it('should have access to vi mock function', () => {
    const mockFn = vi.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })
})