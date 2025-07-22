# Smart Inventory Hub - Frontend Dashboard

A modern React TypeScript frontend for the Smart Inventory Hub, featuring interactive dashboards, advanced analytics, file management, and responsive design. Built with Vite for optimal development experience and performance.

![React](https://img.shields.io/badge/Framework-React%2018-blue)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)
![Vite](https://img.shields.io/badge/Build-Vite-purple)

## 🚀 Features

- **📊 Interactive Dashboard**: Real-time KPI cards with drill-down navigation
- **📈 Data Visualization**: Interactive charts using Recharts library
- **🔍 Advanced Filtering**: Real-time search with debouncing, multi-criteria filtering
- **📁 File Management**: Drag & drop Excel upload with validation feedback
- **📱 Responsive Design**: Mobile-first approach with desktop, tablet, mobile support
- **💱 Localization**: Pakistani Rupee (PKR) currency formatting
- **🎨 Modern UI**: Clean, corporate design with consistent branding
- **⚡ Performance**: Optimized rendering and efficient state management

## 🏗️ Architecture

```
src/
├── components/              # React components
│   ├── CompleteDashboard.tsx     # Main dashboard container
│   ├── MaterialDetails.tsx       # Material listings with pagination
│   ├── PlantsListView.tsx        # Plant analytics view
│   ├── LocationsListView.tsx     # Location analytics view  
│   ├── MaterialsSummaryView.tsx  # Blocked materials analysis
│   ├── DataRequirementsView.tsx  # Excel format documentation
│   ├── KpiCard.tsx              # Reusable KPI components
│   └── FileManagement.tsx       # File upload interface
├── services/
│   └── api.ts                   # Centralized API client
├── types/
│   └── index.ts                 # TypeScript type definitions
├── contexts/
│   └── ThemeContext.tsx         # Theme management context
├── App.tsx                      # Root application component
└── main.tsx                     # Application entry point

public/
├── index.html                   # HTML template
└── assets/                      # Static assets and branding
```

## 🛠️ Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with HMR (Hot Module Replacement)
- **Charts**: Recharts for interactive data visualization
- **HTTP Client**: Axios for API communication
- **Routing**: React Router for navigation
- **Styling**: CSS Modules with responsive breakpoints
- **State Management**: React hooks with context for global state
- **Code Quality**: ESLint with TypeScript-aware rules

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend API running on http://localhost:3001

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📊 Dashboard Features

### KPI Cards
- **Total Inventory**: Complete stock overview with formatting
- **Blocked Stock**: Items with quality or process blocks
- **Unrestricted Stock**: Available inventory for use
- **Interactive Navigation**: Click any KPI to drill down

### Charts & Analytics
- **Location Bar Chart**: Stock distribution by storage location
- **Plant Pie Chart**: Inventory breakdown by manufacturing plant
- **Click Interactions**: Navigate to detailed views from charts
- **Responsive Design**: Charts adapt to screen sizes

### Data Tables
- **Pagination**: 10, 20, 50, 100 items per page options
- **Search**: Real-time search with 300ms debouncing
- **Filtering**: Status, plant, location multi-criteria filters
- **Sorting**: Clickable column headers for data sorting

### File Management
- **Drag & Drop Upload**: Intuitive file upload interface
- **Real-time Validation**: Immediate feedback on file structure
- **Progress Tracking**: Visual upload progress indicators
- **Error Handling**: Detailed error messages and corrections

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server with HMR
npm run dev -- --host    # Expose dev server to network

# Production
npm run build            # TypeScript compilation + Vite build
npm run preview          # Preview production build locally

# Code Quality  
npm run lint             # ESLint checking with TypeScript rules
npm run lint:fix         # Auto-fix ESLint issues
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
@media (min-width: 768px)  { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1280px) { /* Large Desktop */ }
```

### Features by Screen Size
- **Mobile**: Stacked layout, simplified navigation, touch-optimized
- **Tablet**: Grid layouts, collapsible sidebars, optimized spacing
- **Desktop**: Full feature set, multi-column layouts, hover states

## 🔗 API Integration

### API Client Configuration
```typescript
// services/api.ts
const API_BASE_URL = 'http://localhost:3001';

export const api = {
  inventory: {
    getMetrics: () => get('/inventory/metrics'),
    getMaterials: (params) => get('/inventory/materials', { params }),
    getLocations: () => get('/inventory/locations'),
    getPlants: () => get('/inventory/plants')
  },
  files: {
    upload: (file) => post('/files/upload', formData),
    getTemplate: () => get('/files/template', { responseType: 'blob' }),
    getHistory: () => get('/files/history')
  }
};
```

### Error Handling
- Global error boundaries for component failures
- API error interceptors with user-friendly messages
- Loading states and retry mechanisms
- Network connectivity detection

## 🎨 Styling & Theming

### CSS Architecture
- **CSS Modules**: Component-scoped styling
- **Global Styles**: Consistent typography and spacing
- **CSS Variables**: Theme colors and responsive breakpoints
- **Utility Classes**: Common patterns and helpers

### Theme Configuration
```css
:root {
  --primary-color: #2563eb;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --background-color: #f8fafc;
  --surface-color: #ffffff;
}
```

## 📊 Data Visualization

### Chart Types & Usage
- **Bar Charts**: Location stock distribution, comparative analytics
- **Pie Charts**: Plant distribution, categorical data representation
- **Interactive Features**: Click events, tooltips, hover states
- **Responsive Charts**: Auto-resize based on container dimensions

### Chart Configuration
```typescript
// Recharts implementation
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={locationData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="location" />
    <YAxis />
    <Tooltip formatter={(value) => formatNumber(value)} />
    <Bar dataKey="totalStock" fill="#2563eb" onClick={handleLocationClick} />
  </BarChart>
</ResponsiveContainer>
```

## 🔍 Search & Filtering

### Search Implementation
- **Debounced Input**: 300ms delay to reduce API calls
- **Real-time Results**: Immediate visual feedback
- **Fuzzy Matching**: Material and description search
- **Search History**: Recent searches for user convenience

### Filter Options
- **Status Filter**: All, Blocked, Unrestricted, Restricted
- **Plant Filter**: Multi-select plant options
- **Location Filter**: Storage location selection
- **Combined Filters**: Multiple criteria simultaneously applied

## 🧪 Testing

### Test Setup
```bash
# Run tests (when implemented)
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode  
npm run test:watch
```

### Testing Strategy
- Component unit tests with React Testing Library
- Integration tests for user workflows
- E2E tests for critical user journeys
- Visual regression testing for UI consistency

## 🚦 Deployment

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Netlify Deployment
```bash
# Build and deploy
npm run build
# Deploy dist/ folder to Netlify
```

### Docker Support
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

## ⚙️ Configuration

### Environment Variables
```env
# .env.local
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_TITLE="Smart Inventory Hub"
VITE_ENABLE_ANALYTICS=true
```

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

## 📈 Performance Optimization

### Build Optimization
- **Code Splitting**: Lazy loading for route components
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image and bundle size optimization
- **Caching**: Browser caching strategies for static assets

### Runtime Performance
- **React.memo**: Prevent unnecessary re-renders
- **useMemo/useCallback**: Expensive computation caching
- **Virtual Scrolling**: Efficient large list rendering
- **Debouncing**: API call rate limiting

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Follow TypeScript strict mode requirements
3. Add tests for new components/features
4. Update documentation as needed
5. Ensure ESLint passes before committing

### Code Standards
- Use TypeScript interfaces for all data structures
- Follow React functional components with hooks
- Implement proper error boundaries
- Add loading states for async operations

## 📖 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Recharts Documentation](https://recharts.org/en-US/)
- [React Router](https://reactrouter.com/)

---

**Part of the Smart Inventory Hub project - Built with React, TypeScript & Vite** ⚡