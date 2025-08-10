import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { MaterialDetail } from '../types';
import { inventoryApi } from '../services/clientApi';
import './MaterialDetails.css';
import './EnhancedDashboard.css';

interface RouterMaterialDetailsProps {
  filters?: {
    plant?: string;
    storageLocation?: string;
    status?: string;
  };
  title?: string;
  showBlockedOnly?: boolean;
  showUnrestrictedOnly?: boolean;
  showTotalInventory?: boolean;
}

const RouterMaterialDetails: React.FC<RouterMaterialDetailsProps> = ({ 
  filters = {}, 
  title = "Material Details", 
  showBlockedOnly = false,
  showUnrestrictedOnly = false,
  showTotalInventory = false
}) => {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [materials, setMaterials] = useState<MaterialDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [plantFilter, setPlantFilter] = useState<string>(searchParams.get('plant') || 'all');
  const [locationFilter, setLocationFilter] = useState<string>(searchParams.get('location') || 'all');
  const [availablePlants, setAvailablePlants] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof MaterialDetail>('material');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [total, setTotal] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.get('limit') || '20'));
  
  // Flag to prevent URL updates during initial state loading
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Flag to track if we're in the middle of a page change
  const isChangingPage = useRef(false);

  // Update filters based on URL parameters - avoid filters dependency
  useEffect(() => {
    // Skip state updates if we're in the middle of a page change to prevent flicker
    if (isChangingPage.current) {
      isChangingPage.current = false; // Reset flag
      return;
    }
    
    // Get plant/location from URL path parameters
    const pathPlant = params.plantId ? decodeURIComponent(params.plantId) : null;
    const pathLocation = params.locationId ? decodeURIComponent(params.locationId) : null;
    
    // Update state from URL search parameters, with path params taking precedence
    const newSearchTerm = searchParams.get('search') || '';
    const newStatusFilter = searchParams.get('status') || 'all';
    const newPlantFilter = searchParams.get('plant') || pathPlant || 'all';
    const newLocationFilter = searchParams.get('location') || pathLocation || 'all';
    const newCurrentPage = parseInt(searchParams.get('page') || '1');
    const newItemsPerPage = parseInt(searchParams.get('limit') || '20');
    
    // Only update state if values actually changed to prevent loops
    if (searchTerm !== newSearchTerm) setSearchTerm(newSearchTerm);
    if (statusFilter !== newStatusFilter) setStatusFilter(newStatusFilter);
    if (plantFilter !== newPlantFilter) setPlantFilter(newPlantFilter);
    if (locationFilter !== newLocationFilter) setLocationFilter(newLocationFilter);
    if (currentPage !== newCurrentPage) setCurrentPage(newCurrentPage);
    if (itemsPerPage !== newItemsPerPage) setItemsPerPage(newItemsPerPage);
    
    // Mark as initialized after first load
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [params.plantId, params.locationId, searchParams]);

  // URL parameter updates - only after initialization to prevent loops
  useEffect(() => {
    // Skip URL updates during initial load
    if (!isInitialized) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      const newSearchParams = new URLSearchParams();
      
      if (searchTerm) newSearchParams.set('search', searchTerm);
      if (statusFilter !== 'all') newSearchParams.set('status', statusFilter);
      if (plantFilter !== 'all') newSearchParams.set('plant', plantFilter);
      if (locationFilter !== 'all') newSearchParams.set('location', locationFilter);
      if (currentPage > 1) newSearchParams.set('page', currentPage.toString());
      if (itemsPerPage !== 20) newSearchParams.set('limit', itemsPerPage.toString());
      
      // Only update if different to avoid unnecessary re-renders
      const currentSearch = searchParams.toString();
      const newSearch = newSearchParams.toString();
      
      if (currentSearch !== newSearch) {
        setSearchParams(newSearchParams, { replace: true });
      }
    }, 50); // Small delay to debounce URL updates
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, plantFilter, locationFilter, currentPage, itemsPerPage, isInitialized]);

  // Single effect for data loading - handles all scenarios
  useEffect(() => {
    let loadType: 'initial' | 'filter' | 'search' | 'pagination' = 'initial';
    
    // Determine load type based on what changed
    if (params.plantId || params.locationId) {
      loadType = 'initial';
    } else {
      loadType = 'filter';
    }
    
    loadMaterials(loadType);
  }, [params.plantId, params.locationId, currentPage, statusFilter, itemsPerPage, plantFilter, locationFilter]);

  // Separate effect for search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Reset to page 1 if searching and not already on page 1
      if (currentPage !== 1) {
        setCurrentPage(1); // This will trigger the main effect above
      } else {
        loadMaterials('search');
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Reset page to 1 when filters change (but not when page itself changes)
  const prevFilters = useRef({ statusFilter, plantFilter, locationFilter, itemsPerPage });
  useEffect(() => {
    const prev = prevFilters.current;
    const filtersChanged = prev.statusFilter !== statusFilter || 
                          prev.plantFilter !== plantFilter || 
                          prev.locationFilter !== locationFilter || 
                          prev.itemsPerPage !== itemsPerPage;
    
    if (filtersChanged && currentPage !== 1) {
      setCurrentPage(1);
    }
    
    // Update ref
    prevFilters.current = { statusFilter, plantFilter, locationFilter, itemsPerPage };
  }, [statusFilter, plantFilter, locationFilter, itemsPerPage, currentPage]);

  // Add loading state management
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const loadMaterials = async (loadType: 'initial' | 'filter' | 'search' | 'pagination' = 'initial') => {
    try {
      // Prevent multiple simultaneous loads
      if (isLoadingData && loadType !== 'initial') {
        return;
      }
      
      setIsLoadingData(true);
      
      if (loadType === 'initial') {
        setLoading(true);
      }
      
      setError(null);

      let result;
      
      // Build API filters based on current state (capture at call time)
      const currentFilters = {
        ...filters,
        page: loadType === 'search' ? 1 : currentPage,
        limit: itemsPerPage,
        ...(searchTerm && searchTerm.trim() && { search: searchTerm.trim() }),
        ...(plantFilter !== 'all' && { plant: plantFilter }),
        ...(locationFilter !== 'all' && { storageLocation: locationFilter }),
      };

      // Add status filter based on view mode
      if (showBlockedOnly) {
        currentFilters.status = 'blocked';
      } else if (showUnrestrictedOnly) {
        currentFilters.status = 'unrestricted';
      } else if (statusFilter !== 'all') {
        currentFilters.status = statusFilter;
      }

      // Add URL param filters (these take precedence)
      if (params.plantId) {
        currentFilters.plant = decodeURIComponent(params.plantId);
      }
      if (params.locationId) {
        currentFilters.storageLocation = decodeURIComponent(params.locationId);
      }

      console.log(`Loading materials (${loadType}):`, currentFilters);
      
      result = await inventoryApi.getMaterialDetails(currentFilters);

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
      setIsLoadingData(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
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

  const goToPage = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      isChangingPage.current = true;
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

  const totalPages = Math.ceil(total / itemsPerPage);

  if (loading && materials.length === 0) {
    return (
      <div className="dashboard-loading">
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

  // Dynamic title based on URL params
  let pageTitle = title;
  if (params.plantId) {
    pageTitle = `Materials in Plant: ${decodeURIComponent(params.plantId)}`;
  } else if (params.locationId) {
    pageTitle = `Materials in Location: ${decodeURIComponent(params.locationId)}`;
  }

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
              <h1>
                {showTotalInventory ? '📦 Total Inventory' : 
                 showBlockedOnly ? '🚫 Blocked Materials' :
                 showUnrestrictedOnly ? '✅ Unrestricted Materials' :
                 params.plantId ? `🏭 Plant: ${decodeURIComponent(params.plantId)}` :
                 params.locationId ? `📍 Location: ${decodeURIComponent(params.locationId)}` :
                 '📋 Material Details'}
                {loading && materials.length > 0 && (
                  <span className="loading-indicator"> (refreshing...)</span>
                )}
              </h1>
              <p className="brand-subtitle">
                {showTotalInventory ? 'Complete inventory with advanced filtering and search' :
                 showBlockedOnly ? 'Materials with blocked stock requiring attention' :
                 showUnrestrictedOnly ? 'Available materials for use and distribution' :
                 params.plantId ? `Materials located in plant ${decodeURIComponent(params.plantId)}` :
                 params.locationId ? `Materials stored in location ${decodeURIComponent(params.locationId)}` :
                 'Detailed material information and analytics'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Controls Section */}
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

          {showTotalInventory && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter compact"
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
            className="plant-filter compact"
          >
            <option value="all">All Plants</option>
            {availablePlants.map(plant => (
              <option key={plant} value={plant}>{plant}</option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="location-filter compact"
          >
            <option value="all">All Locations</option>
            {availableLocations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
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
              Showing {materials.length} of {total.toLocaleString()} materials
            </span>
          </div>

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
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-controls">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="pagination-button"
              title="First page"
            >
              ««
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
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
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-button"
              title="Next page"
            >
              ›
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-button"
              title="Last page"
            >
              ››
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

export default RouterMaterialDetails;