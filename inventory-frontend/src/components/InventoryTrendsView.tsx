import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { inventoryApi } from '../services/clientApi';
import type { InventoryMetrics, LocationStats, PlantStats } from '../types';
import { formatCurrency } from '../utils/currency';
import './EnhancedDashboard.css';

interface TrendData {
  period: string;
  totalInventory: number;
  blockedStock: number;
  blockedPercentage: number;
  totalValue: number;
}

interface LocationTrend {
  location: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  change: number;
  currentValue: number;
}

const InventoryTrendsView: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [, setPlantStats] = useState<PlantStats[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#0F4C8C', '#00A651', '#FF6900', '#E60026', '#1A5AA0', '#d69e2e'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [metricsData, locationsData, plantsData] = await Promise.all([
        inventoryApi.getMetrics(),
        inventoryApi.getLocationStats(),
        inventoryApi.getPlantStats()
      ]);
      
      setMetrics(metricsData);
      setLocationStats(locationsData);
      setPlantStats(plantsData);
    } catch (error) {
      console.error('Error loading trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate simulated trend data (in real scenario, this would come from historical data)
  const generateTrendData = (): TrendData[] => {
    if (!metrics) return [];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const baseInventory = metrics.totalInventory;
    const baseBlocked = metrics.totalBlocked;
    const baseValue = metrics.totalInventoryValue;

    return months.map((month) => {
      const variation = 0.85 + (Math.random() * 0.3); // 85-115% variation
      const blockedVariation = 0.7 + (Math.random() * 0.6); // 70-130% variation for blocked
      
      const inventory = baseInventory * variation;
      const blocked = baseBlocked * blockedVariation;
      
      return {
        period: month,
        totalInventory: inventory,
        blockedStock: blocked,
        blockedPercentage: inventory > 0 ? (blocked / inventory) * 100 : 0,
        totalValue: baseValue * variation
      };
    });
  };

  const analyzeLocationTrends = (): LocationTrend[] => {
    return locationStats.slice(0, 10).map(location => {
      // Simulate trend analysis (in real scenario, compare with historical data)
      const randomTrend = Math.random();
      let trend: 'increasing' | 'decreasing' | 'stable';
      let change: number;

      if (randomTrend > 0.6) {
        trend = 'increasing';
        change = 5 + Math.random() * 15; // 5-20% increase
      } else if (randomTrend < 0.3) {
        trend = 'decreasing';
        change = -(5 + Math.random() * 15); // 5-20% decrease
      } else {
        trend = 'stable';
        change = -2 + Math.random() * 4; // -2% to +2%
      }

      return {
        location: location.storageLocation,
        trend,
        change,
        currentValue: location.totalValue || 0
      };
    });
  };

  const getPerformanceInsights = () => {
    if (!metrics) return [];

    const blockedPercentage = metrics.totalInventory > 0 ? (metrics.totalBlocked / metrics.totalInventory) * 100 : 0;
    
    const insights = [];

    if (blockedPercentage > 5) {
      insights.push({
        type: 'warning',
        title: 'High Blocked Stock',
        message: `${blockedPercentage.toFixed(1)}% of inventory is blocked - consider review`,
        icon: '⚠️'
      });
    } else if (blockedPercentage < 2) {
      insights.push({
        type: 'success',
        title: 'Excellent Stock Health',
        message: `Only ${blockedPercentage.toFixed(1)}% blocked stock - well managed`,
        icon: '✅'
      });
    }

    const topLocation = locationStats[0];
    if (topLocation && (topLocation.totalValue || 0) > 0) {
      insights.push({
        type: 'info',
        title: 'Top Value Location',
        message: `${topLocation.storageLocation} holds ${formatCurrency(topLocation.totalValue || 0)} in inventory`,
        icon: '📍'
      });
    }

    return insights;
  };

  const trendData = generateTrendData();
  const locationTrends = analyzeLocationTrends();
  const insights = getPerformanceInsights();

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading inventory trends...</p>
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
              <h1>📈 Inventory Trends</h1>
              <p className="brand-subtitle">Historical patterns and performance insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      {insights.length > 0 && (
        <div className="executive-summary">
          <div className="summary-header">
            <h2 className="summary-title">🔍 Performance Insights</h2>
            <p className="summary-subtitle">Key observations from your inventory data</p>
          </div>
          
          <div className="secondary-metrics">
            {insights.map((insight, index) => (
              <div key={index} className={`metric-card insight-${insight.type}`}>
                <div className="metric-small-icon">{insight.icon}</div>
                <div className="metric-small-content">
                  <span className="metric-small-label">{insight.title}</span>
                  <span className="metric-small-value">{insight.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="charts-section">
        {/* Inventory Trend Line Chart */}
        <div className="chart-container">
          <h2>Inventory Volume Trends</h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'totalInventory' || name === 'blockedStock') {
                      return [value.toLocaleString(), name === 'totalInventory' ? 'Total Inventory' : 'Blocked Stock'];
                    }
                    return [value, name];
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="totalInventory" 
                  stackId="1" 
                  stroke={COLORS[0]} 
                  fill={`${COLORS[0]}40`}
                  name="Total Inventory"
                />
                <Area 
                  type="monotone" 
                  dataKey="blockedStock" 
                  stackId="2" 
                  stroke={COLORS[3]} 
                  fill={`${COLORS[3]}40`}
                  name="Blocked Stock"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">📈</div>
              <p>No trend data available</p>
              <p className="no-data-hint">Historical data needed for trend analysis</p>
            </div>
          )}
        </div>

        {/* Blocked Percentage Trend */}
        <div className="chart-container">
          <h2>Blocked Stock Percentage Trend</h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 'dataMax + 1']} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Blocked %']}
                />
                <Line 
                  type="monotone" 
                  dataKey="blockedPercentage" 
                  stroke={COLORS[3]} 
                  strokeWidth={3}
                  dot={{ fill: COLORS[3], strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">📊</div>
              <p>No percentage trend data</p>
              <p className="no-data-hint">Historical data needed for percentage trends</p>
            </div>
          )}
        </div>
      </div>

      {/* Location Trends Table */}
      <div className="stats-section">
        <h3>Location Performance Trends</h3>
        {locationTrends.length > 0 ? (
          <div className="materials-table">
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Current Value</th>
                  <th>Trend</th>
                  <th>Change</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {locationTrends.map((trend) => (
                  <tr key={trend.location}>
                    <td>{trend.location}</td>
                    <td>{formatCurrency(trend.currentValue)}</td>
                    <td>
                      <span className={`trend-indicator trend-${trend.trend}`}>
                        {trend.trend === 'increasing' ? '📈' : trend.trend === 'decreasing' ? '📉' : '➡️'}
                        {trend.trend}
                      </span>
                    </td>
                    <td className={trend.change > 0 ? 'positive-change' : trend.change < 0 ? 'negative-change' : 'neutral-change'}>
                      {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                    </td>
                    <td>
                      <span className={`status-badge ${trend.trend === 'increasing' ? 'good' : trend.trend === 'decreasing' ? 'attention' : 'neutral'}`}>
                        {trend.trend === 'increasing' ? 'Growing' : trend.trend === 'decreasing' ? 'Declining' : 'Stable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data-message">
            <div className="no-data-icon">📋</div>
            <p>No location trend data</p>
            <p className="no-data-hint">Upload inventory data to see location trends</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryTrendsView;