import React from 'react';
import './EnhancedKpiCard.css';

interface KpiCardProps {
  title: string;
  value: number;
  unit?: string;
  color: string;
  onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit = '', color, onClick }) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getTheme = (color: string) => {
    if (color.includes('#3b82f6') || color.includes('#2563eb')) return 'blue';
    if (color.includes('#dc2626') || color.includes('#ef4444')) return 'red';
    if (color.includes('#059669') || color.includes('#10b981')) return 'green';
    if (color.includes('#d97706') || color.includes('#f59e0b')) return 'orange';
    return 'purple';
  };

  return (
    <div 
      className={`kpi-card ${onClick ? 'clickable' : ''}`} 
      onClick={onClick}
      data-theme={getTheme(color)}
      style={{ '--color': color } as React.CSSProperties}
    >
      <div className="kpi-header">
        <h3 className="kpi-title">{title}</h3>
      </div>
      <div className="kpi-content">
        <div className="kpi-value">
          {formatNumber(value)}
          {unit && <span className="kpi-unit">{unit}</span>}
        </div>
      </div>
    </div>
  );
};

export default KpiCard;