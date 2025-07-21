import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../services/api';
import type { MaterialDetail } from '../types';
import './EnhancedDashboard.css';

interface InTransferMaterialsViewProps {
  onBack?: () => void;
  onMaterialClick?: (material: number) => void;
}

interface InTransferMaterialSummary {
  material: number;
  materialDescription: string;
  totalQuantity: number;
  inTransferQuantity: number;
  unrestrictedQuantity: number;
  inTransferPercentage: number;
  plantsCount: number;
  locationsCount: number;
  plants: string[];
  locations: string[];
}

const InTransferMaterialsView: React.FC<InTransferMaterialsViewProps> = ({ onBack, onMaterialClick }) => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<InTransferMaterialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof InTransferMaterialSummary>('inTransferPercentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    loadInTransferMaterialsSummary();
  }, []);

  const loadInTransferMaterialsSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all materials to create summary
      const result = await inventoryApi.getMaterialDetails({ page: 1, limit: 10000 });
      const allMaterials = result.materials;
      
      // Group by material number and aggregate data
      const materialMap = new Map<number, InTransferMaterialSummary>();
      
      allMaterials.forEach(item => {
        const existing = materialMap.get(item.material);
        if (existing) {
          existing.totalQuantity += item.totalQuantity;
          existing.inTransferQuantity += item.stockInTransfer;
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
            inTransferQuantity: item.stockInTransfer,
            unrestrictedQuantity: item.unrestricted,
            inTransferPercentage: 0, // Will calculate below
            plantsCount: 1,
            locationsCount: 1,
            plants: [item.plant],
            locations: [item.storageLocation]
          });
        }
      });
      
      // Calculate in-transfer percentages and filter only materials with in-transfer stock
      const summaryData = Array.from(materialMap.values())
        .map(material => ({
          ...material,
          inTransferPercentage: material.totalQuantity > 0 
            ? (material.inTransferQuantity / material.totalQuantity) * 100 
            : 0
        }))
        .filter(material => material.inTransferQuantity > 0); // Only show materials with in-transfer stock
      
      setMaterials(summaryData);
    } catch (err) {
      console.error('Error loading in-transfer materials summary:', err);
      setError('Failed to load in-transfer materials summary');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof InTransferMaterialSummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getTransferLevel = (percentage: number): 'high' | 'medium' | 'low' => {
    if (percentage > 50) return 'high';
    if (percentage > 20) return 'medium';
    return 'low';
  };

  const filteredMaterials = materials.filter(material => {
    if (filterLevel === 'all') return true;
    return getTransferLevel(material.inTransferPercentage) === filterLevel;
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
        <p>Analyzing materials in transfer...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={loadInTransferMaterialsSummary} className="retry-button">Retry</button>
      </div>
    );
  }

  const totalMaterials = materials.length;
  const highTransferMaterials = materials.filter(m => getTransferLevel(m.inTransferPercentage) === 'high').length;
  const mediumTransferMaterials = materials.filter(m => getTransferLevel(m.inTransferPercentage) === 'medium').length;
  const lowTransferMaterials = materials.filter(m => getTransferLevel(m.inTransferPercentage) === 'low').length;
  
  const totalInventory = materials.reduce((sum, m) => sum + m.totalQuantity, 0);
  const totalInTransfer = materials.reduce((sum, m) => sum + m.inTransferQuantity, 0);
  const overallTransferPercentage = totalInventory > 0 ? (totalInTransfer / totalInventory) * 100 : 0;

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
              <h1>🔄 In Transfer Materials Analysis</h1>
              <p className="brand-subtitle">Materials currently in transit between locations</p>
            </div>
          </div>
        </div>
      </div>
        
      {/* Analysis Explanation */}
      <div className="stats-section">
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>How In-Transfer Percentages are Calculated</h3>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>In-Transfer Percentage = (Stock in Transfer ÷ Total Quantity) × 100</strong>
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            Each material's in-transfer percentage shows what portion of its total inventory is currently in transit. 
            Materials are categorized as: <span style={{ color: '#dc2626', fontWeight: 600 }}>High Transfer (&gt;50%)</span>, 
            <span style={{ color: '#d97706', fontWeight: 600 }}>Medium Transfer (20-50%)</span>, or 
            <span style={{ color: '#059669', fontWeight: 600 }}>Low Transfer (&lt;20%)</span> based on their transfer percentage.
          </p>
          <p style={{ marginBottom: 0 }}>
            📋 <strong>Note:</strong> Only materials with stock in transfer are shown in this analysis.
          </p>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="stats-section section-spacer">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>Materials In Transfer</h3>
            <p className="stat-value">{totalMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #dc2626' }}>
            <h3>High Transfer (&gt;50%)</h3>
            <p className="stat-value" style={{ color: '#dc2626' }}>{highTransferMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #d97706' }}>
            <h3>Medium Transfer (20-50%)</h3>
            <p className="stat-value" style={{ color: '#d97706' }}>{mediumTransferMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #059669' }}>
            <h3>Low Transfer (&lt;20%)</h3>
            <p className="stat-value" style={{ color: '#059669' }}>{lowTransferMaterials}</p>
          </div>
          <div className="stat-item">
            <h3>Overall Transfer %</h3>
            <p className="stat-value">{overallTransferPercentage.toFixed(2)}%</p>
          </div>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="inline-controls-section">
        <div className="inline-controls-container">
          <label style={{ marginRight: '1rem', fontWeight: 600 }}>Filter by Transfer Level:</label>
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
            <option value="high">High Transfer (&gt;50%) - {highTransferMaterials}</option>
            <option value="medium">Medium Transfer (20-50%) - {mediumTransferMaterials}</option>
            <option value="low">Low Transfer (&lt;20%) - {lowTransferMaterials}</option>
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
              <th onClick={() => handleSort('inTransferQuantity')} className="sortable">
                In Transfer Qty {sortField === 'inTransferQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('unrestrictedQuantity')} className="sortable">
                Unrestricted Qty {sortField === 'unrestrictedQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('inTransferPercentage')} className="sortable">
                Transfer % {sortField === 'inTransferPercentage' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('plantsCount')} className="sortable">
                Plants {sortField === 'plantsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('locationsCount')} className="sortable">
                Locations {sortField === 'locationsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Transfer Level</th>
            </tr>
          </thead>
          <tbody>
            {sortedMaterials.map((material) => {
              const transferLevel = getTransferLevel(material.inTransferPercentage);
              return (
                <tr key={material.material} className={`restriction-${transferLevel}`}>
                  <td className="material-code">{material.material}</td>
                  <td className="material-description" title={material.materialDescription}>
                    {material.materialDescription}
                  </td>
                  <td className="quantity">{formatNumber(material.totalQuantity)}</td>
                  <td className="quantity restricted">{formatNumber(material.inTransferQuantity)}</td>
                  <td className="quantity">{formatNumber(material.unrestrictedQuantity)}</td>
                  <td className={`percentage restriction-${transferLevel}`}>
                    {material.inTransferPercentage.toFixed(2)}%
                  </td>
                  <td className="count">{material.plantsCount}</td>
                  <td className="count">{material.locationsCount}</td>
                  <td>
                    <span className={`status-badge ${transferLevel === 'high' ? 'status-blocked' : transferLevel === 'medium' ? 'status-restricted' : 'status-unrestricted'}`}>
                      {transferLevel.charAt(0).toUpperCase() + transferLevel.slice(1)}
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
          <div className="no-data-icon">🔄</div>
          <h3>No Materials In Transfer</h3>
          <p>All materials in the current inventory have zero stock in transfer.</p>
        </div>
      )}
    </div>
  );
};

export default InTransferMaterialsView;