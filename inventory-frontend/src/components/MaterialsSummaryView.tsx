import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../services/clientApi';
import type { MaterialDetail } from '../types';
import './EnhancedDashboard.css';

interface MaterialsSummaryViewProps {
  onBack: () => void;
  onMaterialClick?: (material: number) => void;
}

interface MaterialSummary {
  material: number;
  materialDescription: string;
  totalQuantity: number;
  blockedQuantity: number;
  unrestrictedQuantity: number;
  blockedPercentage: number;
  plantsCount: number;
  locationsCount: number;
  plants: string[];
  locations: string[];
}

const MaterialsSummaryView: React.FC<MaterialsSummaryViewProps> = ({ onBack, onMaterialClick }) => {
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof MaterialSummary>('blockedPercentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadMaterialsSummary();
  }, []);

  const loadMaterialsSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all materials to create summary
      const result = await inventoryApi.getMaterialDetails({ page: 1, limit: 10000 });
      const allMaterials = result.materials;
      
      // Group by material number and aggregate data
      const materialMap = new Map<number, MaterialSummary>();
      
      allMaterials.forEach(item => {
        const existing = materialMap.get(item.material);
        if (existing) {
          existing.totalQuantity += item.totalQuantity;
          existing.blockedQuantity += item.blocked;
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
            blockedQuantity: item.blocked,
            unrestrictedQuantity: item.unrestricted,
            blockedPercentage: 0, // Will calculate below
            plantsCount: 1,
            locationsCount: 1,
            plants: [item.plant],
            locations: [item.storageLocation]
          });
        }
      });
      
      // Calculate blocked percentages and convert to array
      const summaryData = Array.from(materialMap.values()).map(material => ({
        ...material,
        blockedPercentage: material.totalQuantity > 0 
          ? (material.blockedQuantity / material.totalQuantity) * 100 
          : 0
      }));
      
      setMaterials(summaryData);
    } catch (err) {
      console.error('Error loading materials summary:', err);
      setError('Failed to load materials summary');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof MaterialSummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getBlockedLevel = (percentage: number): 'high' | 'medium' | 'low' => {
    if (percentage > 10) return 'high';
    if (percentage > 2) return 'medium';
    return 'low';
  };

  const searchFilteredMaterials = materials.filter(material => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      material.material.toString().includes(searchLower) ||
      material.materialDescription.toLowerCase().includes(searchLower) ||
      material.plants.some(plant => plant.toLowerCase().includes(searchLower)) ||
      material.locations.some(location => location.toLowerCase().includes(searchLower))
    );
  });

  const filteredMaterials = searchFilteredMaterials.filter(material => {
    if (filterLevel === 'all') return true;
    return getBlockedLevel(material.blockedPercentage) === filterLevel;
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

  // Pagination logic
  const totalPages = Math.ceil(sortedMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMaterials = sortedMaterials.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (newPageSize !== itemsPerPage) {
      setItemsPerPage(newPageSize);
      setCurrentPage(1);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(
        <button key={1} onClick={() => goToPage(1)} className="pagination-button">
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="pagination-ellipsis">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`pagination-button ${currentPage === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="pagination-ellipsis">...</span>);
      }
      pages.push(
        <button key={totalPages} onClick={() => goToPage(totalPages)} className="pagination-button">
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterLevel]);

  const formatNumber = (num: number): string => {
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Analyzing materials and blocked percentages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={loadMaterialsSummary} className="retry-button">Retry</button>
      </div>
    );
  }

  const totalMaterials = materials.length;
  const highBlockedMaterials = materials.filter(m => getBlockedLevel(m.blockedPercentage) === 'high').length;
  const mediumBlockedMaterials = materials.filter(m => getBlockedLevel(m.blockedPercentage) === 'medium').length;
  const lowBlockedMaterials = materials.filter(m => getBlockedLevel(m.blockedPercentage) === 'low').length;
  
  const totalInventory = materials.reduce((sum, m) => sum + m.totalQuantity, 0);
  const totalBlocked = materials.reduce((sum, m) => sum + m.blockedQuantity, 0);
  const overallBlockedPercentage = totalInventory > 0 ? (totalBlocked / totalInventory) * 100 : 0;

  return (
    <div className="dashboard">
      {/* Header Banner */}
      <div className="dashboard-header">
        <div className="brand-header">
          <div className="company-logo">
            <button onClick={onBack} className="back-button" title="Back to Dashboard">
              <span className="sr-only">Back to Dashboard</span>
            </button>
            <div className="brand-text">
              <h1>📋 Materials Summary</h1>
              <p className="brand-subtitle">Comprehensive blocked analysis and risk assessment</p>
            </div>
          </div>
        </div>
      </div>
        
      {/* Analysis Explanation */}
      <div className="stats-section">
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>How Blocked Percentages are Calculated</h3>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Blocked Percentage = (Blocked Quantity ÷ Total Quantity) × 100</strong>
          </p>
          <p style={{ marginBottom: 0 }}>
            Each material's blocked percentage shows what portion of its total inventory is currently blocked. 
            Materials are categorized as: <span style={{ color: '#dc2626', fontWeight: 600 }}>High Risk (&gt;10%)</span>, 
            <span style={{ color: '#d97706', fontWeight: 600 }}>Medium Risk (2-10%)</span>, or 
            <span style={{ color: '#059669', fontWeight: 600 }}>Low Risk (&lt;2%)</span> based on their blocked percentage.
          </p>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="stats-section section-spacer">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>Total Materials</h3>
            <p className="stat-value">{totalMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #dc2626' }}>
            <h3>High Risk (&gt;10%)</h3>
            <p className="stat-value" style={{ color: '#dc2626' }}>{highBlockedMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #d97706' }}>
            <h3>Medium Risk (2-10%)</h3>
            <p className="stat-value" style={{ color: '#d97706' }}>{mediumBlockedMaterials}</p>
          </div>
          <div className="stat-item" style={{ borderLeft: '4px solid #059669' }}>
            <h3>Low Risk (&lt;2%)</h3>
            <p className="stat-value" style={{ color: '#059669' }}>{lowBlockedMaterials}</p>
          </div>
          <div className="stat-item">
            <h3>Overall Blocked %</h3>
            <p className="stat-value">{overallBlockedPercentage.toFixed(2)}%</p>
          </div>
        </div>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="inline-controls-section">
        <div className="inline-controls-container">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input compact"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="clear-search-button"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <select 
            value={filterLevel} 
            onChange={(e) => setFilterLevel(e.target.value as any)}
            style={{ 
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              height: '3rem'
            }}
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk (&gt;10%)</option>
            <option value="medium">Medium Risk (2-10%)</option>
            <option value="low">Low Risk (&lt;2%)</option>
          </select>

          <div className="pagination-controls-inline">
            <select
              value={itemsPerPage}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="page-size-filter compact"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <span className="results-info">
              Showing {paginatedMaterials.length} of {filteredMaterials.length} materials
            </span>
          </div>

          {(searchTerm || filterLevel !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterLevel('all');
              }}
              className="clear-filters-icon-button"
              title="Clear all filters"
            >
              ✖️
            </button>
          )}
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
              <th onClick={() => handleSort('blockedQuantity')} className="sortable">
                Blocked Qty {sortField === 'blockedQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('blockedPercentage')} className="sortable">
                Blocked % {sortField === 'blockedPercentage' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('plantsCount')} className="sortable">
                Plants {sortField === 'plantsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('locationsCount')} className="sortable">
                Locations {sortField === 'locationsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMaterials.map((material) => {
              const riskLevel = getBlockedLevel(material.blockedPercentage);
              return (
                <tr key={material.material} className={`risk-${riskLevel}`}>
                  <td className="material-code">{material.material}</td>
                  <td className="material-description" title={material.materialDescription}>
                    {material.materialDescription}
                  </td>
                  <td className="quantity">{formatNumber(material.totalQuantity)}</td>
                  <td className="quantity blocked">{formatNumber(material.blockedQuantity)}</td>
                  <td className={`percentage risk-${riskLevel}`}>
                    {material.blockedPercentage.toFixed(2)}%
                  </td>
                  <td className="count">{material.plantsCount}</td>
                  <td className="count">{material.locationsCount}</td>
                  <td>
                    <span className={`status-badge ${riskLevel === 'high' ? 'status-blocked' : riskLevel === 'medium' ? 'status-restricted' : 'status-unrestricted'}`}>
                      {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="pagination-button"
              title="First page"
            >
              ««
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-button"
              title="Previous page"
            >
              ‹
            </button>
            
            <div className="pagination-numbers">
              {renderPageNumbers()}
            </div>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-button"
              title="Next page"
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-button"
              title="Last page"
            >
              ››
            </button>
          </div>
          
          <div className="pagination-info">
            <span>Page {currentPage} of {totalPages}</span>
            <span className="pagination-total">({filteredMaterials.length} total items)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsSummaryView;