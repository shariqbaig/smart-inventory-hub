import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../services/api';
import type { MaterialDetail } from '../types';
import './EnhancedDashboard.css';

interface QualityInspectionMaterialsViewProps {
  onBack?: () => void;
  onMaterialClick?: (material: number) => void;
}

interface QualityInspectionMaterialSummary {
  material: number;
  materialDescription: string;
  totalQuantity: number;
  qualityInspectionQuantity: number;
  unrestrictedQuantity: number;
  qualityInspectionPercentage: number;
  plantsCount: number;
  locationsCount: number;
  plants: string[];
  locations: string[];
}

const QualityInspectionMaterialsView: React.FC<QualityInspectionMaterialsViewProps> = ({ onBack, onMaterialClick }) => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<QualityInspectionMaterialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof QualityInspectionMaterialSummary>('qualityInspectionPercentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    loadQualityInspectionMaterialsSummary();
  }, []);

  const loadQualityInspectionMaterialsSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all materials to create summary
      const result = await inventoryApi.getMaterialDetails({ page: 1, limit: 10000 });
      const allMaterials = result.materials;
      
      // Group by material number and aggregate data
      const materialMap = new Map<number, QualityInspectionMaterialSummary>();
      
      allMaterials.forEach(item => {
        const existing = materialMap.get(item.material);
        if (existing) {
          existing.totalQuantity += item.totalQuantity;
          existing.qualityInspectionQuantity += item.inQualityInsp;
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
            qualityInspectionQuantity: item.inQualityInsp,
            unrestrictedQuantity: item.unrestricted,
            qualityInspectionPercentage: 0, // Will calculate below
            plantsCount: 1,
            locationsCount: 1,
            plants: [item.plant],
            locations: [item.storageLocation]
          });
        }
      });
      
      // Calculate quality inspection percentages and filter only materials with quality inspection stock
      const summaryData = Array.from(materialMap.values())
        .map(material => ({
          ...material,
          qualityInspectionPercentage: material.totalQuantity > 0 
            ? (material.qualityInspectionQuantity / material.totalQuantity) * 100 
            : 0
        }))
        .filter(material => material.qualityInspectionQuantity > 0); // Only show materials with quality inspection stock
      
      setMaterials(summaryData);
    } catch (err) {
      console.error('Error loading quality inspection materials summary:', err);
      setError('Failed to load quality inspection materials summary');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof QualityInspectionMaterialSummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getInspectionLevel = (percentage: number): 'high' | 'medium' | 'low' => {
    if (percentage > 30) return 'high';
    if (percentage > 10) return 'medium';
    return 'low';
  };

  const filteredMaterials = materials.filter(material => {
    if (filterLevel === 'all') return true;
    return getInspectionLevel(material.qualityInspectionPercentage) === filterLevel;
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
        <p>Analyzing materials in quality inspection...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={loadQualityInspectionMaterialsSummary} className="retry-button">Retry</button>
      </div>
    );
  }

  const totalMaterials = materials.length;
  const highInspectionMaterials = materials.filter(m => getInspectionLevel(m.qualityInspectionPercentage) === 'high').length;
  const mediumInspectionMaterials = materials.filter(m => getInspectionLevel(m.qualityInspectionPercentage) === 'medium').length;
  const lowInspectionMaterials = materials.filter(m => getInspectionLevel(m.qualityInspectionPercentage) === 'low').length;
  
  const totalInventory = materials.reduce((sum, m) => sum + m.totalQuantity, 0);
  const totalInInspection = materials.reduce((sum, m) => sum + m.qualityInspectionQuantity, 0);
  const overallInspectionPercentage = totalInventory > 0 ? (totalInInspection / totalInventory) * 100 : 0;

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
              <h1>🔍 Quality Inspection Materials Analysis</h1>
              <p className="brand-subtitle">Materials currently undergoing quality inspection</p>
            </div>
          </div>
        </div>
      </div>
        
      {/* Analysis Explanation */}
      <div className="stats-section">
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>How Quality Inspection Percentages are Calculated</h3>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Quality Inspection Percentage = (In Quality Inspection Stock ÷ Total Quantity) × 100</strong>
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            Each material's quality inspection percentage shows what portion of its total inventory is currently undergoing quality checks. 
            Materials are categorized as: <span style={{ color: '#dc2626', fontWeight: 600 }}>High Inspection (&gt;30%)</span>, 
            <span style={{ color: '#d97706', fontWeight: 600 }}>Medium Inspection (10-30%)</span>, or 
            <span style={{ color: '#059669', fontWeight: 600 }}>Low Inspection (&lt;10%)</span> based on their inspection percentage.
          </p>
          <p style={{ marginBottom: 0 }}>
            📋 <strong>Note:</strong> Only materials with stock in quality inspection are shown in this analysis.
          </p>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="stats-section section-spacer">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>Materials In Inspection</h3>
            <p className="stat-value">{totalMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #dc2626' }}>
            <h3>High Inspection (&gt;30%)</h3>
            <p className="stat-value" style={{ color: '#dc2626' }}>{highInspectionMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #d97706' }}>
            <h3>Medium Inspection (10-30%)</h3>
            <p className="stat-value" style={{ color: '#d97706' }}>{mediumInspectionMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #059669' }}>
            <h3>Low Inspection (&lt;10%)</h3>
            <p className="stat-value" style={{ color: '#059669' }}>{lowInspectionMaterials}</p>
          </div>
          <div className="stat-item">
            <h3>Overall Inspection %</h3>
            <p className="stat-value">{overallInspectionPercentage.toFixed(2)}%</p>
          </div>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="inline-controls-section">
        <div className="inline-controls-container">
          <label style={{ marginRight: '1rem', fontWeight: 600 }}>Filter by Inspection Level:</label>
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
            <option value="high">High Inspection (&gt;30%) - {highInspectionMaterials}</option>
            <option value="medium">Medium Inspection (10-30%) - {mediumInspectionMaterials}</option>
            <option value="low">Low Inspection (&lt;10%) - {lowInspectionMaterials}</option>
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
              <th onClick={() => handleSort('qualityInspectionQuantity')} className="sortable">
                In Inspection Qty {sortField === 'qualityInspectionQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('unrestrictedQuantity')} className="sortable">
                Unrestricted Qty {sortField === 'unrestrictedQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('qualityInspectionPercentage')} className="sortable">
                Inspection % {sortField === 'qualityInspectionPercentage' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('plantsCount')} className="sortable">
                Plants {sortField === 'plantsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('locationsCount')} className="sortable">
                Locations {sortField === 'locationsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Inspection Level</th>
            </tr>
          </thead>
          <tbody>
            {sortedMaterials.map((material) => {
              const inspectionLevel = getInspectionLevel(material.qualityInspectionPercentage);
              return (
                <tr key={material.material} className={`restriction-${inspectionLevel}`}>
                  <td className="material-code">{material.material}</td>
                  <td className="material-description" title={material.materialDescription}>
                    {material.materialDescription}
                  </td>
                  <td className="quantity">{formatNumber(material.totalQuantity)}</td>
                  <td className="quantity restricted">{formatNumber(material.qualityInspectionQuantity)}</td>
                  <td className="quantity">{formatNumber(material.unrestrictedQuantity)}</td>
                  <td className={`percentage restriction-${inspectionLevel}`}>
                    {material.qualityInspectionPercentage.toFixed(2)}%
                  </td>
                  <td className="count">{material.plantsCount}</td>
                  <td className="count">{material.locationsCount}</td>
                  <td>
                    <span className={`status-badge ${inspectionLevel === 'high' ? 'status-blocked' : inspectionLevel === 'medium' ? 'status-restricted' : 'status-unrestricted'}`}>
                      {inspectionLevel.charAt(0).toUpperCase() + inspectionLevel.slice(1)}
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
          <div className="no-data-icon">🔍</div>
          <h3>No Materials In Quality Inspection</h3>
          <p>All materials in the current inventory have zero stock in quality inspection.</p>
        </div>
      )}
    </div>
  );
};

export default QualityInspectionMaterialsView;