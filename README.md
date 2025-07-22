# Smart Inventory Hub

A modern **frontend-only** inventory management dashboard application that runs entirely in the browser. Features dynamic Excel file processing, advanced analytics, interactive visualizations, and comprehensive file management - all without requiring a backend server.

![Project Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Architecture](https://img.shields.io/badge/Architecture-Frontend%20Only-blue)
![Frontend](https://img.shields.io/badge/Frontend-React-blue)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)
![Storage](https://img.shields.io/badge/Storage-IndexedDB-orange)

## 🚀 Features

- **📊 Interactive Dashboard**: Real-time KPI cards, charts, and analytics
- **📁 File Management**: Excel upload, validation, and template download
- **🔍 Advanced Filtering**: Search, status filters, plant/location filtering
- **📈 Data Visualization**: Interactive charts with drill-down capabilities
- **💱 Currency Support**: Pakistani Rupee (PKR) formatting
- **📱 Responsive Design**: Desktop, tablet, and mobile optimized
- **🔒 Type Safety**: Full TypeScript implementation
- **💾 Local Storage**: Browser-based IndexedDB for persistent data storage
- **🌐 Offline Capable**: Works completely offline once loaded
- **⚡ Zero Backend**: No server setup or maintenance required

## 🏗️ Architecture

**Frontend-Only Architecture** - No backend server required!

```
smart-inventory-hub/
├── inventory-frontend/    # React frontend dashboard (main application)
└── examples/             # Sample Excel files and usage examples
```

**Data Flow:**
```
Excel Upload → Client-Side Processing → IndexedDB Storage → Dashboard Analytics
```

## 🛠️ Tech Stack

**Frontend-Only Stack:**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Charts**: Recharts for interactive data visualization
- **File Processing**: xlsx library for client-side Excel processing
- **Storage**: IndexedDB for persistent browser storage
- **Routing**: React Router for navigation
- **Icons**: React Icons for UI components
- **Styling**: CSS Modules with responsive design
- **Deployment**: Static hosting (Vercel, Netlify, GitHub Pages)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern browser with IndexedDB support

### Installation & Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/smart-inventory-hub.git
   cd smart-inventory-hub
   ```

2. **Setup and Run**
   ```bash
   cd inventory-frontend
   npm install
   npm run dev
   ```
   Application runs on http://localhost:5173

3. **Production Build**
   ```bash
   npm run build
   npm run preview  # Test production build
   ```

### 📂 Sample Data

Use the sample Excel files from the `examples/` folder or download the template directly from the app.

## 🔧 Development Commands

```bash
cd inventory-frontend

npm run dev             # Development server
npm run build           # Production build
npm run preview         # Preview production build
npm run lint            # ESLint checking
```

## 🚀 Deployment

### Static Hosting
Since this is a frontend-only application, you can deploy it to any static hosting service:

```bash
npm run build           # Creates `dist/` folder
```

**Deployment Options:**
- **Vercel**: `npm i -g vercel && vercel --prod`
- **Netlify**: Drag & drop `dist/` folder to Netlify dashboard
- **GitHub Pages**: Upload `dist/` contents to gh-pages branch
- **Any CDN**: Serve the `dist/` folder content

## 💾 Data Storage

**Browser-based Storage:**
- All data stored locally in browser's IndexedDB
- No server or database required
- Data persists across browser sessions
- Typical storage limit: ~250MB per domain
- Privacy-focused: data never leaves your browser

## 📁 Project Structure

### Main Application (`inventory-frontend/`)
```
src/
├── components/         # React components
│   ├── CompleteDashboard.tsx
│   ├── MaterialDetails.tsx
│   ├── FileManagement.tsx
│   └── ...
├── services/          # Client-side services  
│   ├── clientApi.ts        # Drop-in API replacement
│   ├── dataStorage.ts      # IndexedDB wrapper
│   ├── excelProcessor.ts   # Excel file processing
│   └── inventoryService.ts # Business logic
├── types/            # TypeScript definitions
└── contexts/         # React contexts
```

## 🧪 Testing

Run the complete test suite:

```bash
# Backend tests
cd inventory-backend
npm run test           # Unit tests
npm run test:e2e       # Integration tests
npm run test:cov       # Coverage report

# Frontend tests  
cd inventory-frontend
npm run test           # Component tests
```

## 📊 Features Overview

### Dashboard Analytics
- **KPI Cards**: Total inventory, blocked stock, unrestricted stock
- **Interactive Charts**: Click to drill down into specific data
- **Real-time Filtering**: Search materials, filter by status/location
- **Pagination**: Configurable page sizes (10, 20, 50, 100)

### File Management
- **Excel Upload**: Drag & drop or browse file upload
- **Real-time Validation**: Immediate feedback on file structure
- **Template Download**: Properly formatted Excel template
- **Upload History**: Track all file uploads with metadata

### Data Processing
- **Format Support**: .xlsx and .xls files
- **Validation**: Column structure and data type validation
- **Error Reporting**: Detailed error files for invalid data
- **Bulk Processing**: Handle large inventory datasets efficiently

## 🔒 Security & Best Practices

- Input validation on all API endpoints
- File type and size restrictions  
- Error handling and logging
- TypeScript strict mode
- ESLint and Prettier configuration
- Git hooks for code quality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- 📚 [API Documentation](http://localhost:3001/api/docs)
- 🐛 [Issue Tracker](https://github.com/your-username/smart-inventory-hub/issues)
- 📖 [CLAUDE.md](./CLAUDE.md) - Detailed technical documentation

## 🚦 Deployment

### Production Build
```bash
# Backend
cd inventory-backend
npm run build
npm run start:prod

# Frontend  
cd inventory-frontend
npm run build
npm run preview
```

### Environment Variables
Create `.env` files for environment-specific configuration:
- Database connections
- API endpoints
- Upload file limits
- CORS settings

---

**Built with ❤️ using NestJS, React, and TypeScript**
