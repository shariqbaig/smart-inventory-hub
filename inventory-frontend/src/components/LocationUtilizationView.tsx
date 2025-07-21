import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../services/api';
import type { LocationStats } from '../types';
import './EnhancedDashboard.css';

interface LocationUtilizationViewProps {
  onBack?: () => void;
}

interface LocationUtilizationMetrics extends LocationStats {
  capacityUtilization: number;
  storageEfficiency: number;
  valueConcentration: number;
  materialDensity: number;
  optimizationScore: number;
  recommendation: 'optimal' | 'good' | 'needs-optimization' | 'critical';
}

const LocationUtilizationView: React.FC<LocationUtilizationViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<LocationUtilizationMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof LocationUtilizationMetrics>('optimizationScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterRecommendation, setFilterRecommendation] = useState<'all' | 'optimal' | 'good' | 'needs-optimization' | 'critical'>('all');

  useEffect(() => {
    loadLocationUtilization();
  }, []);

  const loadLocationUtilization = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const locationsData = await inventoryApi.getLocationStats();
      
      // Calculate utilization metrics for each location
      const utilizationData = locationsData.map(location => {
        const blockedPercentage = location.totalQuantity > 0 ? (location.blockedQuantity / location.totalQuantity) * 100 : 0;
        const storageEfficiency = Math.max(0, 100 - blockedPercentage); // Higher efficiency = lower blocked %
        
        // Estimate capacity utilization (assuming higher quantity = better utilization)
        const maxQuantity = Math.max(...locationsData.map(l => l.totalQuantity));
        const capacityUtilization = maxQuantity > 0 ? (location.totalQuantity / maxQuantity) * 100 : 0;
        
        // Value concentration (value per unit)
        const valueConcentration = location.totalQuantity > 0 && location.totalValue ? location.totalValue / location.totalQuantity : 0;
        
        // Material density (materials per location)
        const materialDensity = location.materialCount;
        
        // Overall optimization score (weighted average)
        const optimizationScore = (
          (isNaN(storageEfficiency) ? 0 : storageEfficiency) * 0.4 + 
          (isNaN(capacityUtilization) ? 0 : capacityUtilization) * 0.3 + 
          Math.min(100, (isNaN(materialDensity) ? 0 : materialDensity) * 2) * 0.3 // Cap material density impact
        );
        
        let recommendation: 'optimal' | 'good' | 'needs-optimization' | 'critical' = 'critical';
        if (optimizationScore >= 90) recommendation = 'optimal';
        else if (optimizationScore >= 75) recommendation = 'good';
        else if (optimizationScore >= 50) recommendation = 'needs-optimization';
        
        return {
          ...location,
          capacityUtilization,
          storageEfficiency,
          valueConcentration,
          materialDensity,
          optimizationScore,
          recommendation
        };
      });
      
      setLocations(utilizationData);
    } catch (err) {
      console.error('Error loading location utilization:', err);
      setError('Failed to load location utilization data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof LocationUtilizationMetrics) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredLocations = locations.filter(location => {
    if (filterRecommendation === 'all') return true;
    return location.recommendation === filterRecommendation;
  });

  const sortedLocations = [...filteredLocations].sort((a, b) => {
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
        <p>Analyzing location utilization...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={loadLocationUtilization} className="retry-button">Retry</button>
      </div>
    );
  }

  const optimalLocations = locations.filter(l => l.recommendation === 'optimal').length;
  const goodLocations = locations.filter(l => l.recommendation === 'good').length;
  const needsOptimization = locations.filter(l => l.recommendation === 'needs-optimization').length;
  const criticalLocations = locations.filter(l => l.recommendation === 'critical').length;
  const avgOptimization = locations.length > 0 ? locations.reduce((sum, l) => sum + l.optimizationScore, 0) / locations.length : 0;

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
              <h1>📈 Location Utilization Analysis</h1>
              <p className="brand-subtitle">Storage optimization and capacity insights across all locations</p>
            </div>
          </div>
        </div>
      </div>
        
      {/* Analysis Explanation */}
      <div className="stats-section">
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Utilization Metrics Explained</h3>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Storage Efficiency</strong> - Based on blocked stock percentage (lower blocked = higher efficiency)
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Capacity Utilization</strong> - Relative inventory volume compared to highest-volume location
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Optimization Score</strong> - Weighted combination of efficiency, utilization, and material density
          </p>
          <p style={{ marginBottom: 0 }}>
            Recommendations: <span style={{ color: '#059669', fontWeight: 600 }}>Optimal (≥90)</span>, 
            <span style={{ color: '#d97706', fontWeight: 600 }}> Good (75-90)</span>, 
            <span style={{ color: '#dc2626', fontWeight: 600 }}> Needs Optimization (50-75)</span>, 
            <span style={{ color: '#991b1b', fontWeight: 600 }}> Critical (&lt;50)</span>
          </p>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="stats-section section-spacer">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>Total Locations</h3>
            <p className="stat-value">{locations.length}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #059669' }}>
            <h3>Optimal</h3>
            <p className="stat-value" style={{ color: '#059669' }}>{optimalLocations}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #d97706' }}>
            <h3>Good</h3>
            <p className="stat-value" style={{ color: '#d97706' }}>{goodLocations}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #dc2626' }}>
            <h3>Needs Optimization</h3>
            <p className="stat-value" style={{ color: '#dc2626' }}>{needsOptimization}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #991b1b' }}>
            <h3>Critical</h3>
            <p className="stat-value" style={{ color: '#991b1b' }}>{criticalLocations}</p>
          </div>
          <div className="stat-item">
            <h3>Avg Optimization</h3>
            <p className="stat-value">{isNaN(avgOptimization) ? '0.0' : avgOptimization.toFixed(1)}</p>
          </div>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="inline-controls-section">
        <div className="inline-controls-container">
          <label style={{ marginRight: '1rem', fontWeight: 600 }}>Filter by Recommendation:</label>
          <select 
            value={filterRecommendation} 
            onChange={(e) => setFilterRecommendation(e.target.value as any)}
            style={{ 
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">All Locations ({locations.length})</option>
            <option value="optimal">Optimal (≥90) - {optimalLocations}</option>
            <option value="good">Good (75-90) - {goodLocations}</option>
            <option value="needs-optimization">Needs Optimization (50-75) - {needsOptimization}</option>
            <option value="critical">Critical (&lt;50) - {criticalLocations}</option>
          </select>
        </div>
      </div>

      {/* Utilization Table */}
      <div className="stats-section section-spacer">
        <div className="materials-table expanded-table">
          <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('storageLocation')} className="sortable">
                Location {sortField === 'storageLocation' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('optimizationScore')} className="sortable">
                Optimization Score {sortField === 'optimizationScore' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('storageEfficiency')} className="sortable">
                Storage Efficiency % {sortField === 'storageEfficiency' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('capacityUtilization')} className="sortable">
                Capacity Utilization % {sortField === 'capacityUtilization' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('materialDensity')} className="sortable">
                Material Count {sortField === 'materialDensity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('totalQuantity')} className="sortable">
                Total Inventory {sortField === 'totalQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('valueConcentration')} className="sortable">
                Value/Unit {sortField === 'valueConcentration' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {sortedLocations.map((location) => (
              <tr key={location.storageLocation} className={`restriction-${
                location.recommendation === 'optimal' ? 'low' : 
                location.recommendation === 'good' ? 'medium' : 'high'
              }`}>
                <td className="material-code">{location.storageLocation}</td>
                <td className={`percentage ${
                  location.optimizationScore >= 90 ? 'status-unrestricted' : 
                  location.optimizationScore >= 75 ? 'status-restricted' : 'status-blocked'
                }`}>
                  {isNaN(location.optimizationScore) ? '0.0' : location.optimizationScore.toFixed(1)}
                </td>
                <td className="percentage">{isNaN(location.storageEfficiency) ? '0.0' : location.storageEfficiency.toFixed(1)}%</td>
                <td className="percentage">{isNaN(location.capacityUtilization) ? '0.0' : location.capacityUtilization.toFixed(1)}%</td>
                <td className="count">{location.materialDensity}</td>
                <td className="quantity">{formatNumber(location.totalQuantity)}</td>
                <td className="quantity">₨{isNaN(location.valueConcentration) ? '0.00' : location.valueConcentration.toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${
                    location.recommendation === 'optimal' ? 'status-unrestricted' : 
                    location.recommendation === 'good' ? 'status-restricted' : 'status-blocked'
                  }`}>
                    {location.recommendation === 'optimal' ? 'Optimal' :
                     location.recommendation === 'good' ? 'Good' :
                     location.recommendation === 'needs-optimization' ? 'Needs Optimization' : 'Critical'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {locations.length === 0 && !loading && (
        <div className="no-data-message" style={{ margin: '3rem auto' }}>
          <div className="no-data-icon">📈</div>
          <h3>No Location Data Available</h3>
          <p>Upload inventory data to see location utilization analysis.</p>
        </div>
      )}
    </div>
  );
};

export default LocationUtilizationView;