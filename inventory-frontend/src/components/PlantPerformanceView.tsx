import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../services/clientApi';
import type { PlantStats } from '../types';
import './EnhancedDashboard.css';

interface PlantPerformanceViewProps {
  onBack?: () => void;
}

interface PlantPerformanceMetrics extends PlantStats {
  efficiency: number;
  utilizationRate: number;
  valuePerUnit: number;
  performanceGrade: 'excellent' | 'good' | 'needs-improvement';
}

const PlantPerformanceView: React.FC<PlantPerformanceViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<PlantPerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof PlantPerformanceMetrics>('efficiency');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterGrade, setFilterGrade] = useState<'all' | 'excellent' | 'good' | 'needs-improvement'>('all');

  useEffect(() => {
    loadPlantPerformance();
  }, []);

  const loadPlantPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const plantsData = await inventoryApi.getPlantStats();
      
      // Calculate performance metrics for each plant
      const performanceData = plantsData.map(plant => {
        const blockedPercentage = plant.totalQuantity > 0 ? (plant.blockedQuantity / plant.totalQuantity) * 100 : 0;
        const efficiency = Math.max(0, 100 - blockedPercentage); // Higher efficiency = lower blocked %
        const utilizationRate = plant.totalQuantity / (plant.materialCount * 1000); // Estimated utilization
        const valuePerUnit = plant.totalQuantity > 0 ? plant.totalValue / plant.totalQuantity : 0;
        
        let performanceGrade: 'excellent' | 'good' | 'needs-improvement' = 'needs-improvement';
        if (efficiency >= 98) performanceGrade = 'excellent';
        else if (efficiency >= 95) performanceGrade = 'good';
        
        return {
          ...plant,
          efficiency,
          utilizationRate: Math.min(100, utilizationRate * 100), // Cap at 100%
          valuePerUnit,
          performanceGrade
        };
      });
      
      setPlants(performanceData);
    } catch (err) {
      console.error('Error loading plant performance:', err);
      setError('Failed to load plant performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof PlantPerformanceMetrics) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredPlants = plants.filter(plant => {
    if (filterGrade === 'all') return true;
    return plant.performanceGrade === filterGrade;
  });

  const sortedPlants = [...filteredPlants].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const formatNumber = (num: number): string => {
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleBackToDashboard = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Analyzing plant performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={loadPlantPerformance} className="retry-button">Retry</button>
      </div>
    );
  }

  const excellentPlants = plants.filter(p => p.performanceGrade === 'excellent').length;
  const goodPlants = plants.filter(p => p.performanceGrade === 'good').length;
  const improvementPlants = plants.filter(p => p.performanceGrade === 'needs-improvement').length;
  const avgEfficiency = plants.reduce((sum, p) => sum + p.efficiency, 0) / plants.length;

  return (
    <div className="dashboard">
      {/* Header Banner */}
      <div className="dashboard-header">
        <div className="brand-header">
          <div className="company-logo">
            <button onClick={handleBackToDashboard} className="back-button" title="Back to Dashboard">
              <span className="sr-only">Back to Dashboard</span>
            </button>
            <div className="brand-text">
              <h1>📊 Plant Performance Analysis</h1>
              <p className="brand-subtitle">Efficiency metrics and productivity analysis across all plants</p>
            </div>
          </div>
        </div>
      </div>
        
      {/* Analysis Explanation */}
      <div className="stats-section">
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Performance Metrics Explained</h3>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Efficiency = 100% - Blocked Stock Percentage</strong> - Higher efficiency indicates better stock management
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Utilization Rate</strong> - Estimated based on inventory volume relative to material diversity
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            Plants are graded as: <span style={{ color: '#059669', fontWeight: 600 }}>Excellent (≥98% efficiency)</span>, 
            <span style={{ color: '#d97706', fontWeight: 600 }}> Good (95-98% efficiency)</span>, or 
            <span style={{ color: '#dc2626', fontWeight: 600 }}> Needs Improvement (&lt;95% efficiency)</span>
          </p>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="stats-section section-spacer">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>Total Plants</h3>
            <p className="stat-value">{plants.length}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #059669' }}>
            <h3>Excellent Performance</h3>
            <p className="stat-value" style={{ color: '#059669' }}>{excellentPlants}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #d97706' }}>
            <h3>Good Performance</h3>
            <p className="stat-value" style={{ color: '#d97706' }}>{goodPlants}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #dc2626' }}>
            <h3>Needs Improvement</h3>
            <p className="stat-value" style={{ color: '#dc2626' }}>{improvementPlants}</p>
          </div>
          <div className="stat-item">
            <h3>Average Efficiency</h3>
            <p className="stat-value">{avgEfficiency.toFixed(1)}%</p>
          </div>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="inline-controls-section">
        <div className="inline-controls-container">
          <label style={{ marginRight: '1rem', fontWeight: 600 }}>Filter by Performance:</label>
          <select 
            value={filterGrade} 
            onChange={(e) => setFilterGrade(e.target.value as any)}
            style={{ 
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">All Plants ({plants.length})</option>
            <option value="excellent">Excellent (≥98%) - {excellentPlants}</option>
            <option value="good">Good (95-98%) - {goodPlants}</option>
            <option value="needs-improvement">Needs Improvement (&lt;95%) - {improvementPlants}</option>
          </select>
        </div>
      </div>

      {/* Performance Table */}
      <div className="stats-section section-spacer">
        <div className="materials-table expanded-table">
          <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('plant')} className="sortable">
                Plant {sortField === 'plant' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('efficiency')} className="sortable">
                Efficiency % {sortField === 'efficiency' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('utilizationRate')} className="sortable">
                Utilization % {sortField === 'utilizationRate' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('totalQuantity')} className="sortable">
                Total Inventory {sortField === 'totalQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('materialCount')} className="sortable">
                Materials {sortField === 'materialCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('valuePerUnit')} className="sortable">
                Value/Unit {sortField === 'valuePerUnit' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('blockedQuantity')} className="sortable">
                Blocked Qty {sortField === 'blockedQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Performance Grade</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlants.map((plant) => (
              <tr key={plant.plant} className={`restriction-${plant.performanceGrade === 'excellent' ? 'low' : plant.performanceGrade === 'good' ? 'medium' : 'high'}`}>
                <td className="material-code">{plant.plant}</td>
                <td className={`percentage ${plant.efficiency >= 98 ? 'status-unrestricted' : plant.efficiency >= 95 ? 'status-restricted' : 'status-blocked'}`}>
                  {plant.efficiency.toFixed(2)}%
                </td>
                <td className="percentage">{plant.utilizationRate.toFixed(1)}%</td>
                <td className="quantity">{formatNumber(plant.totalQuantity)}</td>
                <td className="count">{plant.materialCount}</td>
                <td className="quantity">₨{plant.valuePerUnit.toFixed(2)}</td>
                <td className="quantity restricted">{formatNumber(plant.blockedQuantity)}</td>
                <td>
                  <span className={`status-badge ${
                    plant.performanceGrade === 'excellent' ? 'status-unrestricted' : 
                    plant.performanceGrade === 'good' ? 'status-restricted' : 'status-blocked'
                  }`}>
                    {plant.performanceGrade === 'excellent' ? 'Excellent' :
                     plant.performanceGrade === 'good' ? 'Good' : 'Needs Improvement'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {plants.length === 0 && !loading && (
        <div className="no-data-message" style={{ margin: '3rem auto' }}>
          <div className="no-data-icon">🏭</div>
          <h3>No Plant Data Available</h3>
          <p>Upload inventory data to see plant performance analysis.</p>
        </div>
      )}
    </div>
  );
};

export default PlantPerformanceView;