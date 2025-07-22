# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Inventory Dashboard Application

### Overview
Complete **frontend-only** inventory dashboard application built with React, featuring dynamic Excel file processing for enterprise inventory management and analytics. All processing happens client-side with browser-based storage - no backend server required. Features corporate branding, Pakistani Rupee (PKR) currency formatting, and production-ready architecture with advanced file validation and elegant data storytelling.

### Project Status
✅ **PRODUCTION READY** - Frontend-only architecture with all features implemented and functional

### Architecture
- **Frontend-Only**: React (TypeScript) with Vite build system
- **Storage**: Browser IndexedDB for persistent data storage
- **Charts**: Recharts for interactive data visualization
- **Data Processing**: Client-side Excel file processing with xlsx library
- **Styling**: Corporate branding and responsive design
- **Deployment**: Static hosting (Vercel, Netlify, GitHub Pages)

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

### Code Architecture

#### Backend Structure (`inventory-backend/`)
```
src/
├── inventory/             # Main inventory module
│   ├── inventory.controller.ts # REST API endpoints
│   ├── inventory.service.ts    # Business logic & Excel processing  
│   ├── inventory.interface.ts  # TypeScript interfaces
│   └── dto/                   # Data Transfer Objects
├── files/                     # File management module
│   ├── files.controller.ts    # File upload/download endpoints
│   └── files.service.ts       # File processing & validation
├── app.module.ts             # Application configuration
└── main.ts                   # Bootstrap with Swagger setup
assets/                       # Static template files
└── inventory_template.xlsx   # Excel template for uploads
uploads/                      # Runtime file uploads (gitignored)
```

#### Frontend Structure (`inventory-frontend/src/`)
```
components/               # React components
├── CompleteDashboard.tsx      # Main dashboard view
├── MaterialDetails.tsx        # Material listings with search/filters
├── PlantsListView.tsx        # Plant analytics view
├── LocationsListView.tsx     # Location analytics view
├── MaterialsSummaryView.tsx   # Blocked materials analysis
├── DataRequirementsView.tsx  # Excel format documentation
├── KpiCard.tsx              # Reusable KPI components
└── FileManagement.tsx       # File upload interface
services/api.ts           # Centralized API client
types/index.ts           # TypeScript definitions
contexts/ThemeContext.tsx # Theme management
```

### Development Practices
- **Type Safety**: Full TypeScript coverage with strict configuration
- **Testing**: Jest unit tests, E2E tests, coverage reporting
- **Code Quality**: ESLint with auto-fix, Prettier formatting
- **API Documentation**: Swagger/OpenAPI with interactive docs
- **Error Handling**: Comprehensive error boundaries and validation
- **Performance**: Debounced search (300ms), efficient data filtering

### Important Implementation Notes
- Excel file processing happens in `inventory.service.ts` and `files.service.ts` using `xlsx` library
- Frontend uses Recharts for all chart visualizations
- Search functionality is debounced for performance
- All drill-down interactions maintain state for back navigation
- Corporate branding assets in `public/` directory
- Responsive breakpoints handle desktop, tablet, and mobile layouts
- Template files stored in `assets/` directory for version control
- Upload files stored in `uploads/` directory (gitignored)
- `.gitignore` configured to exclude node_modules, uploads, build artifacts

### File Management
Backend provides comprehensive file management via `/files` endpoints:

#### File Upload (`/files/upload`)
- **Required columns**: Material, Description, Plant, Storage Location, Unrestricted Stock, Blocked Stock
- **File types**: .xlsx, .xls
- **Size limit**: Configured in NestJS multer setup
- **Validation**: Real-time Excel validation with error reporting

#### Template Download (`/files/template`)
- Downloads `inventory_template.xlsx` from `assets/` directory
- Provides properly formatted Excel template for uploads
- Template moved from uploads to assets for version control

#### File History (`/files/history`)
- Tracks all uploaded files with metadata
- Stores upload timestamps, validation status, record counts
- File history stored in `uploads/file-history.json` (gitignored)

### Known Dependencies
- **Backend**: NestJS, Swagger, xlsx, class-validator, class-transformer
- **Frontend**: React, Vite, Recharts, Axios, React Router
- **Development**: TypeScript, ESLint, Jest, Prettier

### Debugging Tips
- Use Swagger docs for API testing: `http://localhost:3001/api/docs`
- Backend logs Excel processing details for troubleshooting
- Frontend console shows API call details and component state
- Test backend logic directly with `node test-service.js`