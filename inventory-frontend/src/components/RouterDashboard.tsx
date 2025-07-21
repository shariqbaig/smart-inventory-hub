import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import KpiCard from './KpiCard';
import FileManagement from './FileManagement';
import { useTheme } from '../contexts/ThemeContext';
import type { InventoryMetrics, LocationStats, PlantStats } from '../types';
import { inventoryApi } from '../services/api';
import { formatCurrency } from '../utils/currency';
import './EnhancedDashboard.css';
import './ChartThemes.css';
import './ExecutiveSummary.css';

const RouterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [plantStats, setPlantStats] = useState<PlantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [showFileManagement, setShowFileManagement] = useState(false);
  const [isReloadingData, setIsReloadingData] = useState(false);

  // Theme-aware colors for charts
  const getThemeColors = () => {
    if (isDarkMode) {
      return ['#3182ce', '#38a169', '#d69e2e', '#dd6b20', '#e53e3e', '#4299e1'];
    } else {
      return ['#0F4C8C', '#00A651', '#d69e2e', '#FF6900', '#E60026', '#1A5AA0'];
    }
  };
  
  const COLORS = getThemeColors();

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
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers using React Router
  const handleTotalInventoryClick = () => {
    navigate('/materials');
  };

  const handleBlockedClick = () => {
    navigate('/materials/blocked');
  };

  const handleUnrestrictedClick = () => {
    navigate('/materials/unrestricted');
  };

  const handleRestrictedClick = () => {
    navigate('/materials/restricted');
  };

  const handleInTransferClick = () => {
    navigate('/materials/in-transfer');
  };

  const handleQualityInspectionClick = () => {
    navigate('/materials/quality-inspection');
  };

  const handleTotalPlantsClick = () => {
    navigate('/plants');
  };

  const handleTotalLocationsClick = () => {
    navigate('/locations');
  };

  const handleMaterialsSummaryClick = () => {
    navigate('/materials-summary');
  };

  const handleInventoryTrendsClick = () => {
    navigate('/inventory-trends');
  };

  const handleValueAnalysisClick = () => {
    navigate('/value-analysis');
  };

  const handleShelfLifeAnalysisClick = () => {
    navigate('/shelf-life-analysis');
  };

  const handlePlantPerformanceClick = () => {
    navigate('/plant-performance');
  };

  const handleLocationUtilizationClick = () => {
    navigate('/location-utilization');
  };

  const handleFileManagement = () => {
    setShowFileManagement(true);
  };

  const handleFileManagementClose = () => {
    setShowFileManagement(false);
  };

  const handleFileUploadSuccess = (fileInfo: any) => {
    // Reload dashboard data when a new file is uploaded/activated
    console.log('File upload success, reloading data...', fileInfo);
    setIsReloadingData(true);
    // Small delay to ensure backend has processed the file
    setTimeout(() => {
      loadData().finally(() => {
        setIsReloadingData(false);
      });
    }, 500);
  };

  const handleLocationClick = (data: any) => {
    const location = data.storageLocation;
    navigate(`/locations/${encodeURIComponent(location)}`);
  };

  const handlePlantClick = (data: any) => {
    const plant = data.plant;
    navigate(`/plants/${encodeURIComponent(plant)}`);
  };

  const handleLocationBarClick = (data: any) => {
    if (data) {
      handleLocationClick(data);
    }
  };

  const handlePlantPieClick = (data: any, index: number) => {
    if (data) {
      handlePlantClick(data);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="brand-header">
            <div className="company-logo">
              <h2 className="logo-text">📦</h2>
              <div className="brand-text">
                <div className="brand-title-row">
                  <h1>Smart Inventory Hub</h1>
                </div>
                <p className="brand-subtitle">Real-time Analytics & Stock Control</p>
              </div>
            </div>
            <div className="dashboard-actions">
              {/* No button while loading */}
            </div>
          </div>
        </div>

        {/* Enhanced Loading State */}
        <div className="loading-state">
          <div className="loading-container">
            <div className="loading-animation">
              <div className="loading-boxes">
                <div className="loading-box box-1"></div>
                <div className="loading-box box-2"></div>
                <div className="loading-box box-3"></div>
              </div>
              <div className="loading-spinner-modern"></div>
            </div>
            
            <div className="loading-content">
              <h2>Loading Your Dashboard</h2>
              <p>Preparing your inventory analytics and insights...</p>
              
              <div className="loading-steps">
                <div className="loading-step active">
                  <div className="step-icon">📊</div>
                  <span>Loading metrics</span>
                </div>
                <div className="loading-step">
                  <div className="step-icon">🏭</div>
                  <span>Processing plants</span>
                </div>
                <div className="loading-step">
                  <div className="step-icon">📍</div>
                  <span>Analyzing locations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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

  // Check if no data is available (no inventory uploaded/activated)
  const hasInventoryData = metrics && metrics.totalInventory > 0 && locationStats.length > 0;

  // File Management Modal - rendered outside conditional returns
  const fileManagementModal = showFileManagement && (
    <FileManagement
      onUploadSuccess={handleFileUploadSuccess}
      onClose={handleFileManagementClose}
    />
  );

  if (!hasInventoryData) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="brand-header">
            <div className="company-logo">
              <h2 className="logo-text">📦</h2>
              <div className="brand-text">
                <div className="brand-title-row">
                  <h1>Smart Inventory Hub</h1>
                </div>
                <p className="brand-subtitle">Real-time Analytics & Stock Control</p>
              </div>
            </div>
            <div className="dashboard-actions">
              {hasInventoryData && (
                <button onClick={handleFileManagement} className="file-management-button">
                  📁 Manage Files
                </button>
              )}
            </div>
          </div>
        </div>

        {/* No Data State */}
        <div className="no-data-state">
          <div className="no-data-container">
            <div className="no-data-icon">📋</div>
            <h2>Welcome to Smart Inventory Hub</h2>
            <p className="no-data-description">
              Get started by uploading your inventory data to unlock powerful analytics and insights.
            </p>
            
            <div className="no-data-actions">
              <button onClick={handleFileManagement} className="primary-action-button">
                📤 Upload Inventory File
              </button>
            </div>

            <div className="getting-started-steps">
              <h3>Getting Started</h3>
              <div className="steps-grid">
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Prepare Your Data</h4>
                    <p>Ensure your Excel file contains required columns: Material, Description, Plant, Storage Location, Unrestricted, and Blocked quantities.</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Upload & Validate</h4>
                    <p>Upload your Excel file and review validation results. Download our template if you need a reference format.</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Activate & Analyze</h4>
                    <p>Once validated, activate your file to unlock the full dashboard with charts, analytics, and drill-down capabilities.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="features-preview">
              <h3>What You'll Get</h3>
              <div className="features-grid">
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <span className="feature-text">Interactive Charts & Analytics</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🏭</span>
                  <span className="feature-text">Plant & Location Insights</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">⚠️</span>
                  <span className="feature-text">Blocked Stock Analysis</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔍</span>
                  <span className="feature-text">Advanced Search & Filtering</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📈</span>
                  <span className="feature-text">Performance Optimization</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📱</span>
                  <span className="feature-text">Mobile-Responsive Design</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* File Management Modal */}
        {fileManagementModal}
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Loading Overlay */}
      {isReloadingData && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner-large"></div>
            <p>Processing new inventory data...</p>
          </div>
        </div>
      )}
      
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
              <div className="brand-title-row">
                <h1>Smart Inventory Hub</h1>
              </div>
              <p className="brand-subtitle">Real-time Analytics & Stock Control</p>
            </div>
          </div>
          <div className="dashboard-actions">
            <button onClick={handleFileManagement} className="file-management-button">
              📁 Manage Files
            </button>
          </div>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="executive-summary">
        <div className="summary-header">
          <div className="summary-header-left">
            <h2 className="summary-title">📊 Inventory Overview</h2>
            <p className="summary-subtitle">Real-time snapshot of your inventory health and value</p>
          </div>
          <div className="summary-header-right">
            <div className="header-info-row">
              <div className="info-item">
                <span className="info-label">📊</span>
                <span className="info-value">{locationStats.reduce((sum, loc) => sum + loc.materialCount, 0)} Materials</span>
              </div>
              <div className="health-indicator-inline">
                <span className="health-label">Health:</span>
                <span className={`health-status ${metrics.totalInventory > 0 ? (((metrics.totalBlocked / metrics.totalInventory) * 100) < 2 ? 'excellent' : ((metrics.totalBlocked / metrics.totalInventory) * 100) < 5 ? 'good' : 'attention') : 'excellent'}`}>
                  {metrics.totalInventory > 0 ? (((metrics.totalBlocked / metrics.totalInventory) * 100) < 2 ? 'Excellent' : 
                   ((metrics.totalBlocked / metrics.totalInventory) * 100) < 5 ? 'Good' : 'Needs Attention') : 'No Data'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Primary Metrics */}
        <div className="primary-metrics">
          <div className="metric-group">
            <div className="metric-main" onClick={handleTotalInventoryClick}>
              <div className="metric-icon">📦</div>
              <div className="metric-content">
                <h3 className="metric-label">Total Inventory</h3>
                <div className="metric-values">
                  <span className="metric-primary">{(metrics.totalInventory / 1000000).toFixed(2)}M</span>
                  <span className="metric-unit">units</span>
                </div>
                <div className="metric-secondary">
                  <span className="metric-currency">₨{(metrics.totalInventoryValue / 1000000).toFixed(2)}M</span>
                  <span className="metric-label-small">total value</span>
                </div>
              </div>
            </div>
          </div>

          <div className="metric-group">
            <div className="metric-main available" onClick={handleUnrestrictedClick}>
              <div className="metric-icon">✅</div>
              <div className="metric-content">
                <h3 className="metric-label">Available Stock</h3>
                <div className="metric-values">
                  <span className="metric-primary">{(metrics.totalUnrestricted / 1000000).toFixed(2)}M</span>
                  <span className="metric-unit">units</span>
                </div>
                <div className="metric-secondary">
                  <span className="metric-currency">₨{(metrics.totalUnrestrictedValue / 1000000).toFixed(2)}M</span>
                  <span className="metric-percentage">{metrics.totalInventory > 0 ? ((metrics.totalUnrestricted / metrics.totalInventory) * 100).toFixed(1) : '0'}% of total</span>
                </div>
              </div>
            </div>
          </div>

          <div className="metric-group">
            <div className="metric-main blocked" onClick={handleBlockedClick}>
              <div className="metric-icon">🚫</div>
              <div className="metric-content">
                <h3 className="metric-label">Blocked Stock</h3>
                <div className="metric-values">
                  <span className="metric-primary">{(metrics.totalBlocked / 1000).toFixed(0)}K</span>
                  <span className="metric-unit">units</span>
                </div>
                <div className="metric-secondary">
                  <span className="metric-currency">₨{(metrics.totalBlockedValue / 1000).toFixed(0)}K</span>
                  <span className="metric-percentage risk">{metrics.totalInventory > 0 ? ((metrics.totalBlocked / metrics.totalInventory) * 100).toFixed(2) : '0'}% blocked</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="secondary-metrics">
          <div className="metric-card" onClick={handleRestrictedClick}>
            <div className="metric-small-icon">⚠️</div>
            <div className="metric-small-content">
              <span className="metric-small-label">Restricted Stock</span>
              <span className="metric-small-value">{(metrics.totalRestricted / 1000).toFixed(1)}K units</span>
              <span className="metric-small-currency">₨{(metrics.totalRestrictedValue / 1000).toFixed(1)}K</span>
            </div>
          </div>

          <div className="metric-card" onClick={handleInTransferClick}>
            <div className="metric-small-icon">🔄</div>
            <div className="metric-small-content">
              <span className="metric-small-label">In Transfer</span>
              <span className="metric-small-value">{(metrics.totalInTransfer / 1000).toFixed(1)}K units</span>
              <span className="metric-small-currency">₨{(metrics.totalInTransferValue / 1000).toFixed(1)}K</span>
            </div>
          </div>

          <div className="metric-card" onClick={handleQualityInspectionClick}>
            <div className="metric-small-icon">🔍</div>
            <div className="metric-small-content">
              <span className="metric-small-label">Quality Inspection</span>
              <span className="metric-small-value">{(metrics.totalInQualityInsp / 1000).toFixed(1)}K units</span>
              <span className="metric-small-currency">₨{(metrics.totalInQualityInspValue / 1000).toFixed(1)}K</span>
            </div>
          </div>
        </div>

      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Location Bar Chart */}
        <div className="chart-container">
          <h2>Stock by Location</h2>
          {locationStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={locationStats}>
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
                            <span className="tooltip-total">Total: {data.totalQuantity.toLocaleString()}</span>
                          </p>
                          <p className="tooltip-value">
                            <span className="tooltip-unrestricted">Unrestricted: {data.unrestrictedQuantity.toLocaleString()}</span>
                          </p>
                          <p className="tooltip-value">
                            <span className="tooltip-blocked">Blocked: {data.blockedQuantity.toLocaleString()}</span>
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
                  fill={COLORS[0]}
                  style={{ cursor: 'pointer' }}
                  onClick={handleLocationBarClick}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">📊</div>
              <p>No location data available</p>
              <p className="no-data-hint">Upload an inventory file to see location analytics</p>
            </div>
          )}
        </div>

        {/* Plant Pie Chart */}
        <div className="chart-container">
          <h2>Distribution by Plant</h2>
          {plantStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={plantStats}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill={COLORS[0]}
                  dataKey="totalQuantity"
                  label={({ plant, percent }) => percent ? `${plant} (${(percent * 100).toFixed(1)}%)` : plant}
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
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">🏭</div>
              <p>No plant data available</p>
              <p className="no-data-hint">Upload an inventory file to see plant distribution</p>
            </div>
          )}
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
              {metrics.totalInventory > 0 ? ((metrics.totalBlocked / metrics.totalInventory) * 100).toFixed(2) : '0.00'}%
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
              <button onClick={handleRestrictedClick} className="nav-button restricted">
                <span className="nav-icon">🔒</span>
                <div>
                  <strong>Restricted Materials</strong>
                  <p>Materials with restricted-use stock</p>
                </div>
              </button>
            </div>
          </div>
          
          <div className="nav-category">
            <h4>🏭 Facility Views</h4>
            <div className="nav-buttons">
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
              <button onClick={handlePlantPerformanceClick} className="nav-button plant-performance">
                <span className="nav-icon">📊</span>
                <div>
                  <strong>Plant Performance</strong>
                  <p>Efficiency & productivity metrics</p>
                </div>
              </button>
              <button onClick={handleLocationUtilizationClick} className="nav-button location-utilization">
                <span className="nav-icon">📈</span>
                <div>
                  <strong>Location Utilization</strong>
                  <p>Storage optimization insights</p>
                </div>
              </button>
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
              <button onClick={handleValueAnalysisClick} className="nav-button value-analysis">
                <span className="nav-icon">💰</span>
                <div>
                  <strong>Value Analysis</strong>
                  <p>Inventory value distribution & trends</p>
                </div>
              </button>
              <button onClick={handleInventoryTrendsClick} className="nav-button trends">
                <span className="nav-icon">📈</span>
                <div>
                  <strong>Inventory Trends</strong>
                  <p>Historical patterns & forecasting</p>
                </div>
              </button>
              <button onClick={handleShelfLifeAnalysisClick} className="nav-button shelf-life">
                <span className="nav-icon">⏰</span>
                <div>
                  <strong>Shelf Life Analysis</strong>
                  <p>Expiry tracking & SLED monitoring</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File Management Modal */}
      {fileManagementModal}
    </div>
  );
};

export default RouterDashboard;