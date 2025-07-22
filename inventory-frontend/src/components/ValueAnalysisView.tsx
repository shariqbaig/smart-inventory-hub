import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { inventoryApi } from '../services/clientApi';
import type { LocationStats, PlantStats, MaterialDetail } from '../types';
import { formatCurrency } from '../utils/currency';
import './EnhancedDashboard.css';

interface ValueDistribution {
  category: string;
  value: number;
  percentage: number;
  color: string;
}

const ValueAnalysisView: React.FC = () => {
  const navigate = useNavigate();
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [plantStats, setPlantStats] = useState<PlantStats[]>([]);
  const [materials, setMaterials] = useState<MaterialDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#0F4C8C', '#00A651', '#FF6900', '#E60026', '#1A5AA0', '#d69e2e'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [locationsData, plantsData, materialsData] = await Promise.all([
        inventoryApi.getLocationStats(),
        inventoryApi.getPlantStats(),
        inventoryApi.getMaterialDetails({ limit: 1000 })
      ]);
      
      setLocationStats(locationsData);
      setPlantStats(plantsData);
      setMaterials(materialsData.materials);
    } catch (error) {
      console.error('Error loading value analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateValueDistribution = (): ValueDistribution[] => {
    if (!locationStats.length) return [];

    const totalValue = locationStats.reduce((sum, loc) => sum + (loc.totalValue || 0), 0);
    
    return [
      {
        category: 'Available Stock',
        value: locationStats.reduce((sum, loc) => sum + (loc.unrestrictedValue || 0), 0),
        percentage: 0,
        color: '#00A651'
      },
      {
        category: 'Blocked Stock',
        value: locationStats.reduce((sum, loc) => sum + (loc.blockedValue || 0), 0),
        percentage: 0,
        color: '#E60026'
      }
    ].map(item => ({
      ...item,
      percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0
    }));
  };

  const getTopValueLocations = () => {
    return locationStats
      .filter(loc => loc.totalValue > 0)
      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
      .slice(0, 10);
  };

  const getTopValuePlants = () => {
    return plantStats
      .filter(plant => plant.totalValue && plant.totalValue > 0)
      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
      .slice(0, 8);
  };

  const getHighValueMaterials = () => {
    return materials
      .filter(material => material.valueUnrestricted > 0)
      .sort((a, b) => b.valueUnrestricted - a.valueUnrestricted)
      .slice(0, 20);
  };

  const valueDistribution = calculateValueDistribution();
  const topValueLocations = getTopValueLocations();
  const topValuePlants = getTopValuePlants();
  const highValueMaterials = getHighValueMaterials();

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading value analysis...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="brand-header">
          <div className="company-logo">
            <button onClick={() => navigate('/')} className="back-button" title="Back to Dashboard">
              <span className="sr-only">Back to Dashboard</span>
            </button>
            <div className="brand-text">
              <h1>💰 Value Analysis</h1>
              <p className="brand-subtitle">Inventory value distribution and financial insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* Value Overview Cards */}
      <div className="executive-summary">
        <div className="summary-header">
          <h2 className="summary-title">📊 Value Overview</h2>
          <p className="summary-subtitle">Financial breakdown of your inventory portfolio</p>
        </div>
        
        <div className="primary-metrics">
          {valueDistribution.map((item) => (
            <div key={item.category} className="metric-group">
              <div className="metric-main" style={{ borderLeftColor: item.color }}>
                <div className="metric-icon" style={{ color: item.color }}>
                  {item.category === 'Available Stock' ? '✅' : '🚫'}
                </div>
                <div className="metric-content">
                  <h3 className="metric-label">{item.category}</h3>
                  <div className="metric-values">
                    <span className="metric-primary">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="metric-secondary">
                    <span className="metric-percentage">{item.percentage.toFixed(1)}% of total value</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Value Distribution Pie Chart */}
        <div className="chart-container">
          <h2>Value Distribution</h2>
          {valueDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={valueDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ category, percentage }) => `${category} (${percentage.toFixed(1)}%)`}
                >
                  {valueDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">💰</div>
              <p>No value data available</p>
              <p className="no-data-hint">Upload inventory data to see value distribution</p>
            </div>
          )}
        </div>

        {/* Top Value Locations */}
        <div className="chart-container">
          <h2>Top Value Locations</h2>
          {topValueLocations.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topValueLocations}>
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
                  formatter={(value: number) => [formatCurrency(value), 'Total Value']}
                  labelFormatter={(label) => `Location: ${label}`}
                />
                <Bar dataKey="totalValue" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">📍</div>
              <p>No location value data</p>
              <p className="no-data-hint">Upload inventory data to see location values</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Value Plants - Full Width */}
      <div className="chart-container chart-section-spacer">
        <h2>Top Value Plants ({topValuePlants.length} plants with value data)</h2>
        {topValuePlants.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topValuePlants} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis dataKey="plant" type="category" tick={{ fontSize: 12 }} width={80} />
              <Tooltip 
                formatter={(value: number) => {
                  if (typeof value === 'number' && !isNaN(value)) {
                    return [formatCurrency(value), 'Total Value'];
                  }
                  return ['No value data', 'Total Value'];
                }}
                labelFormatter={(label) => `Plant: ${label}`}
              />
              <Bar dataKey="totalValue" fill={COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-data-message">
            <div className="no-data-icon">🏭</div>
            <p>No plant value data available</p>
            <p className="no-data-hint">
              {plantStats.length === 0 
                ? 'Upload inventory data to see plant values' 
                : `Found ${plantStats.length} plants but none have value data`}
            </p>
          </div>
        )}
      </div>

      {/* High Value Materials Table */}
      <div className="stats-section section-spacer">
        <h3>High Value Materials (Top 20)</h3>
        {highValueMaterials.length > 0 ? (
          <div className="materials-table expanded-table">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Description</th>
                  <th>Plant</th>
                  <th>Location</th>
                  <th>Quantity</th>
                  <th>Value (PKR)</th>
                  <th>Unit Value</th>
                </tr>
              </thead>
              <tbody>
                {highValueMaterials.map((material) => (
                  <tr key={`${material.material}-${material.plant}-${material.storageLocation}`}>
                    <td>{material.material}</td>
                    <td>{material.materialDescription}</td>
                    <td>{material.plant}</td>
                    <td>{material.storageLocation}</td>
                    <td>{material.unrestricted.toLocaleString()} {material.baseUnitOfMeasure}</td>
                    <td>{formatCurrency(material.valueUnrestricted)}</td>
                    <td>{formatCurrency(material.valueUnrestricted / material.unrestricted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data-message">
            <div className="no-data-icon">📋</div>
            <p>No high value materials found</p>
            <p className="no-data-hint">Upload inventory data to see valuable materials</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValueAnalysisView;