# Smart Inventory Hub

A complete full-stack inventory management dashboard application built with modern web technologies. Features dynamic Excel file processing, advanced analytics, interactive visualizations, and comprehensive file management for enterprise inventory operations.

![Project Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Backend](https://img.shields.io/badge/Backend-NestJS-red)
![Frontend](https://img.shields.io/badge/Frontend-React-blue)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)

## 🚀 Features

- **📊 Interactive Dashboard**: Real-time KPI cards, charts, and analytics
- **📁 File Management**: Excel upload, validation, and template download
- **🔍 Advanced Filtering**: Search, status filters, plant/location filtering
- **📈 Data Visualization**: Interactive charts with drill-down capabilities
- **💱 Currency Support**: Pakistani Rupee (PKR) formatting
- **📱 Responsive Design**: Desktop, tablet, and mobile optimized
- **🔒 Type Safety**: Full TypeScript implementation
- **📚 API Documentation**: Swagger/OpenAPI integration
- **🧪 Testing**: Comprehensive unit and E2E tests

## 🏗️ Architecture

```
smart-inventory-hub/
├── inventory-backend/     # NestJS backend API
├── inventory-frontend/    # React frontend dashboard  
├── examples/             # Sample data and usage examples
└── assets/               # Shared documentation and templates
```

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS (Node.js/TypeScript)
- **Documentation**: Swagger/OpenAPI
- **File Processing**: xlsx library
- **Validation**: class-validator, class-transformer
- **Testing**: Jest

### Frontend  
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Routing**: React Router
- **Styling**: CSS Modules with responsive design

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/smart-inventory-hub.git
   cd smart-inventory-hub
   ```

2. **Setup Backend**
   ```bash
   cd inventory-backend
   npm install
   npm run start:dev
   ```
   Backend runs on http://localhost:3001
   
   API Documentation: http://localhost:3001/api/docs

3. **Setup Frontend** (in new terminal)
   ```bash
   cd inventory-frontend
   npm install
   npm run dev
   ```
   Frontend runs on http://localhost:5173

### 📂 Sample Data

Upload the sample Excel file from `inventory-backend/assets/inventory_template.xlsx` to get started with demo data.

## 🔧 Development

### Backend Commands
```bash
cd inventory-backend
npm run start:dev        # Development mode
npm run build           # Build for production
npm run start:prod      # Production mode
npm run lint            # ESLint with auto-fix
npm run test            # Unit tests
npm run test:e2e        # End-to-end tests
npm run test:cov        # Coverage report
```

### Frontend Commands  
```bash
cd inventory-frontend
npm run dev             # Development server
npm run build           # Production build
npm run preview         # Preview production build
npm run lint            # ESLint checking
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventory/metrics` | KPI statistics |
| GET | `/inventory/locations` | Location analytics |
| GET | `/inventory/plants` | Plant distribution |
| GET | `/inventory/materials` | Paginated materials |
| GET | `/inventory/blocked-materials` | Blocked stock items |
| POST | `/files/upload` | Upload Excel files |
| GET | `/files/template` | Download template |
| GET | `/files/history` | File upload history |

Complete API documentation available at `/api/docs` when backend is running.

## 📁 Project Structure

### Backend (`inventory-backend/`)
```
src/
├── inventory/           # Core inventory module
│   ├── inventory.controller.ts
│   ├── inventory.service.ts  
│   ├── inventory.interface.ts
│   └── dto/
├── files/              # File management module
│   ├── files.controller.ts
│   └── files.service.ts
├── app.module.ts       # Application setup
└── main.ts            # Bootstrap
assets/                # Static templates
└── inventory_template.xlsx
```

### Frontend (`inventory-frontend/`)
```
src/
├── components/         # React components
│   ├── CompleteDashboard.tsx
│   ├── MaterialDetails.tsx
│   ├── FileManagement.tsx
│   └── ...
├── services/          # API client
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
