import React from 'react';
import './DataRequirementsView.css';

interface DataRequirementsViewProps {
  onBack: () => void;
}

const DataRequirementsView: React.FC<DataRequirementsViewProps> = ({ onBack }) => {
  return (
    <div className="data-requirements">
      <div className="data-requirements-header">
        <div className="header-top">
          <button onClick={onBack} className="back-button" title="Back to Dashboard">
            <span className="sr-only">Back to Dashboard</span>
          </button>
          <h2>Excel Data Requirements & Best Practices</h2>
        </div>
        
        <div className="intro-section">
          <p className="intro-text">
            To maximize the capabilities of the Inventory Management Dashboard, 
            your Excel file should follow these data structure requirements and best practices.
          </p>
        </div>
      </div>

      <div className="requirements-content">
        {/* Required Columns Section */}
        <div className="section-card">
          <h3 className="section-title">🔢 Required Excel Columns</h3>
          <p className="section-description">
            These columns are <strong>mandatory</strong> for the dashboard to function properly:
          </p>
          
          <div className="columns-grid">
            <div className="column-item required">
              <h4>Material</h4>
              <p><strong>Type:</strong> Number/Text</p>
              <p><strong>Example:</strong> 20152232, MAT001, SKU-12345</p>
              <p>Unique identifier for each material/product</p>
            </div>
            
            <div className="column-item required">
              <h4>Material Description</h4>
              <p><strong>Type:</strong> Text</p>
              <p><strong>Example:</strong> "RM SODIUM SULPHATE", "Dove Soap 100g"</p>
              <p>Human-readable description of the material</p>
            </div>
            
            <div className="column-item required">
              <h4>Plant</h4>
              <p><strong>Type:</strong> Text</p>
              <p><strong>Example:</strong> Y012, Y013, PLANT_A</p>
              <p>Manufacturing plant or facility code</p>
            </div>
            
            <div className="column-item required">
              <h4>Storage Location</h4>
              <p><strong>Type:</strong> Text</p>
              <p><strong>Example:</strong> YP01, YM99, WH001</p>
              <p>Specific storage location within the plant</p>
            </div>
            
            <div className="column-item required">
              <h4>Base Unit of Measure</h4>
              <p><strong>Type:</strong> Text</p>
              <p><strong>Example:</strong> KG, L, PC, MT</p>
              <p>Unit of measurement for quantities</p>
            </div>
            
            <div className="column-item required">
              <h4>Unrestricted</h4>
              <p><strong>Type:</strong> Number</p>
              <p><strong>Example:</strong> 10899.5, 0, 1500.25</p>
              <p>Available inventory quantity for use</p>
            </div>
            
            <div className="column-item required">
              <h4>Blocked</h4>
              <p><strong>Type:</strong> Number</p>
              <p><strong>Example:</strong> 1230.5, 0, 250</p>
              <p>Inventory quantity that is blocked/unavailable</p>
            </div>
          </div>
        </div>

        {/* Optional Columns Section */}
        <div className="section-card">
          <h3 className="section-title">📊 Optional Excel Columns (Recommended)</h3>
          <p className="section-description">
            These columns enhance dashboard functionality but are not required:
          </p>
          
          <div className="columns-grid">
            <div className="column-item optional">
              <h4>Stock in transfer</h4>
              <p><strong>Type:</strong> Number</p>
              <p>Inventory currently being transferred between locations</p>
            </div>
            
            <div className="column-item optional">
              <h4>In Quality Insp.</h4>
              <p><strong>Type:</strong> Number</p>
              <p>Inventory under quality inspection</p>
            </div>
            
            <div className="column-item optional">
              <h4>Restricted-Use Stock</h4>
              <p><strong>Type:</strong> Number</p>
              <p>Inventory with restricted usage</p>
            </div>
            
            <div className="column-item optional">
              <h4>Value Unrestricted</h4>
              <p><strong>Type:</strong> Number</p>
              <p>Monetary value of unrestricted stock</p>
            </div>
            
            <div className="column-item optional">
              <h4>Total shelf life</h4>
              <p><strong>Type:</strong> Number</p>
              <p>Product shelf life in days</p>
            </div>
            
            <div className="column-item optional">
              <h4>SLED/BBD</h4>
              <p><strong>Type:</strong> Date/Number</p>
              <p>Shelf Life End Date or Best Before Date</p>
            </div>
            
            <div className="column-item optional">
              <h4>Date of Manufacture</h4>
              <p><strong>Type:</strong> Date/Number</p>
              <p>When the product was manufactured</p>
            </div>
            
            <div className="column-item optional">
              <h4>Batch</h4>
              <p><strong>Type:</strong> Text/Number</p>
              <p>Production batch identifier</p>
            </div>
          </div>
        </div>

        {/* Best Practices Section */}
        <div className="section-card">
          <h3 className="section-title">✅ Excel File Best Practices</h3>
          
          <div className="best-practices">
            <div className="practice-category">
              <h4>📋 Data Quality Guidelines</h4>
              <ul>
                <li><strong>Consistent Headers:</strong> Use exact column names as specified above</li>
                <li><strong>No Empty Headers:</strong> Ensure all required columns have proper names</li>
                <li><strong>Data Consistency:</strong> Use consistent formats for Plant and Location codes</li>
                <li><strong>Numeric Values:</strong> Ensure quantity columns contain only numbers (no text like "N/A")</li>
                <li><strong>No Merged Cells:</strong> Each cell should contain a single value</li>
              </ul>
            </div>
            
            <div className="practice-category">
              <h4>📁 File Structure Guidelines</h4>
              <ul>
                <li><strong>Single Worksheet:</strong> Place all data in the first worksheet</li>
                <li><strong>Row 1 Headers:</strong> Column headers must be in the first row</li>
                <li><strong>Continuous Data:</strong> No empty rows between data records</li>
                <li><strong>File Format:</strong> Use .xlsx or .xls format</li>
                <li><strong>File Size:</strong> Recommended under 50MB for optimal performance</li>
              </ul>
            </div>
            
            <div className="practice-category">
              <h4>🔍 Data Validation Tips</h4>
              <ul>
                <li><strong>Material Codes:</strong> Should be unique per plant/location combination</li>
                <li><strong>Quantity Values:</strong> Cannot be negative numbers</li>
                <li><strong>Plant/Location Codes:</strong> Should follow consistent naming convention</li>
                <li><strong>Unit of Measure:</strong> Use standard abbreviations (KG, L, PC, etc.)</li>
                <li><strong>Date Formats:</strong> Use consistent date format throughout</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dashboard Features Section */}
        <div className="section-card">
          <h3 className="section-title">🚀 Dashboard Features Enabled by Proper Data Structure</h3>
          
          <div className="features-grid">
            <div className="feature-item">
              <h4>📊 Real-time Analytics</h4>
              <p>Automatic calculation of total inventory, blocked percentages, and KPIs</p>
            </div>
            
            <div className="feature-item">
              <h4>🔍 Advanced Filtering</h4>
              <p>Filter by plant, location, material status, and search descriptions</p>
            </div>
            
            <div className="feature-item">
              <h4>📈 Visual Charts</h4>
              <p>Interactive bar charts, pie charts, and trend analysis</p>
            </div>
            
            <div className="feature-item">
              <h4>🎯 Drill-down Analysis</h4>
              <p>Click charts to drill down into specific plants, locations, or materials</p>
            </div>
            
            <div className="feature-item">
              <h4>⚠️ Blocked Stock Analysis</h4>
              <p>Identify materials with high blocked percentages and risk levels</p>
            </div>
            
            <div className="feature-item">
              <h4>📄 Detailed Reports</h4>
              <p>Export data, pagination, sorting, and comprehensive material lists</p>
            </div>
          </div>
        </div>

        {/* Example Section */}
        <div className="section-card">
          <h3 className="section-title">📋 Example Excel Structure</h3>
          <p className="section-description">
            Here's how your Excel file should look:
          </p>
          
          <div className="example-table-container">
            <table className="example-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Material Description</th>
                  <th>Plant</th>
                  <th>Storage Location</th>
                  <th>Base Unit of Measure</th>
                  <th>Unrestricted</th>
                  <th>Blocked</th>
                  <th>Stock in transfer</th>
                  <th>Batch</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>20152232</td>
                  <td>RM SODIUM SULPHATE</td>
                  <td>Y012</td>
                  <td>YP01</td>
                  <td>KG</td>
                  <td>10899.50</td>
                  <td>1230.50</td>
                  <td>0</td>
                  <td>24011717</td>
                </tr>
                <tr>
                  <td>20152233</td>
                  <td>DOVE SOAP 100G</td>
                  <td>Y013</td>
                  <td>YM99</td>
                  <td>PC</td>
                  <td>5000</td>
                  <td>250</td>
                  <td>100</td>
                  <td>24011718</td>
                </tr>
                <tr>
                  <td>20152234</td>
                  <td>SUNLIGHT DETERGENT 500ML</td>
                  <td>Y012</td>
                  <td>YP01</td>
                  <td>L</td>
                  <td>2500.75</td>
                  <td>0</td>
                  <td>50.25</td>
                  <td>24011719</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Troubleshooting Section */}
        <div className="section-card">
          <h3 className="section-title">🔧 Common Issues & Solutions</h3>
          
          <div className="troubleshooting">
            <div className="issue-item">
              <h4>❌ Issue: "Failed to load inventory data"</h4>
              <p><strong>Solution:</strong> Check that your Excel file contains all required columns with exact names</p>
            </div>
            
            <div className="issue-item">
              <h4>❌ Issue: Charts showing incorrect data</h4>
              <p><strong>Solution:</strong> Ensure numeric columns contain only numbers, no text or special characters</p>
            </div>
            
            <div className="issue-item">
              <h4>❌ Issue: Missing materials in search</h4>
              <p><strong>Solution:</strong> Check Material Description column for empty cells or inconsistent formatting</p>
            </div>
            
            <div className="issue-item">
              <h4>❌ Issue: Plant/Location filters not working</h4>
              <p><strong>Solution:</strong> Verify Plant and Storage Location columns use consistent codes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataRequirementsView;