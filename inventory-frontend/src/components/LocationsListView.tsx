import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../services/clientApi';
import type { LocationStats } from '../types';
import './EnhancedDashboard.css';

interface LocationsListViewProps {
  onBack?: () => void;
  onLocationClick?: (location: string) => void;
}

const LocationsListView: React.FC<LocationsListViewProps> = ({ onBack, onLocationClick }) => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<LocationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof LocationStats>('totalQuantity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const locationsData = await inventoryApi.getLocationStats();
      setLocations(locationsData);
    } catch (err) {
      console.error('Error loading locations:', err);
      setError('Failed to load locations data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof LocationStats) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedLocations = [...locations].sort((a, b) => {
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

  const calculateBlockedPercentage = (blocked: number, total: number): number => {
    return total > 0 ? (blocked / total) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading locations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={loadLocations} className="retry-button">Retry</button>
      </div>
    );
  }

  const totalInventory = locations.reduce((sum, location) => sum + location.totalQuantity, 0);
  const totalBlocked = locations.reduce((sum, location) => sum + location.blockedQuantity, 0);
  const overallBlockedPercentage = calculateBlockedPercentage(totalBlocked, totalInventory);

  return (
    <div className="dashboard">
      {/* Header Banner */}
      <div className="dashboard-header">
        <div className="brand-header">
          <div className="company-logo">
            <button onClick={onBack || (() => navigate('/'))} className="back-button" title="Back to Dashboard">
              <span className="sr-only">Back to Dashboard</span>
            </button>
            <div className="brand-text">
              <h1>📍 All Storage Locations</h1>
              <p className="brand-subtitle">Analyze stock distribution across warehouse locations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>Total Locations</h3>
            <p className="stat-value">{locations.length}</p>
          </div>
          <div className="stat-item">
            <h3>Total Inventory</h3>
            <p className="stat-value">{formatNumber(totalInventory)}</p>
          </div>
          <div className="stat-item">
            <h3>Total Blocked</h3>
            <p className="stat-value">{formatNumber(totalBlocked)}</p>
          </div>
          <div className="stat-item">
            <h3>Overall Blocked %</h3>
            <p className="stat-value">{overallBlockedPercentage.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      {/* Locations Table */}
      <div className="stats-section section-spacer">
        <div className="materials-table expanded-table">
          <table className="locations-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('storageLocation')} className="sortable">
                Location {sortField === 'storageLocation' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('totalQuantity')} className="sortable">
                Total Quantity {sortField === 'totalQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('unrestrictedQuantity')} className="sortable">
                Unrestricted {sortField === 'unrestrictedQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('blockedQuantity')} className="sortable">
                Blocked {sortField === 'blockedQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Blocked %</th>
              <th onClick={() => handleSort('materialCount')} className="sortable">
                Materials {sortField === 'materialCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedLocations.map((location) => {
              const blockedPercentage = calculateBlockedPercentage(location.blockedQuantity, location.totalQuantity);
              return (
                <tr key={location.storageLocation}>
                  <td className="location-code">{location.storageLocation}</td>
                  <td className="quantity">{formatNumber(location.totalQuantity)}</td>
                  <td className="quantity">{formatNumber(location.unrestrictedQuantity)}</td>
                  <td className="quantity blocked">{formatNumber(location.blockedQuantity)}</td>
                  <td className={`percentage ${blockedPercentage > 5 ? 'high-blocked' : blockedPercentage > 2 ? 'medium-blocked' : 'low-blocked'}`}>
                    {blockedPercentage.toFixed(2)}%
                  </td>
                  <td className="count">{location.materialCount}</td>
                  <td>
                    <button 
                      onClick={() => {
                        if (onLocationClick) {
                          onLocationClick(location.storageLocation);
                        } else {
                          navigate(`/locations/${encodeURIComponent(location.storageLocation)}`);
                        }
                      }}
                      className="action-button materials"
                    >
                      View Materials
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LocationsListView;