import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../services/api';
import type { MaterialDetail } from '../types';
import './EnhancedDashboard.css';

interface RestrictedMaterialsViewProps {
  onBack?: () => void;
  onMaterialClick?: (material: number) => void;
}

interface RestrictedMaterialSummary {
  material: number;
  materialDescription: string;
  totalQuantity: number;
  restrictedQuantity: number;
  unrestrictedQuantity: number;
  restrictedPercentage: number;
  plantsCount: number;
  locationsCount: number;
  plants: string[];
  locations: string[];
}

const RestrictedMaterialsView: React.FC<RestrictedMaterialsViewProps> = ({ onBack, onMaterialClick }) => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<RestrictedMaterialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof RestrictedMaterialSummary>('restrictedPercentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    loadRestrictedMaterialsSummary();
  }, []);

  const loadRestrictedMaterialsSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all materials to create summary
      const result = await inventoryApi.getMaterialDetails({ page: 1, limit: 10000 });
      const allMaterials = result.materials;
      
      // Group by material number and aggregate data
      const materialMap = new Map<number, RestrictedMaterialSummary>();
      
      allMaterials.forEach(item => {
        const existing = materialMap.get(item.material);
        if (existing) {
          existing.totalQuantity += item.totalQuantity;
          existing.restrictedQuantity += item.restrictedUseStock;
          existing.unrestrictedQuantity += item.unrestricted;
          if (!existing.plants.includes(item.plant)) {
            existing.plants.push(item.plant);
            existing.plantsCount++;
          }
          if (!existing.locations.includes(item.storageLocation)) {
            existing.locations.push(item.storageLocation);
            existing.locationsCount++;
          }
        } else {
          materialMap.set(item.material, {
            material: item.material,
            materialDescription: item.materialDescription,
            totalQuantity: item.totalQuantity,
            restrictedQuantity: item.restrictedUseStock,
            unrestrictedQuantity: item.unrestricted,
            restrictedPercentage: 0, // Will calculate below
            plantsCount: 1,
            locationsCount: 1,
            plants: [item.plant],
            locations: [item.storageLocation]
          });
        }
      });
      
      // Calculate restricted percentages and filter only materials with restricted stock
      const summaryData = Array.from(materialMap.values())
        .map(material => ({
          ...material,
          restrictedPercentage: material.totalQuantity > 0 
            ? (material.restrictedQuantity / material.totalQuantity) * 100 
            : 0
        }))
        .filter(material => material.restrictedQuantity > 0); // Only show materials with restricted stock
      
      setMaterials(summaryData);
    } catch (err) {
      console.error('Error loading restricted materials summary:', err);
      setError('Failed to load restricted materials summary');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof RestrictedMaterialSummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getRestrictedLevel = (percentage: number): 'high' | 'medium' | 'low' => {
    if (percentage > 15) return 'high';
    if (percentage > 5) return 'medium';
    return 'low';
  };

  const filteredMaterials = materials.filter(material => {
    if (filterLevel === 'all') return true;
    return getRestrictedLevel(material.restrictedPercentage) === filterLevel;
  });

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
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
        <p>Analyzing materials and restricted stock levels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={loadRestrictedMaterialsSummary} className="retry-button">Retry</button>
      </div>
    );
  }

  const totalMaterials = materials.length;
  const highRestrictedMaterials = materials.filter(m => getRestrictedLevel(m.restrictedPercentage) === 'high').length;
  const mediumRestrictedMaterials = materials.filter(m => getRestrictedLevel(m.restrictedPercentage) === 'medium').length;
  const lowRestrictedMaterials = materials.filter(m => getRestrictedLevel(m.restrictedPercentage) === 'low').length;
  
  const totalInventory = materials.reduce((sum, m) => sum + m.totalQuantity, 0);
  const totalRestricted = materials.reduce((sum, m) => sum + m.restrictedQuantity, 0);
  const overallRestrictedPercentage = totalInventory > 0 ? (totalRestricted / totalInventory) * 100 : 0;

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
              <h1>🔒 Restricted Materials Analysis</h1>
              <p className="brand-subtitle">Materials with restricted-use stock requiring special handling</p>
            </div>
          </div>
        </div>
      </div>
        
      {/* Analysis Explanation */}
      <div className="stats-section">
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>How Restricted Percentages are Calculated</h3>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Restricted Percentage = (Restricted-Use Stock ÷ Total Quantity) × 100</strong>
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            Each material's restricted percentage shows what portion of its total inventory is restricted for use. 
            Materials are categorized as: <span style={{ color: '#dc2626', fontWeight: 600 }}>High Restriction (&gt;15%)</span>, 
            <span style={{ color: '#d97706', fontWeight: 600 }}>Medium Restriction (5-15%)</span>, or 
            <span style={{ color: '#059669', fontWeight: 600 }}>Low Restriction (&lt;5%)</span> based on their restricted percentage.
          </p>
          <p style={{ marginBottom: 0 }}>
            📋 <strong>Note:</strong> Only materials with restricted stock are shown in this analysis.
          </p>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="stats-section section-spacer">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>Materials with Restricted Stock</h3>
            <p className="stat-value">{totalMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #dc2626' }}>
            <h3>High Restriction (&gt;15%)</h3>
            <p className="stat-value" style={{ color: '#dc2626' }}>{highRestrictedMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #d97706' }}>
            <h3>Medium Restriction (5-15%)</h3>
            <p className="stat-value" style={{ color: '#d97706' }}>{mediumRestrictedMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #059669' }}>
            <h3>Low Restriction (&lt;5%)</h3>
            <p className="stat-value" style={{ color: '#059669' }}>{lowRestrictedMaterials}</p>
          </div>
          <div className="stat-item">
            <h3>Overall Restricted %</h3>
            <p className="stat-value">{overallRestrictedPercentage.toFixed(2)}%</p>
          </div>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="inline-controls-section">
        <div className="inline-controls-container">
          <label style={{ marginRight: '1rem', fontWeight: 600 }}>Filter by Restriction Level:</label>
          <select 
            value={filterLevel} 
            onChange={(e) => setFilterLevel(e.target.value as any)}
            style={{ 
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">All Materials ({totalMaterials})</option>
            <option value="high">High Restriction (&gt;15%) - {highRestrictedMaterials}</option>
            <option value="medium">Medium Restriction (5-15%) - {mediumRestrictedMaterials}</option>
            <option value="low">Low Restriction (&lt;5%) - {lowRestrictedMaterials}</option>
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="stats-section section-spacer">
        <div className="materials-table expanded-table">
          <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('material')} className="sortable">
                Material {sortField === 'material' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('materialDescription')} className="sortable">
                Description {sortField === 'materialDescription' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('totalQuantity')} className="sortable">
                Total Qty {sortField === 'totalQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('restrictedQuantity')} className="sortable">
                Restricted Qty {sortField === 'restrictedQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('unrestrictedQuantity')} className="sortable">
                Unrestricted Qty {sortField === 'unrestrictedQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('restrictedPercentage')} className="sortable">
                Restricted % {sortField === 'restrictedPercentage' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('plantsCount')} className="sortable">
                Plants {sortField === 'plantsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('locationsCount')} className="sortable">
                Locations {sortField === 'locationsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Restriction Level</th>
            </tr>
          </thead>
          <tbody>
            {sortedMaterials.map((material) => {
              const restrictionLevel = getRestrictedLevel(material.restrictedPercentage);
              return (
                <tr key={material.material} className={`restriction-${restrictionLevel}`}>
                  <td className="material-code">{material.material}</td>
                  <td className="material-description" title={material.materialDescription}>
                    {material.materialDescription}
                  </td>
                  <td className="quantity">{formatNumber(material.totalQuantity)}</td>
                  <td className="quantity restricted">{formatNumber(material.restrictedQuantity)}</td>
                  <td className="quantity">{formatNumber(material.unrestrictedQuantity)}</td>
                  <td className={`percentage restriction-${restrictionLevel}`}>
                    {material.restrictedPercentage.toFixed(2)}%
                  </td>
                  <td className="count">{material.plantsCount}</td>
                  <td className="count">{material.locationsCount}</td>
                  <td>
                    <span className={`status-badge ${restrictionLevel === 'high' ? 'status-blocked' : restrictionLevel === 'medium' ? 'status-restricted' : 'status-unrestricted'}`}>
                      {restrictionLevel.charAt(0).toUpperCase() + restrictionLevel.slice(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      {materials.length === 0 && !loading && (
        <div className="no-data-message" style={{ margin: '3rem auto' }}>
          <div className="no-data-icon">📦</div>
          <h3>No Restricted Materials Found</h3>
          <p>All materials in the current inventory have zero restricted-use stock.</p>
        </div>
      )}
    </div>
  );
};

export default RestrictedMaterialsView;