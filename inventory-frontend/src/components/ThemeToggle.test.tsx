import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../contexts/ThemeContext'
import ThemeToggle from './ThemeToggle'

// Mock the ThemeContext
const mockUseTheme = {
  isDarkMode: false,
  toggleTheme: vi.fn()
}

vi.mock('../contexts/ThemeContext', async () => {
  const actual = await vi.importActual('../contexts/ThemeContext')
  return {
    ...actual,
    useTheme: () => mockUseTheme
  }
})

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTheme.isDarkMode = false
  })

  it('should render theme toggle button', () => {
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-label', 'Toggle theme')
  })

  it('should show sun icon in light theme', () => {
    mockUseTheme.theme = 'light'
    render(<ThemeToggle />)
    
    const sunIcon = screen.getByTestId('sun-icon')
    expect(sunIcon).toBeInTheDocument()
  })

  it('should show moon icon in dark theme', () => {
    mockUseTheme.isDarkMode = true
    render(<ThemeToggle />)
    
    const moonIcon = screen.getByTestId('moon-icon')
    expect(moonIcon).toBeInTheDocument()
  })

  it('should call toggleTheme when clicked', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(mockUseTheme.toggleTheme).toHaveBeenCalledTimes(1)
  })

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    
    await user.tab()
    expect(button).toHaveFocus()
    
    await user.keyboard('{Enter}')
    expect(mockUseTheme.toggleTheme).toHaveBeenCalledTimes(1)
    
    await user.keyboard(' ')
    expect(mockUseTheme.toggleTheme).toHaveBeenCalledTimes(2)
  })

  it('should have proper CSS classes', () => {
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('theme-toggle')
  })

  it('should be accessible with proper ARIA attributes', () => {
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Toggle theme')
    expect(button).toHaveAttribute('type', 'button')
  })
})

// Integration test with actual ThemeProvider
describe('ThemeToggle Integration', () => {
  it('should work with actual ThemeProvider', async () => {
    const user = userEvent.setup()
    
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
    
    const button = screen.getByRole('button')
    
    // Should start with light theme (default)
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
    
    // Click to toggle to dark theme
    await user.click(button)
    
    // Should now show moon icon (assuming theme changed)
    // Note: This test might need adjustment based on actual ThemeProvider implementation
  })
})