import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import KpiCard from './KpiCard';
import type { InventoryMetrics, LocationStats, PlantStats } from '../types';
import { inventoryApi } from '../services/clientApi';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [plantStats, setPlantStats] = useState<PlantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  // Colors for charts
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  useEffect(() => {
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

    loadData();
  }, []);

  const handleLocationClick = (location: string) => {
    console.log('Drill down to location:', location);
    // TODO: Implement drill-down functionality
  };

  const handlePlantClick = (plant: string) => {
    console.log('Drill down to plant:', plant);
    // TODO: Implement drill-down functionality
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

  return (
    <div className="dashboard">
      {usingMockData && (
        <div className="mock-data-banner">
          ⚠️ Using mock data - Backend API not available
        </div>
      )}
      
      <div className="dashboard-header">
        <h1>Inventory Dashboard</h1>
        <p>Real-time inventory analytics and reporting</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-section">
        <KpiCard
          title="Total Inventory"
          value={metrics.totalInventory}
          color="#2563eb"
        />
        <KpiCard
          title="Blocked Stock"
          value={metrics.totalBlocked}
          color="#dc2626"
          onClick={() => console.log('Show blocked materials')}
        />
        <KpiCard
          title="Unrestricted Stock"
          value={metrics.totalUnrestricted}
          color="#059669"
        />
        <KpiCard
          title="Restricted Stock"
          value={metrics.totalRestricted}
          color="#d97706"
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Location Bar Chart */}
        <div className="chart-container">
          <h2>Stock by Location</h2>
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
              />
              <Bar 
                dataKey="totalQuantity" 
                fill="#8884d8"
                onClick={(data: any) => handleLocationClick(data.payload?.storageLocation)}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plant Pie Chart */}
        <div className="chart-container">
          <h2>Distribution by Plant</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={plantStats}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="totalQuantity"
                label={({ plant, percent }) => `${plant} (${((percent || 0) * 100).toFixed(1)}%)`}
                onClick={(data) => handlePlantClick(data.plant)}
                style={{ cursor: 'pointer' }}
              >
                {plantStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [value.toLocaleString(), 'Quantity']}
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
    </div>
  );
};

export default Dashboard;