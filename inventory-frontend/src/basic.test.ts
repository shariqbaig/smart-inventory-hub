import { describe, it, expect } from 'vitest'

describe('Basic Test Setup', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should verify testing infrastructure is working', () => {
    expect(true).toBe(true)
  })
})