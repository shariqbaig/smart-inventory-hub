import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import KpiCard from './KpiCard';
import MaterialDetails from './MaterialDetails';
import PlantsListView from './PlantsListView';
import LocationsListView from './LocationsListView';
import MaterialsSummaryView from './MaterialsSummaryView';
import DataRequirementsView from './DataRequirementsView';
import type { InventoryMetrics, LocationStats, PlantStats } from '../types';
import { inventoryApi } from '../services/clientApi';
import './EnhancedDashboard.css';

type ViewMode = 'dashboard' | 'location-drill' | 'plant-drill' | 'blocked-materials' | 'unrestricted-materials' | 'total-inventory' | 'total-plants' | 'total-locations' | 'materials-summary' | 'data-requirements';

interface DrillDownState {
  mode: ViewMode;
  filters: {
    plant?: string;
    storageLocation?: string;
    status?: string;
  };
  title: string;
}

const CompleteDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [plantStats, setPlantStats] = useState<PlantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [currentView, setCurrentView] = useState<DrillDownState>({
    mode: 'dashboard',
    filters: {},
    title: 'Dashboard'
  });

  // Brand colors for charts
  const COLORS = ['#0F4C8C', '#00A651', '#FFE600', '#FF6900', '#E60026', '#1A5AA0'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [metricsData, locationsData, plantsData] = await Promise.all([
        inventoryApi.getMetrics(),
        inventoryApi.getLocationStats(),
        inventoryApi.getPlantStats(),
      ]);
      
      setMetrics(metricsData);
      setLocationStats(locationsData);
      setPlantStats(plantsData);
      setUsingMockData(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationClick = (data: any) => {
    const location = data.storageLocation;
    setCurrentView({
      mode: 'location-drill',
      filters: { storageLocation: location },
      title: `Materials in Location: ${location}`
    });
  };

  const handlePlantClick = (data: any) => {
    const plant = data.plant;
    setCurrentView({
      mode: 'plant-drill',
      filters: { plant: plant },
      title: `Materials in Plant: ${plant}`
    });
  };

  const handleBlockedClick = () => {
    setCurrentView({
      mode: 'blocked-materials',
      filters: { status: 'blocked' },
      title: 'Blocked Materials'
    });
  };

  const handleUnrestrictedClick = () => {
    setCurrentView({
      mode: 'unrestricted-materials',
      filters: { status: 'unrestricted' },
      title: 'Unrestricted Materials'
    });
  };

  const handleTotalInventoryClick = () => {
    setCurrentView({
      mode: 'total-inventory',
      filters: {},
      title: 'Total Inventory - All Materials'
    });
  };

  const handleTotalPlantsClick = () => {
    setCurrentView({
      mode: 'total-plants',
      filters: {},
      title: 'All Plants Summary'
    });
  };

  const handleTotalLocationsClick = () => {
    setCurrentView({
      mode: 'total-locations',
      filters: {},
      title: 'All Locations Summary'
    });
  };

  const handleMaterialsSummaryClick = () => {
    setCurrentView({
      mode: 'materials-summary',
      filters: {},
      title: 'Materials Summary with Blocked Analysis'
    });
  };

  const handleDataRequirementsClick = () => {
    setCurrentView({
      mode: 'data-requirements',
      filters: {},
      title: 'Excel Data Requirements'
    });
  };

  const handleBackToDashboard = () => {
    setCurrentView({
      mode: 'dashboard',
      filters: {},
      title: 'Dashboard'
    });
  };

  const handleLocationBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      handleLocationClick(data.activePayload[0].payload);
    }
  };

  const handlePlantPieClick = (data: any, index: number) => {
    if (data) {
      handlePlantClick(data);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="dashboard-error">
        <p>Error loading dashboard data</p>
      </div>
    );
  }

  // Render drill-down views
  if (currentView.mode !== 'dashboard') {
    // Handle special views
    if (currentView.mode === 'total-plants') {
      return (
        <PlantsListView
          onBack={handleBackToDashboard}
          onPlantClick={(plant) => {
            setCurrentView({
              mode: 'plant-drill',
              filters: { plant },
              title: `Materials in Plant: ${plant}`
            });
          }}
        />
      );
    }
    
    if (currentView.mode === 'total-locations') {
      return (
        <LocationsListView
          onBack={handleBackToDashboard}
          onLocationClick={(location) => {
            setCurrentView({
              mode: 'location-drill',
              filters: { storageLocation: location },
              title: `Materials in Location: ${location}`
            });
          }}
        />
      );
    }
    
    if (currentView.mode === 'materials-summary') {
      return (
        <MaterialsSummaryView
          onBack={handleBackToDashboard}
        />
      );
    }
    
    if (currentView.mode === 'data-requirements') {
      return (
        <DataRequirementsView
          onBack={handleBackToDashboard}
        />
      );
    }
    
    // Default material details view
    return (
      <MaterialDetails
        filters={currentView.filters}
        title={currentView.title}
        onBack={handleBackToDashboard}
        showBlockedOnly={currentView.mode === 'blocked-materials'}
        showUnrestrictedOnly={currentView.mode === 'unrestricted-materials'}
        showTotalInventory={currentView.mode === 'total-inventory'}
      />
    );
  }

  // Render main dashboard
  return (
    <div className="dashboard">
      {usingMockData && (
        <div className="mock-data-banner">
          ⚠️ Using mock data - Backend API not available
        </div>
      )}
      
      <div className="dashboard-header">
        <div className="brand-header">
          <div className="company-logo">
            <h2 className="logo-text">📦</h2>
            <div className="brand-text">
              <h1>Smart Inventory Hub</h1>
              <p className="brand-subtitle">Real-time Analytics & Stock Control</p>
            </div>
          </div>
          <div className="dashboard-subtitle">
            <div className="subtitle-content">
              <p>Monitor stock levels • Track performance • Optimize operations</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-section">
        <KpiCard
          title="Total Inventory"
          value={metrics.totalInventory}
          color="#0F4C8C"
          onClick={handleTotalInventoryClick}
        />
        <KpiCard
          title="Blocked Stock"
          value={metrics.totalBlocked}
          color="#E60026"
          onClick={handleBlockedClick}
        />
        <KpiCard
          title="Unrestricted Stock"
          value={metrics.totalUnrestricted}
          color="#00A651"
          onClick={handleUnrestrictedClick}
        />
        <KpiCard
          title="Restricted Stock"
          value={metrics.totalRestricted}
          color="#FF6900"
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Location Bar Chart */}
        <div className="chart-container">
          <h2>Stock by Location (Click to drill down)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationStats} onClick={handleLocationBarClick}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="storageLocation" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => [value.toLocaleString(), 'Quantity']}
                labelFormatter={(label) => `Location: ${label}`}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="custom-tooltip">
                        <p className="tooltip-label">{`Location: ${label}`}</p>
                        <p className="tooltip-value">
                          <span style={{ color: '#0F4C8C' }}>Total: {data.totalQuantity.toLocaleString()}</span>
                        </p>
                        <p className="tooltip-value">
                          <span style={{ color: '#00A651' }}>Unrestricted: {data.unrestrictedQuantity.toLocaleString()}</span>
                        </p>
                        <p className="tooltip-value">
                          <span style={{ color: '#E60026' }}>Blocked: {data.blockedQuantity.toLocaleString()}</span>
                        </p>
                        <p className="tooltip-hint">Click to view materials</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="totalQuantity" 
                fill="#0F4C8C"
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plant Pie Chart */}
        <div className="chart-container">
          <h2>Distribution by Plant (Click to drill down)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={plantStats}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#0F4C8C"
                dataKey="totalQuantity"
                label={({ plant, percent }) => `${plant} (${((percent || 0) * 100).toFixed(1)}%)`}
                onClick={handlePlantPieClick}
                style={{ cursor: 'pointer' }}
              >
                {plantStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [value.toLocaleString(), 'Quantity']}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="custom-tooltip">
                        <p className="tooltip-label">{`Plant: ${data.plant}`}</p>
                        <p className="tooltip-value">
                          <span style={{ color: '#0F4C8C' }}>Total: {data.totalQuantity.toLocaleString()}</span>
                        </p>
                        <p className="tooltip-value">
                          <span style={{ color: '#00A651' }}>Unrestricted: {data.unrestrictedQuantity.toLocaleString()}</span>
                        </p>
                        <p className="tooltip-value">
                          <span style={{ color: '#E60026' }}>Blocked: {data.blockedQuantity.toLocaleString()}</span>
                        </p>
                        <p className="tooltip-value">Materials: {data.materialCount}</p>
                        <p className="tooltip-value">Locations: {data.locations.join(', ')}</p>
                        <p className="tooltip-hint">Click to view materials</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Material Statistics */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>Total Locations</h3>
            <p className="stat-value">{locationStats.length}</p>
          </div>
          <div className="stat-item">
            <h3>Total Plants</h3>
            <p className="stat-value">{plantStats.length}</p>
          </div>
          <div className="stat-item">
            <h3>Total Materials</h3>
            <p className="stat-value">{locationStats.reduce((sum, loc) => sum + loc.materialCount, 0)}</p>
          </div>
          <div className="stat-item">
            <h3>Blocked Percentage</h3>
            <p className="stat-value">
              {((metrics.totalBlocked / metrics.totalInventory) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Grid */}
      <div className="navigation-section">
        <h3>Navigation & Analysis</h3>
        <div className="nav-grid">
          <div className="nav-category">
            <h4>📊 Material Views</h4>
            <div className="nav-buttons">
              <button onClick={handleTotalInventoryClick} className="nav-button materials">
                <span className="nav-icon">📦</span>
                <div>
                  <strong>All Materials</strong>
                  <p>Complete inventory with filters</p>
                </div>
              </button>
              <button onClick={handleBlockedClick} className="nav-button blocked">
                <span className="nav-icon">⚠️</span>
                <div>
                  <strong>Blocked Materials</strong>
                  <p>Materials with blocked stock</p>
                </div>
              </button>
              <button onClick={handleUnrestrictedClick} className="nav-button unrestricted">
                <span className="nav-icon">✅</span>
                <div>
                  <strong>Unrestricted Materials</strong>
                  <p>Available inventory</p>
                </div>
              </button>
            </div>
          </div>
          
          <div className="nav-category">
            <h4>🏭 Facility Views</h4>
            <div className="nav-buttons facility-views">
              <button onClick={handleTotalPlantsClick} className="nav-button plants">
                <span className="nav-icon">🏭</span>
                <div>
                  <strong>All Plants</strong>
                  <p>Plant summary with blocked %</p>
                </div>
              </button>
              <button onClick={handleTotalLocationsClick} className="nav-button locations">
                <span className="nav-icon">📍</span>
                <div>
                  <strong>All Locations</strong>
                  <p>Storage location analysis</p>
                </div>
              </button>
              <div className="nav-spacer"></div>
            </div>
          </div>
          
          <div className="nav-category">
            <h4>📈 Advanced Analysis</h4>
            <div className="nav-buttons">
              <button onClick={handleMaterialsSummaryClick} className="nav-button summary">
                <span className="nav-icon">📊</span>
                <div>
                  <strong>Materials Summary</strong>
                  <p>Blocked % analysis & risk levels</p>
                </div>
              </button>
              <button onClick={handleDataRequirementsClick} className="nav-button requirements">
                <span className="nav-icon">📋</span>
                <div>
                  <strong>Data Requirements</strong>
                  <p>Excel file format guide</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteDashboard;