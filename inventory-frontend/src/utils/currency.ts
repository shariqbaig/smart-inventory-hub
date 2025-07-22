/**
 * Currency formatting utilities for the inventory dashboard
 */

export const formatCurrency = (value: number, currency: string = 'PKR'): string => {
  if (value === 0) return '₨0';
  
  // Format large numbers with appropriate suffixes
  const formatWithSuffix = (num: number): string => {
    if (Math.abs(num) >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toFixed(2);
    }
  };

  const formattedValue = formatWithSuffix(value);
  return `₨${formattedValue}`;
};

export const formatCurrencyFull = (value: number, currency: string = 'PKR'): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatCurrencyCompact = (value: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
};