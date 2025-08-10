# Smart Inventory Hub - Dashboard Metrics Documentation

## 📊 Total Inventory Calculation

### Source: `inventoryService.ts:369`

**Total Inventory** is the sum of all stock quantities across all statuses for each material:

```typescript
totalInventory = sum(
  unrestricted + 
  stockInTransfer + 
  inQualityInsp + 
  restrictedUseStock + 
  blocked
)
```

### Components of Total Inventory:
1. **Unrestricted Stock** - Available for immediate use
2. **Stock in Transfer** - Currently being transferred between locations
3. **In Quality Inspection** - Awaiting quality approval
4. **Restricted Use Stock** - Limited usage materials
5. **Blocked Stock** - Not available for use

## 🔄 Complete Data Flow Architecture

```
Excel File Upload
    ↓
excelProcessor.ts (Validation & Parsing)
    ↓
dataStorage.ts (IndexedDB Storage)
    ↓
inventoryService.ts (Business Logic & Calculations)
    ↓
clientApi.ts (API Abstraction)
    ↓
Dashboard Components (Visualization)
```

## 📈 Key Performance Indicators (KPIs)

### Primary Metrics
| Metric | Calculation | Source | Description |
|--------|------------|--------|-------------|
| **Total Inventory** | Sum of all stock types | `inventoryService.ts:369` | Total quantity across all statuses |
| **Total Blocked** | Sum of blocked stock | `inventoryService.ts:370` | Materials unavailable for use |
| **Total Unrestricted** | Sum of unrestricted stock | `inventoryService.ts:371` | Materials available for immediate use |
| **Total Restricted** | Sum of restricted stock | `inventoryService.ts:372` | Materials with usage limitations |
| **Total In Transfer** | Sum of in-transfer stock | `inventoryService.ts:373` | Materials being moved |
| **Total In Quality Inspection** | Sum of quality inspection stock | `inventoryService.ts:374` | Materials awaiting QC approval |

### Value Metrics (PKR Currency)
| Metric | Calculation Method | Source | Description |
|--------|-------------------|--------|-------------|
| **Total Inventory Value** | Unit value × Total quantity | `inventoryService.ts:375` | Total monetary value of all inventory |
| **Total Blocked Value** | Unit value × Blocked quantity | `inventoryService.ts:376` | Value of blocked materials |
| **Total Unrestricted Value** | Direct from valueUnrestricted field | `inventoryService.ts:377` | Value of available materials |
| **Total Restricted Value** | Unit value × Restricted quantity | `inventoryService.ts:378` | Value of restricted materials |
| **Total In Transfer Value** | Unit value × Transfer quantity | `inventoryService.ts:379` | Value of materials in transit |
| **Total In QC Value** | Unit value × QC quantity | `inventoryService.ts:380` | Value of materials in quality check |

### Calculated Percentages
- **Blocked Percentage** = (Total Blocked / Total Inventory) × 100
- **Unrestricted Percentage** = (Total Unrestricted / Total Inventory) × 100
- **Transfer Percentage** = (Total In Transfer / Total Inventory) × 100
- **QC Percentage** = (Total In Quality Inspection / Total Inventory) × 100

## 📍 Location Analytics

### Location Statistics (`getLocationStats`)
For each storage location, the system calculates:
- **Total Quantity** - Sum of all materials at location
- **Blocked Quantity** - Blocked materials at location
- **Unrestricted Quantity** - Available materials at location
- **Material Count** - Number of unique materials
- **Total Value** - Monetary value at location
- **Blocked Value** - Value of blocked materials
- **Unrestricted Value** - Value of available materials

Locations are sorted by total quantity in descending order for quick identification of major storage areas.

## 🏭 Plant Analytics

### Plant Statistics (`getPlantStats`)
For each plant, the system tracks:
- **Total Quantity** - Sum of all materials at plant
- **Blocked Quantity** - Blocked materials at plant
- **Unrestricted Quantity** - Available materials at plant
- **Material Count** - Number of unique materials
- **Locations Array** - List of storage locations within plant
- **Total Value** - Total monetary value at plant
- **Blocked Value** - Value of blocked materials
- **Unrestricted Value** - Value of available materials

Plants are sorted by total quantity for performance comparison.

## 📱 Dashboard Views & Visualizations

### 1. Main Dashboard (`CompleteDashboard.tsx`)
- **KPI Cards**: Interactive cards showing primary metrics
  - Total Inventory (Blue #0F4C8C)
  - Blocked Stock (Red #DC2626)
  - Unrestricted Stock (Green #059669)
  - In Transfer (Orange #EA580C)
  - Quality Inspection (Purple #7C3AED)
  - Restricted Stock (Yellow #CA8A04)

### 2. Chart Visualizations

#### Location Distribution (Pie Chart)
- Top 10 locations by quantity
- Interactive drill-down on click
- Color-coded segments

#### Plant Performance (Bar Chart)
- Comparative view of all plants
- Stacked bars showing stock types
- Click-to-drill functionality

#### Inventory Trends (Area Chart)
- 6-month historical simulation
- Total vs Blocked stock trends
- Percentage tracking over time

### 3. Specialized Analytics Views

| View | Purpose | Key Metrics |
|------|---------|-------------|
| **Materials Summary** | Overview of all materials | Total count, status distribution |
| **Location Utilization** | Storage efficiency analysis | Capacity usage, optimization metrics |
| **Plant Performance** | Multi-plant comparison | Efficiency scores, blocked ratios |
| **Value Analysis** | Financial breakdown | Value by category, high-value items |
| **Inventory Trends** | Historical patterns | Trend lines, projections |
| **Shelf Life Analysis** | Expiry management | SLED alerts, aging inventory |
| **In-Transfer Materials** | Transit tracking | Transfer volumes, destinations |
| **Quality Inspection** | QC queue management | Pending inspections, aging |
| **Restricted Materials** | Special handling items | Restriction reasons, compliance |

## 🔍 Drill-Down Navigation

The dashboard supports multi-level drill-down:

1. **KPI Card Click** → Filtered material list
2. **Chart Segment Click** → Location/Plant specific view
3. **Material Row Click** → Detailed material information
4. **Back Navigation** → Return to previous view with context

### Drill-Down Filters
```typescript
interface DrillDownFilter {
  plant?: string;
  storageLocation?: string;
  material?: number;
  materialDescription?: string;
  status?: 'blocked' | 'unrestricted' | 'restricted' | 'in-transfer' | 'quality-inspection';
}
```

## 📦 Material Status Determination

Status priority (highest to lowest):
1. **Blocked** - If blocked > 0
2. **Restricted** - If restrictedUseStock > 0
3. **In-Transfer** - If stockInTransfer > 0
4. **Quality Inspection** - If inQualityInsp > 0
5. **Unrestricted** - Default if none of above

## 💾 Data Processing Pipeline

### 1. Excel Upload & Validation
- File type validation (.xlsx, .xls)
- Size limit check (10MB max)
- Structure validation (required columns)
- Data type conversion
- Error/Warning reporting

### 2. Data Storage (IndexedDB)
- Database: `InventoryHub`
- Stores: `inventory`, `files`, `settings`
- Indexes: material, plant, storageLocation, status, fileId
- Capacity: ~250MB browser limit

### 3. Service Layer Processing
```javascript
// inventoryService.ts flow
1. loadInventoryData(data) - Process raw Excel data
2. processArrayData()/processObjectData() - Format conversion
3. completeDataProcessing() - Store in IndexedDB
4. getInventoryMetrics() - Calculate all metrics
5. getLocationStats()/getPlantStats() - Generate analytics
```

### 4. API Abstraction (`clientApi.ts`)
- Singleton pattern for service management
- Automatic initialization check
- Error handling and retry logic
- Session persistence via IndexedDB

## 🎯 Performance Optimizations

### Calculation Efficiency
- **In-memory caching**: Metrics calculated once per data load
- **Lazy loading**: Charts rendered on-demand
- **Debounced search**: 300ms delay for search operations
- **Pagination**: Configurable limits (10, 20, 50, 100 items)

### Value Calculation Logic
Unit value estimation for materials without direct values:
```typescript
unitValue = valueUnrestricted / unrestricted
totalValue = unitValue * totalQuantity
```

## 📊 Metric Aggregation Rules

### Sum Aggregation
Used for quantity metrics:
```typescript
sum(data, fields) = data.reduce((total, item) => 
  total + fields.reduce((fieldTotal, field) => 
    fieldTotal + (item[field] || 0), 0), 0)
```

### Value Aggregation
For monetary calculations:
- Base unit value from unrestricted stock
- Applied proportionally to other stock types
- Handles zero-division cases gracefully

## 🔧 Debug Utilities

Browser console commands:
```javascript
debugStorage()                          // Inspect IndexedDB contents
inventoryService.isDataLoaded_()        // Check data load status
inventoryService.getDataCount()         // Get record count
inventoryService.getInventoryMetrics()  // View current metrics
```

## 📈 Business Intelligence Features

### Automatic Insights Generation
- Blocked percentage alerts (>10% triggers warning)
- Top performers identification
- Underutilized locations detection
- Value concentration analysis

### Export Capabilities
- Excel template download
- Processed data export
- Report generation (planned)

## 🚀 Real-time Updates

The dashboard refreshes automatically when:
1. New file is uploaded
2. Active file is switched
3. Manual refresh triggered
4. Filter/drill-down applied

## 💡 Key Technical Details

### Data Capacity
- **Typical dataset**: 3,000+ items
- **Total value range**: 45M+ PKR
- **Processing time**: <2 seconds for 3K items
- **Storage limit**: 250MB (browser IndexedDB)

### Browser Compatibility
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Requires: IndexedDB, File API, ES2015+
- Mobile responsive (iOS Safari, Chrome Mobile)

### Currency Formatting
All monetary values displayed in PKR (Pakistani Rupee) format:
```typescript
value.toLocaleString('en-PK', { 
  style: 'currency', 
  currency: 'PKR' 
})
```

## 🔐 Data Security

- **Client-side only**: No data leaves browser
- **IndexedDB isolation**: Domain-specific storage
- **No external APIs**: Complete offline capability
- **Session persistence**: Survives browser refresh

## 📝 Notes

- All calculations happen in real-time on the client side
- No backend server or database required
- Data persists across browser sessions via IndexedDB
- Supports multiple file management with quick switching
- Enterprise-scale performance with 3K+ inventory items