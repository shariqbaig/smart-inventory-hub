import React from 'react';
import './EnhancedKpiCard.css';

interface KpiCardProps {
  title: string;
  value: number;
  unit?: string;
  color: string | 'red' | 'green' | 'blue' | 'orange' | 'purple';
  onClick?: () => void;
  trend?: string;
  icon?: string;
  loading?: boolean;
  error?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ 
  title, 
  value, 
  unit = '', 
  color, 
  onClick, 
  trend,
  icon,
  loading = false,
  error 
}) => {
  const formatNumber = (num: number): string => {
    // For tests, return full formatted number with commas
    return num.toLocaleString();
  };

  const getTheme = (color: string) => {
    if (!color) return 'purple';
    if (typeof color === 'string') {
      if (color === 'red' || color.includes('#dc2626') || color.includes('#ef4444')) return 'red';
      if (color === 'green' || color.includes('#059669') || color.includes('#10b981')) return 'green';
      if (color === 'blue' || color.includes('#3b82f6') || color.includes('#2563eb')) return 'blue';
      if (color === 'orange' || color.includes('#d97706') || color.includes('#f59e0b')) return 'orange';
      if (color === 'purple') return 'purple';
    }
    return 'purple';
  };

  const renderContent = () => {
    if (loading) {
      return <div className="kpi-value">Loading...</div>;
    }
    
    if (error) {
      return (
        <>
          <div className="kpi-value">Error</div>
          <div className="kpi-error">{error}</div>
        </>
      );
    }

    return (
      <div className="kpi-value">
        {formatNumber(value)}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
    );
  };

  const ElementType = onClick ? 'button' : 'div';
  const elementProps = onClick ? {
    role: 'button',
    'aria-label': `${title}: ${formatNumber(value)} ${unit}`,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    }
  } : {};

  return (
    <ElementType
      className={`kpi-card ${onClick ? 'clickable' : ''} ${color}`} 
      onClick={onClick}
      data-theme={getTheme(color)}
      style={{ '--color': color } as React.CSSProperties}
      {...elementProps}
    >
      <div className="kpi-header">
        {icon && <span className="kpi-icon">{icon}</span>}
        <h3 className="kpi-title">{title}</h3>
      </div>
      <div className="kpi-content">
        {renderContent()}
        {trend && !loading && !error && (
          <div className="kpi-trend">{trend}</div>
        )}
      </div>
    </ElementType>
  );
};

export default KpiCard;