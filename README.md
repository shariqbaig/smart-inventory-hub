# Smart Inventory Hub

A modern **frontend-only** inventory management dashboard that runs entirely in the browser. Features client-side Excel processing, persistent IndexedDB storage, interactive analytics, and comprehensive file management - all without requiring a backend server.

![Live Demo](https://img.shields.io/badge/Live%20Demo-Netlify-00C7B7?style=for-the-badge&logo=netlify)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge)
![Architecture](https://img.shields.io/badge/Architecture-Frontend%20Only-blue?style=for-the-badge)
![Coverage](https://img.shields.io/badge/Test%20Coverage-75%25+-green?style=for-the-badge)

## 🚀 Live Demo

**[View Live Application on Netlify](https://your-app-name.netlify.app)**

Try the application with sample data from the `examples/` folder or download the template directly from the app.

## ✨ Features

### 📊 **Interactive Dashboard**
- **KPI Cards**: Total inventory, blocked stock, unrestricted stock with click-to-drill navigation
- **Bar Charts**: Storage location analytics with interactive click functionality
- **Pie Charts**: Plant distribution analysis with drill-down capabilities
- **Real-time Metrics**: Instant calculations with PKR currency formatting

### 📁 **File Management System**
- **Excel Upload**: Drag-and-drop interface supporting .xlsx and .xls files (up to 10MB)
- **Real-time Validation**: Comprehensive file structure and data validation
- **File History**: Track all uploads with metadata, validation status, and record counts
- **File Activation**: Switch between multiple uploaded files seamlessly
- **Template Download**: Pre-formatted Excel template with sample data

### 🔍 **Advanced Analytics**
- **Plant Analysis**: Detailed plant-wise inventory distribution and performance metrics
- **Location Analysis**: Storage location utilization and capacity insights
- **Materials Summary**: Blocked stock analysis with risk categorization
- **Advanced Filtering**: Search materials with debounced input (300ms) and status filters
- **Pagination**: Configurable page sizes (10, 20, 50, 100 items per page)

### 🎨 **Professional UI/UX**
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Corporate Branding**: Professional styling with consistent visual hierarchy
- **Loading States**: Smooth transitions and user feedback during operations
- **Error Handling**: Comprehensive error messages and recovery options
- **PKR Currency**: Pakistani Rupee formatting throughout the application

## 🏗️ Architecture

**Complete Frontend-Only Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Excel Upload  │ ─> │  Client Processing │ ─> │ IndexedDB Storage │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Dashboard    │ <─ │   Analytics API   │ <─ │  Data Services  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

- **No Backend Required**: All processing happens in the browser
- **Persistent Storage**: Data saved locally using IndexedDB (~250MB capacity)
- **Offline Capable**: Full functionality after initial page load
- **Static Hosting**: Deployable to any CDN or static hosting service

## 🛠️ Tech Stack

- **Framework**: React 19.1.0 with TypeScript 5.8.3
- **Build Tool**: Vite 7.0.4 (fast builds and hot reload)
- **Charts**: Recharts 3.1.0 (interactive data visualization)
- **File Processing**: xlsx 0.18.5 (client-side Excel parsing)
- **Storage**: IndexedDB with custom service wrapper
- **Routing**: React Router DOM 6.30.1
- **Icons**: React Icons 5.5.0
- **Testing**: Vitest with React Testing Library (75%+ coverage)
- **Deployment**: Netlify with automated CI/CD

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (LTS version recommended)
- **npm** or **yarn**
- **Modern Browser** with IndexedDB support

### Development Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/smart-inventory-hub.git
   cd smart-inventory-hub/inventory-frontend
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   Application runs at `http://localhost:5173`

3. **Load Sample Data**
   - Download template from app and add your data

### Available Commands

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Create production build
npm run preview      # Preview production build locally
npm run lint         # Run ESLint code analysis

# Testing
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Interactive test dashboard
npm run test:coverage # Generate coverage report
```

## 🌐 Deployment

### Netlify Deployment (Recommended)

The application is pre-configured for Netlify deployment:

1. **Automatic Deployment**
   - Connect your GitHub repository to Netlify
   - Netlify will auto-detect the `netlify.toml` configuration
   - Automatic builds on every push to main branch

2. **Manual Deployment**
   ```bash
   npm run build
   # Upload the generated `dist/` folder to Netlify dashboard
   ```

3. **Configuration Included**
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Node Version**: 18
   - **SPA Routing**: Configured with proper redirects
   - **Asset Caching**: Optimized cache headers for performance

### Other Hosting Options

Since this is a static application, you can deploy to:

- **Vercel**: `npm i -g vercel && vercel --prod`
- **GitHub Pages**: Upload `dist/` contents to gh-pages branch
- **AWS S3/CloudFront**: Static website hosting
- **Any CDN**: Serve the `dist/` folder contents

## 💾 Data Management

### Storage System
- **Local Storage**: All data stored in browser's IndexedDB
- **Persistence**: Data survives browser restarts and updates
- **Capacity**: Typically 250MB+ per domain (browser-dependent)
- **Privacy**: Data never leaves your browser - completely private

### File Processing
- **Supported Formats**: .xlsx and .xls Excel files
- **File Size Limit**: 10MB maximum
- **Required Columns**: Material, Description, Plant, Storage Location, Unrestricted Stock, Blocked Stock
- **Flexible Mapping**: Intelligent column name matching and data type conversion
- **Validation**: Real-time structure validation with detailed error reporting

### Data Features
- **Multiple Files**: Upload and manage multiple Excel files
- **File Activation**: Switch between different datasets instantly
- **Data Validation**: Comprehensive validation with warnings and errors
- **Export Ready**: Process data for further analysis or reporting

## 🧪 Testing

Comprehensive test suite with 130+ test cases covering:

### Test Coverage
- **Unit Tests**: Core services (dataStorage, inventoryService, excelProcessor)
- **Component Tests**: React components with user interaction testing
- **Integration Tests**: Complete file upload and processing workflows
- **Coverage Target**: 75% minimum across lines, branches, functions, statements

### Running Tests
```bash
npm test                    # Interactive watch mode
npm run test:coverage       # Generate detailed coverage report
npm run test:ui             # Visual test dashboard
```

## 🔧 Development

### Project Structure
```
inventory-frontend/
├── src/
│   ├── components/         # React components
│   │   ├── FileManagement.tsx     # File upload interface
│   │   ├── CompleteDashboard.tsx  # Main dashboard
│   │   ├── MaterialDetails.tsx    # Material listings
│   │   └── ...                    # Analytics views
│   ├── services/          # Core business logic
│   │   ├── dataStorage.ts         # IndexedDB wrapper
│   │   ├── inventoryService.ts    # Data processing
│   │   ├── excelProcessor.ts      # File handling
│   │   └── clientApi.ts           # API abstraction
│   ├── types/             # TypeScript definitions
│   ├── contexts/          # React contexts (ThemeContext)
│   └── test/              # Test utilities and setup
├── public/                # Static assets
└── examples/              # Sample Excel files
```

### Key Services

1. **Data Storage Service** - IndexedDB wrapper for persistent storage
2. **Inventory Service** - Business logic and data processing engine  
3. **Excel Processor** - File upload, validation, and processing pipeline
4. **Client API** - Unified interface for data operations

### Development Guidelines
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency enforcement
- **Testing**: Write tests for new features using Vitest
- **Performance**: Use pagination for large datasets, debounce user inputs
- **Browser Support**: Target ES2015+ for broad compatibility

## 📊 Performance

### Benchmarks
- **Bundle Size**: ~1.26 MB total (compressed: ~357 KB)
- **Load Time**: Sub-second on modern connections
- **Processing**: Real-time Excel validation and parsing
- **Memory Usage**: Efficient for datasets up to 3,000+ items
- **Storage**: Persistent IndexedDB with automatic cleanup

### Optimization Features
- **Code Splitting**: Vendor, charts, and Excel libraries chunked separately
- **Asset Optimization**: CSS/JS minification and compression
- **Lazy Loading**: Components load on demand
- **Debounced Search**: 300ms delay prevents excessive filtering
- **Efficient Pagination**: Large datasets handled with virtual scrolling concepts

## 🔒 Security & Privacy

- **Client-Side Only**: No data transmitted to external servers
- **Local Processing**: All Excel processing happens in your browser
- **Private Storage**: IndexedDB data never leaves your device
- **File Validation**: Comprehensive input validation and sanitization
- **Type Safety**: Full TypeScript coverage prevents runtime errors
- **No Dependencies**: Minimal external library footprint

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Write** tests for your changes
4. **Run** tests and ensure coverage (`npm run test:coverage`)
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to the branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Development Setup for Contributors
```bash
git clone <your-fork>
cd smart-inventory-hub/inventory-frontend
npm install
npm test                # Ensure all tests pass
npm run lint            # Check code quality
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/smart-inventory-hub/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/smart-inventory-hub/discussions)
- 📖 **Documentation**: See [CLAUDE.md](./CLAUDE.md) for technical details
- 🚀 **Live Demo**: [Netlify Deployment](https://your-app-name.netlify.app)

---

**Built with ❤️ using React, TypeScript, and modern web technologies**