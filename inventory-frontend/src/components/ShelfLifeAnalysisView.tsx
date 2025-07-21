import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { inventoryApi } from '../services/clientApi';
import type { MaterialDetail } from '../types';
import { formatCurrency } from '../utils/currency';
import './EnhancedDashboard.css';

interface ShelfLifeCategory {
  category: string;
  materials: MaterialDetail[];
  daysRange: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
}

interface ExpiryAlert {
  material: MaterialDetail;
  daysUntilExpiry: number;
  alertLevel: 'critical' | 'warning' | 'watch';
}

const ShelfLifeAnalysisView: React.FC = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<MaterialDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#dc2626', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const materialsData = await inventoryApi.getMaterialDetails({ limit: 1000 });
      setMaterials(materialsData.materials);
    } catch (error) {
      console.error('Error loading shelf life data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysUntilExpiry = (sled: number): number => {
    if (!sled || sled === 0) return -1; // No expiry date
    
    // Assuming SLED is in Excel date format (days since 1900-01-01)
    const excelEpoch = new Date(1900, 0, 1);
    const expiryDate = new Date(excelEpoch.getTime() + (sled - 2) * 24 * 60 * 60 * 1000);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const categorizeByShelfLife = (): ShelfLifeCategory[] => {
    const categories: ShelfLifeCategory[] = [
      {
        category: 'Critical (< 30 days)',
        materials: [],
        daysRange: '< 30 days',
        color: '#dc2626',
        priority: 'high'
      },
      {
        category: 'Warning (30-90 days)',
        materials: [],
        daysRange: '30-90 days',
        color: '#f59e0b',
        priority: 'medium'
      },
      {
        category: 'Safe (90-180 days)',
        materials: [],
        daysRange: '90-180 days',
        color: '#10b981',
        priority: 'low'
      },
      {
        category: 'Long Term (> 180 days)',
        materials: [],
        daysRange: '> 180 days',
        color: '#3b82f6',
        priority: 'low'
      },
      {
        category: 'No Expiry Date',
        materials: [],
        daysRange: 'Not specified',
        color: '#8b5cf6',
        priority: 'low'
      }
    ];

    materials.forEach(material => {
      const daysUntilExpiry = calculateDaysUntilExpiry(material.sled);
      
      if (daysUntilExpiry === -1 || material.sled === 0) {
        categories[4].materials.push(material); // No expiry
      } else if (daysUntilExpiry < 30) {
        categories[0].materials.push(material); // Critical
      } else if (daysUntilExpiry < 90) {
        categories[1].materials.push(material); // Warning
      } else if (daysUntilExpiry < 180) {
        categories[2].materials.push(material); // Safe
      } else {
        categories[3].materials.push(material); // Long term
      }
    });

    return categories;
  };

  const getExpiryAlerts = (): ExpiryAlert[] => {
    const alerts: ExpiryAlert[] = [];

    materials.forEach(material => {
      const daysUntilExpiry = calculateDaysUntilExpiry(material.sled);
      
      if (daysUntilExpiry > 0) {
        let alertLevel: 'critical' | 'warning' | 'watch';
        
        if (daysUntilExpiry < 15) {
          alertLevel = 'critical';
        } else if (daysUntilExpiry < 30) {
          alertLevel = 'warning';
        } else if (daysUntilExpiry < 60) {
          alertLevel = 'watch';
        } else {
          return; // No alert needed
        }

        alerts.push({
          material,
          daysUntilExpiry,
          alertLevel
        });
      }
    });

    return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  };

  const formatExpiryDate = (sled: number): string => {
    if (!sled || sled === 0) return 'No expiry date';
    
    const excelEpoch = new Date(1900, 0, 1);
    const expiryDate = new Date(excelEpoch.getTime() + (sled - 2) * 24 * 60 * 60 * 1000);
    
    return expiryDate.toLocaleDateString();
  };

  const shelfLifeCategories = categorizeByShelfLife();
  const expiryAlerts = getExpiryAlerts();
  const chartData = shelfLifeCategories.map(cat => ({
    category: cat.category,
    count: cat.materials.length,
    value: cat.materials.reduce((sum, mat) => sum + mat.valueUnrestricted, 0)
  }));

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading shelf life analysis...</p>
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
              <h1>⏰ Shelf Life Analysis</h1>
              <p className="brand-subtitle">Expiry tracking and SLED monitoring</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="executive-summary">
          <div className="summary-header">
            <h2 className="summary-title">🚨 Expiry Alerts</h2>
            <p className="summary-subtitle">Materials requiring immediate attention</p>
          </div>
          
          <div className="secondary-metrics">
            {expiryAlerts.slice(0, 6).map((alert, index) => (
              <div key={index} className={`metric-card alert-${alert.alertLevel}`}>
                <div className="metric-small-icon">
                  {alert.alertLevel === 'critical' ? '🚨' : alert.alertLevel === 'warning' ? '⚠️' : '👀'}
                </div>
                <div className="metric-small-content">
                  <span className="metric-small-label">{alert.material.material}</span>
                  <span className="metric-small-value">{alert.daysUntilExpiry} days left</span>
                  <span className="metric-small-currency">{alert.material.storageLocation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="charts-section">
        {/* Shelf Life Distribution */}
        <div className="chart-container">
          <h2>Materials by Shelf Life</h2>
          {chartData.length > 0 && chartData.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'count' ? value : formatCurrency(value),
                    name === 'count' ? 'Materials' : 'Total Value'
                  ]}
                />
                <Bar dataKey="count" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">⏰</div>
              <p>No shelf life data available</p>
              <p className="no-data-hint">Upload inventory with SLED data to see expiry analysis</p>
            </div>
          )}
        </div>

        {/* Value by Shelf Life */}
        <div className="chart-container">
          <h2>Value Distribution by Shelf Life</h2>
          {chartData.length > 0 && chartData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ category, value }) => `${category}: ${formatCurrency(value || 0)}`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
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
              <p>No value data for shelf life</p>
              <p className="no-data-hint">Upload inventory with value data to see financial impact</p>
            </div>
          )}
        </div>
      </div>

      {/* Critical Materials Table */}
      <div className="stats-section">
        <h3>Critical Materials (Expiring Soon)</h3>
        {shelfLifeCategories[0].materials.length > 0 ? (
          <div className="materials-table">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Description</th>
                  <th>Plant</th>
                  <th>Location</th>
                  <th>Quantity</th>
                  <th>Value (PKR)</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                </tr>
              </thead>
              <tbody>
                {shelfLifeCategories[0].materials.slice(0, 15).map((material) => {
                  const daysLeft = calculateDaysUntilExpiry(material.sled);
                  return (
                    <tr key={`${material.material}-${material.plant}-${material.storageLocation}`}>
                      <td>{material.material}</td>
                      <td>{material.materialDescription}</td>
                      <td>{material.plant}</td>
                      <td>{material.storageLocation}</td>
                      <td>{material.unrestricted.toLocaleString()} {material.baseUnitOfMeasure}</td>
                      <td>{formatCurrency(material.valueUnrestricted)}</td>
                      <td>{formatExpiryDate(material.sled)}</td>
                      <td className={daysLeft < 15 ? 'critical-days' : daysLeft < 30 ? 'warning-days' : ''}>
                        {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data-message">
            <div className="no-data-icon">✅</div>
            <p>No critical materials found</p>
            <p className="no-data-hint">All materials have adequate shelf life or no expiry dates</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShelfLifeAnalysisView;