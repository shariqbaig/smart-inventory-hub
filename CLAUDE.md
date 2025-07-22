# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Smart Inventory Hub - Frontend-Only Dashboard

### Overview
Production-ready **frontend-only** inventory management dashboard built with React and TypeScript. Features client-side Excel file processing, IndexedDB storage, interactive analytics, and comprehensive file management - all without requiring a backend server. Includes corporate branding, Pakistani Rupee (PKR) currency formatting, and robust data validation.

### Project Status
✅ **PRODUCTION READY** - Complete frontend-only architecture with all features functional

### Architecture - Client-Side Only
- **Frontend**: React 18 + TypeScript with Vite build system
- **Storage**: Browser IndexedDB for persistent data storage (no server required)
- **Processing**: Client-side Excel parsing with xlsx library
- **Charts**: Recharts for interactive data visualization
- **Routing**: React Router with themed navigation
- **Deployment**: Static hosting only (Vercel, Netlify, GitHub Pages)

### Key Commands

#### Development Setup
```bash
# Frontend-only development
cd inventory-frontend
npm install
npm run dev               # Runs on http://localhost:5173
```

#### Development Commands (inventory-frontend/)
```bash
npm run dev               # Development server  
npm run build             # Production build
npm run preview           # Preview production build
npm run lint              # ESLint checking
```

#### Deployment
```bash
npm run build             # Creates dist/ folder for deployment
# Deploy dist/ folder to any static hosting service
```

#### Debug Tools
```javascript
// Browser console commands:
debugStorage()            # Inspect IndexedDB storage contents
```

### Client-Side Data Operations
All operations happen locally in browser through client services:

- **Metrics Calculation** - KPI statistics (Total, Blocked, Unrestricted, Restricted)
- **Location Analytics** - Storage location analytics and drill-downs
- **Plant Analytics** - Plant distribution analytics and drill-downs  
- **Material Management** - Paginated material listings with search/filter
- **File Management** - Upload, validate, activate, and delete Excel files
- **Template Generation** - Download Excel template with sample data

### Dashboard Features
- **Interactive KPI Cards**: Clickable metrics for drill-down navigation
- **Charts**: Bar charts (locations), pie charts (plants) with click interactions
- **Advanced Filtering**: Real-time search, status filters, plant/location filters
- **Pagination**: Configurable page sizes (10, 20, 50, 100 items)
- **Drill-down Navigation**: Click any chart or KPI to view detailed materials
- **Responsive Design**: Desktop, tablet, and mobile support
- **Risk Analysis**: Categorized blocked stock by risk levels

### Data Processing
- **Source**: `blocked_stock.XLSX` (2,887 inventory items)
- **Analytics**: ~44.67M total inventory, ~771K blocked units
- **Top Plants**: Y012 (21M units), Y013 (1.17M units)
- **Top Locations**: YP01 (18.5M units), YM99 (1.36M units)
- **Processing**: In-memory data processing for fast API responses

### Code Architecture - Frontend Only

#### Core Service Layer (`inventory-frontend/src/services/`)
- **dataStorage.ts** (383 lines) - IndexedDB wrapper with schema management
- **inventoryService.ts** (681 lines) - Main business logic and data processing engine
- **excelProcessor.ts** (792 lines) - File upload, validation, and Excel processing
- **clientApi.ts** - Drop-in API replacement for frontend-only operations
- **init.ts** - Application initialization and service bootstrapping

#### Component Architecture (`inventory-frontend/src/components/`)
**Core Application:**
- **AppRouter.tsx** - Application routing logic
- **RouterDashboard.tsx** - Main dashboard with router integration
- **FileManagement.tsx** - File upload/management interface
- **CompleteDashboard.tsx** - Legacy dashboard view
- **MaterialDetails.tsx** - Material listings with search/filters

**Analytics Views:**
- **LocationsListView.tsx** - Location analytics and drill-downs
- **PlantsListView.tsx** - Plant analytics and drill-downs  
- **MaterialsSummaryView.tsx** - Blocked materials analysis
- **RestrictedMaterialsView.tsx** - Restricted stock analysis
- **DataRequirementsView.tsx** - Excel format documentation
- **[12+ additional specialized analytics views]**

**Utility Components:**
- **KpiCard.tsx** - Reusable metric cards with drill-down
- **ThemeToggle.tsx** - Dark/light theme switching
- **ScrollToTop.tsx** - Navigation helper

#### Data Flow Architecture
```
Excel Upload → excelProcessor.ts → dataStorage.ts (IndexedDB) 
             ↓
Router Dashboard → inventoryService.ts → clientApi.ts → Analytics Views
```

### IndexedDB Storage Schema
**Database:** `InventoryHub` (version 1)
**Object Stores:**
- **inventory** - Material records with indexes (material, plant, storageLocation, status, fileId)
- **files** - File metadata and upload history
- **settings** - App configuration and active file tracking

### Browser Requirements
- **Storage**: IndexedDB support required (~250MB limit per domain)
- **Processing**: Client-side XLSX parsing capability
- **Memory**: Handles large datasets (2000+ inventory items) in memory
- **Offline**: Fully functional offline after initial load

### Development Practices
- **Type Safety**: Full TypeScript with strict configuration
- **Code Quality**: ESLint flat configuration with React hooks
- **Error Handling**: Comprehensive validation and user feedback
- **Performance**: Debounced search (300ms), efficient data filtering
- **Build**: TypeScript project references with manual chunk splitting

### Important Implementation Details
- **Excel Processing**: Client-side using `xlsx` library in `excelProcessor.ts`
- **Charts**: Recharts for all interactive data visualizations
- **Search**: Debounced for performance with real-time filtering
- **Navigation**: Drill-down interactions with router state management
- **Theming**: Dark/light mode with theme context
- **Responsive**: Desktop, tablet, mobile breakpoints
- **File Templates**: Generated client-side with sample data
- **Data Persistence**: All data stored in browser IndexedDB
- **Build Output**: Static files for deployment to any CDN/hosting

### File Management - Client-Side
**File Upload & Processing:**
- **Upload Interface**: Drag-and-drop with real-time validation
- **File Types**: .xlsx, .xls (10MB max size)
- **Required Columns**: Material, Description, Plant, Storage Location, Unrestricted Stock, Blocked Stock
- **Validation**: Comprehensive error/warning reporting with detailed feedback
- **Processing**: Client-side Excel parsing with automatic data conversion

**Template Generation:**
- **Template Creation**: Generated client-side using XLSX library
- **Sample Data**: Includes properly formatted example rows
- **Download**: Direct browser download (no server required)

**File History:**
- **Storage**: All metadata stored in IndexedDB
- **Tracking**: Upload timestamps, validation status, record counts
- **Management**: Activate/deactivate files, deletion with cleanup

### Key Dependencies
- **Core**: React 18, TypeScript, Vite
- **Data**: xlsx (Excel processing), Recharts (charts)
- **Storage**: IndexedDB (built-in browser API)
- **Routing**: React Router
- **Styling**: CSS Modules, React Icons
- **Development**: ESLint, TypeScript compiler

### Debugging Tools
**Browser Console Commands:**
```javascript
debugStorage()                    # Inspect IndexedDB contents
inventoryService.isDataLoaded_()  # Check service data state
inventoryService.getDataCount()   # Get loaded record count
```

**Service State Monitoring:**
- Monitor `[DataStorage]` logs for IndexedDB operations
- Check `[InventoryService]` logs for data processing
- Watch `[ExcelProcessor]` logs for file validation
- Review activation sequence logs during file switching

### Build Configuration
- **Vite Config**: Manual chunk splitting (vendor, charts, excel libraries)
- **TypeScript**: Project references with strict type checking
- **Target**: ES2015 for broad browser compatibility
- **Output**: Static files for deployment to any hosting service
- **Assets**: All resources bundled for offline capability

### Common Development Workflows
**New Feature Development:**
1. Implement in appropriate service layer (`services/`)
2. Add TypeScript interfaces in `types/`
3. Create or update React components
4. Test with browser debug tools
5. Run `npm run lint` and `npm run build`

**File Processing Issues:**
1. Check browser console for `[ExcelProcessor]` logs
2. Use `debugStorage()` to inspect IndexedDB state
3. Verify file activation sequence in `[InventoryService]` logs
4. Test with template file for validation baseline

## Testing Infrastructure

### Test Framework
- **Vitest**: Modern test runner with Vite integration
- **React Testing Library**: Component testing with user-centric approach
- **V8 Coverage**: Accurate code coverage reporting
- **Fake IndexedDB**: Browser storage mocking for tests

### Test Commands
```bash
cd inventory-frontend

npm test                  # Run all tests in watch mode
npm run test:run          # Run tests once
npm run test:ui           # Run tests with UI dashboard
npm run test:coverage     # Generate coverage report
npm run test:watch        # Run tests in watch mode
```

### Test Structure
```
src/
├── services/
│   ├── dataStorage.test.ts        # Storage layer tests (95% coverage)
│   ├── inventoryService.test.ts   # Business logic tests (90% coverage)
│   └── excelProcessor.test.ts     # File processing tests (85% coverage)
├── components/
│   ├── KpiCard.test.tsx           # Component rendering tests
│   ├── ThemeToggle.test.tsx       # Theme switching tests
│   └── FileManagement.test.tsx    # File upload UI tests
└── test/
    ├── integration/
    │   └── fileUploadWorkflow.test.ts # End-to-end workflow tests
    └── utils/
        └── testUtils.tsx          # Testing utilities and helpers
```

### Coverage Targets
- **Services**: 80%+ coverage (critical business logic)
- **Components**: 70%+ coverage (user interface)
- **Integration**: Complete workflow coverage
- **Overall**: 80%+ lines, branches, functions, statements

### Test Categories
1. **Unit Tests**: Individual function and method testing
2. **Component Tests**: React component rendering and interaction
3. **Integration Tests**: Complete file upload and processing workflows
4. **Mock Tests**: Service dependencies and browser API mocking