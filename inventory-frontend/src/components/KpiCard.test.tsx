import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KpiCard from './KpiCard'

describe('KpiCard', () => {
  const defaultProps = {
    title: 'Total Inventory',
    value: 1500000,
    unit: 'units',
    trend: '+5.2%' as const,
    color: 'blue' as const,
    icon: '📦' as const
  }

  it('should render basic KPI information', () => {
    render(<KpiCard {...defaultProps} />)

    expect(screen.getByText('Total Inventory')).toBeInTheDocument()
    expect(screen.getByText('1,500,000')).toBeInTheDocument()
    expect(screen.getByText('units')).toBeInTheDocument()
    expect(screen.getByText('+5.2%')).toBeInTheDocument()
    expect(screen.getByText('📦')).toBeInTheDocument()
  })

  it('should format large numbers correctly', () => {
    render(<KpiCard {...defaultProps} value={1234567890} />)
    expect(screen.getByText('1,234,567,890')).toBeInTheDocument()
  })

  it('should handle zero values', () => {
    render(<KpiCard {...defaultProps} value={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should handle negative values', () => {
    render(<KpiCard {...defaultProps} value={-500} />)
    expect(screen.getByText('-500')).toBeInTheDocument()
  })

  it('should apply correct color classes', () => {
    const { rerender } = render(<KpiCard {...defaultProps} color="red" />)
    expect(document.querySelector('.kpi-card.red')).toBeInTheDocument()

    rerender(<KpiCard {...defaultProps} color="green" />)
    expect(document.querySelector('.kpi-card.green')).toBeInTheDocument()

    rerender(<KpiCard {...defaultProps} color="orange" />)
    expect(document.querySelector('.kpi-card.orange')).toBeInTheDocument()
  })

  it('should handle click events when clickable', async () => {
    const user = userEvent.setup()
    const onClickMock = vi.fn()
    
    render(<KpiCard {...defaultProps} onClick={onClickMock} />)
    
    const card = screen.getByRole('button')
    expect(card).toBeInTheDocument()
    
    await user.click(card)
    expect(onClickMock).toHaveBeenCalledTimes(1)
  })

  it('should not be clickable when no onClick handler provided', () => {
    render(<KpiCard {...defaultProps} />)
    
    const card = document.querySelector('.kpi-card')
    expect(card).not.toHaveAttribute('role', 'button')
    expect(card).not.toHaveClass('clickable')
  })

  it('should show loading state', () => {
    render(<KpiCard {...defaultProps} loading={true} />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('1,500,000')).not.toBeInTheDocument()
  })

  it('should show error state', () => {
    render(<KpiCard {...defaultProps} error="Failed to load data" />)
    
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    expect(screen.queryByText('1,500,000')).not.toBeInTheDocument()
  })

  it('should handle different trend formats', () => {
    const { rerender } = render(<KpiCard {...defaultProps} trend="+10%" />)
    expect(screen.getByText('+10%')).toBeInTheDocument()

    rerender(<KpiCard {...defaultProps} trend="-2.5%" />)
    expect(screen.getByText('-2.5%')).toBeInTheDocument()

    rerender(<KpiCard {...defaultProps} trend="No change" />)
    expect(screen.getByText('No change')).toBeInTheDocument()
  })

  it('should handle missing optional props gracefully', () => {
    const minimalProps = {
      title: 'Simple KPI',
      value: 100
    }
    
    render(<KpiCard {...minimalProps} />)
    
    expect(screen.getByText('Simple KPI')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    // Should not crash without optional props
  })

  it('should display currency values correctly', () => {
    render(<KpiCard {...defaultProps} value={25000} unit="PKR" />)
    
    expect(screen.getByText('25,000')).toBeInTheDocument()
    expect(screen.getByText('PKR')).toBeInTheDocument()
  })

  it('should apply hover effects when clickable', async () => {
    const user = userEvent.setup()
    const onClickMock = vi.fn()
    
    render(<KpiCard {...defaultProps} onClick={onClickMock} />)
    
    const card = screen.getByRole('button')
    
    await user.hover(card)
    expect(card).toHaveClass('clickable')
  })

  it('should handle keyboard navigation when clickable', async () => {
    const user = userEvent.setup()
    const onClickMock = vi.fn()
    
    render(<KpiCard {...defaultProps} onClick={onClickMock} />)
    
    const card = screen.getByRole('button')
    
    await user.tab()
    expect(card).toHaveFocus()
    
    await user.keyboard('{Enter}')
    expect(onClickMock).toHaveBeenCalledTimes(1)
    
    await user.keyboard(' ')
    expect(onClickMock).toHaveBeenCalledTimes(2)
  })

  it('should display different icons correctly', () => {
    const { rerender } = render(<KpiCard {...defaultProps} icon="🔴" />)
    expect(screen.getByText('🔴')).toBeInTheDocument()

    rerender(<KpiCard {...defaultProps} icon="⚠️" />)
    expect(screen.getByText('⚠️')).toBeInTheDocument()

    rerender(<KpiCard {...defaultProps} icon="✅" />)
    expect(screen.getByText('✅')).toBeInTheDocument()
  })

  it('should handle very large numbers with proper formatting', () => {
    render(<KpiCard {...defaultProps} value={999999999999} />)
    expect(screen.getByText('999,999,999,999')).toBeInTheDocument()
  })

  it('should handle decimal values', () => {
    render(<KpiCard {...defaultProps} value={1234.56} />)
    expect(screen.getByText('1,234.56')).toBeInTheDocument()
  })

  it('should not render trend when not provided', () => {
    const propsWithoutTrend = {
      title: 'No Trend KPI',
      value: 500,
      unit: 'items'
    }
    
    render(<KpiCard {...propsWithoutTrend} />)
    
    expect(screen.getByText('No Trend KPI')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.queryByText('%')).not.toBeInTheDocument()
  })
})