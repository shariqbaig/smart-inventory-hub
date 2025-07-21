import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../services/api';
import type { PlantStats } from '../types';
import './EnhancedDashboard.css';

interface PlantsListViewProps {
  onBack?: () => void;
  onPlantClick?: (plant: string) => void;
}

const PlantsListView: React.FC<PlantsListViewProps> = ({ onBack, onPlantClick }) => {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<PlantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof PlantStats>('totalQuantity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      setLoading(true);
      setError(null);
      const plantsData = await inventoryApi.getPlantStats();
      setPlants(plantsData);
    } catch (err) {
      console.error('Error loading plants:', err);
      setError('Failed to load plants data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof PlantStats) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedPlants = [...plants].sort((a, b) => {
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
        <p>Loading plants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={loadPlants} className="retry-button">Retry</button>
      </div>
    );
  }

  const totalInventory = plants.reduce((sum, plant) => sum + plant.totalQuantity, 0);
  const totalBlocked = plants.reduce((sum, plant) => sum + plant.blockedQuantity, 0);
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
              <h1>🏭 All Plants Summary</h1>
              <p className="brand-subtitle">Track inventory across all manufacturing facilities</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>Total Plants</h3>
            <p className="stat-value">{plants.length}</p>
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

      {/* Plants Table */}
      <div className="stats-section section-spacer">
        <div className="materials-table expanded-table">
          <table className="plants-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('plant')} className="sortable">
                Plant {sortField === 'plant' && (sortDirection === 'asc' ? '↑' : '↓')}
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
              <th>Locations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlants.map((plant) => {
              const blockedPercentage = calculateBlockedPercentage(plant.blockedQuantity, plant.totalQuantity);
              return (
                <tr key={plant.plant}>
                  <td className="plant-code">{plant.plant}</td>
                  <td className="quantity">{formatNumber(plant.totalQuantity)}</td>
                  <td className="quantity">{formatNumber(plant.unrestrictedQuantity)}</td>
                  <td className="quantity blocked">{formatNumber(plant.blockedQuantity)}</td>
                  <td className={`percentage ${blockedPercentage > 5 ? 'high-blocked' : blockedPercentage > 2 ? 'medium-blocked' : 'low-blocked'}`}>
                    {blockedPercentage.toFixed(2)}%
                  </td>
                  <td className="count">{plant.materialCount}</td>
                  <td className="locations">{plant.locations.join(', ')}</td>
                  <td>
                    <button 
                      onClick={() => {
                        if (onPlantClick) {
                          onPlantClick(plant.plant);
                        } else {
                          navigate(`/plants/${encodeURIComponent(plant.plant)}`);
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

export default PlantsListView;