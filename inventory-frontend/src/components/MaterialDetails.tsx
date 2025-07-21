import React, { useState, useEffect } from 'react';
import type { MaterialDetail } from '../types';
import { inventoryApi } from '../services/clientApi';
import './MaterialDetails.css';

interface MaterialDetailsProps {
  filters?: {
    plant?: string;
    storageLocation?: string;
    status?: string;
  };
  title?: string;
  onBack?: () => void;
  showBlockedOnly?: boolean;
  showUnrestrictedOnly?: boolean;
  showTotalInventory?: boolean;
}

const MaterialDetails: React.FC<MaterialDetailsProps> = ({ 
  filters = {}, 
  title = "Material Details", 
  onBack,
  showBlockedOnly = false,
  showUnrestrictedOnly = false,
  showTotalInventory = false
}) => {
  const [materials, setMaterials] = useState<MaterialDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [plantFilter, setPlantFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [availablePlants, setAvailablePlants] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof MaterialDetail>('material');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Load materials when any filter changes (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const loadType = searchTerm ? 'search' : currentPage > 1 ? 'pagination' : 'filter';
      loadMaterials(loadType);
    }, searchTerm ? 300 : 0); // Only debounce if there's a search term

    return () => clearTimeout(timeoutId);
  }, [filters, currentPage, statusFilter, itemsPerPage, searchTerm]);

  // Reset to first page when search or filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, statusFilter, plantFilter, locationFilter, itemsPerPage]);

  const loadMaterials = async (loadType: 'initial' | 'filter' | 'search' | 'pagination' = 'initial') => {
    try {
      // Different loading states for different operations
      if (loadType === 'initial') {
        setLoading(true);
      } else if (loadType === 'search') {
        setIsSearching(true);
      }
      // Don't show full loading for pagination or filters to avoid jarring effect
      
      setError(null);

      let result;
      
      // Build common API filters
      const apiFilters = {
        ...filters,
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm && searchTerm.trim() && { search: searchTerm.trim() }),
        ...(plantFilter !== 'all' && { plant: plantFilter }),
        ...(locationFilter !== 'all' && { storageLocation: locationFilter }),
      };

      // Add status filter based on view mode
      if (showBlockedOnly) {
        apiFilters.status = 'blocked';
      } else if (showUnrestrictedOnly) {
        apiFilters.status = 'unrestricted';
      } else if (statusFilter !== 'all') {
        apiFilters.status = statusFilter;
      }

      // console.log('Loading materials with filters:', apiFilters);
      
      if (showBlockedOnly && !searchTerm && statusFilter === 'all') {
        // Use the specialized blocked materials endpoint only if no search/status filter
        const blockedMaterials = await inventoryApi.getBlockedMaterials();
        result = { materials: blockedMaterials, total: blockedMaterials.length };
      } else {
        result = await inventoryApi.getMaterialDetails(apiFilters);
      }

      setMaterials(result.materials || []);
      setTotal(result.total || result.materials?.length || 0);
      
      // Extract unique plants and locations for filter dropdowns
      if (result.materials && result.materials.length > 0) {
        const plants = [...new Set(result.materials.map(m => m.plant))].sort();
        const locations = [...new Set(result.materials.map(m => m.storageLocation))].sort();
        setAvailablePlants(plants);
        setAvailableLocations(locations);
      }
    } catch (err) {
      console.error('Error loading materials:', err);
      setError('Failed to load materials');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadMaterials();
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (newPageSize !== itemsPerPage) {
      setItemsPerPage(newPageSize);
      setCurrentPage(1);
    }
  };

  const goToPage = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
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

  const handleSort = (field: keyof MaterialDetail) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedMaterials = [...materials].sort((a, b) => {
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

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      blocked: 'status-blocked',
      unrestricted: 'status-unrestricted',
      restricted: 'status-restricted',
      'in-transfer': 'status-transfer',
      'quality-inspection': 'status-quality'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status as keyof typeof statusClasses] || ''}`}>
        {status.replace('-', ' ')}
      </span>
    );
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  if (loading) {
    return (
      <div className="material-details-loading">
        <div className="loading-spinner"></div>
        <p>Loading materials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="material-details-error">
        <p>Error: {error}</p>
        <button onClick={() => loadMaterials()} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="material-details">
      <div className="material-details-header">
        <div className="header-top">
          {onBack && (
            <button onClick={onBack} className="back-button" title="Back to Dashboard">
              <span className="sr-only">Back to Dashboard</span>
            </button>
          )}
          <h2>{title}</h2>
        </div>
        
        {filters.plant && (
          <div className="filter-info">
            Showing materials for Plant: <strong>{filters.plant}</strong>
          </div>
        )}
        
        {filters.storageLocation && (
          <div className="filter-info">
            Showing materials for Location: <strong>{filters.storageLocation}</strong>
          </div>
        )}
        
        {showBlockedOnly && (
          <div className="filter-info">
            Showing only <strong>blocked materials</strong>
          </div>
        )}
        
        {showUnrestrictedOnly && (
          <div className="filter-info">
            Showing only <strong>unrestricted materials</strong>
          </div>
        )}
        
        {showTotalInventory && (
          <div className="filter-info">
            Showing <strong>all materials</strong> (use status filter to narrow down)
          </div>
        )}
      </div>

      <div className="material-controls">
        <div className="controls-row">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search materials by description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`search-input ${isSearching ? 'searching' : ''}`}
            />
            {isSearching && (
              <div className="search-loading-indicator">
                <div className="mini-spinner"></div>
              </div>
            )}
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

          <div className="filter-controls">
            {/* Only show status filter on total inventory view */}
            {showTotalInventory && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter"
              >
                <option value="all">All Statuses</option>
                <option value="blocked">Blocked</option>
                <option value="unrestricted">Unrestricted</option>
                <option value="restricted">Restricted</option>
                <option value="in-transfer">In Transfer</option>
                <option value="quality-inspection">Quality Inspection</option>
              </select>
            )}

            <select
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value)}
              className="plant-filter"
            >
              <option value="all">All Plants</option>
              {availablePlants.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="location-filter"
            >
              <option value="all">All Locations</option>
              {availableLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="page-size-filter"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>

      <div className="material-summary">
        <div className="summary-info">
          <p>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} materials
            {searchTerm && (
              <span className="search-indicator"> (filtered by: "{searchTerm}")</span>
            )}
            {showTotalInventory && statusFilter !== 'all' && (
              <span className="filter-indicator"> (status: {statusFilter})</span>
            )}
            {plantFilter !== 'all' && (
              <span className="filter-indicator"> (plant: {plantFilter})</span>
            )}
            {locationFilter !== 'all' && (
              <span className="filter-indicator"> (location: {locationFilter})</span>
            )}
          </p>
        </div>
        <div className="summary-actions">
          {(searchTerm || (showTotalInventory && statusFilter !== 'all') || plantFilter !== 'all' || locationFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPlantFilter('all');
                setLocationFilter('all');
                if (showTotalInventory) {
                  setStatusFilter('all');
                }
              }}
              className="clear-filters-button"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      <div className="material-table-container" style={{ position: 'relative' }}>
        {isSearching && (
          <div className="table-loading-indicator">
            <div className="mini-spinner"></div>
            <span>Searching...</span>
          </div>
        )}
        <table className={`material-table ${isSearching ? 'loading-overlay' : ''}`}>
          <thead>
            <tr>
              <th onClick={() => handleSort('material')} className="sortable">
                Material {sortField === 'material' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('materialDescription')} className="sortable">
                Description {sortField === 'materialDescription' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('plant')} className="sortable">
                Plant {sortField === 'plant' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('storageLocation')} className="sortable">
                Location {sortField === 'storageLocation' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('totalQuantity')} className="sortable">
                Total Qty {sortField === 'totalQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('unrestricted')} className="sortable">
                Unrestricted {sortField === 'unrestricted' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('blocked')} className="sortable">
                Blocked {sortField === 'blocked' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Status</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {sortedMaterials.map((material, index) => (
              <tr key={`${material.material}-${material.plant}-${material.storageLocation}-${index}`}>
                <td className="material-code">{material.material}</td>
                <td className="material-description" title={material.materialDescription}>
                  {material.materialDescription}
                </td>
                <td>{material.plant}</td>
                <td>{material.storageLocation}</td>
                <td className="quantity">{formatNumber(material.totalQuantity)}</td>
                <td className="quantity">{formatNumber(material.unrestricted)}</td>
                <td className="quantity blocked">{formatNumber(material.blocked)}</td>
                <td>{getStatusBadge(material.status)}</td>
                <td>{material.baseUnitOfMeasure}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
              »»
            </button>
          </div>
          
          <div className="pagination-info">
            <span>Page {currentPage} of {totalPages}</span>
            <span className="pagination-total">({total} total items)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialDetails;