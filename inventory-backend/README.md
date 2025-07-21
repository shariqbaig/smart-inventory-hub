# Smart Inventory Hub - Backend API

A robust NestJS backend API for inventory management with Excel file processing, validation, and comprehensive analytics. Built with TypeScript and modern enterprise patterns.

![NestJS](https://img.shields.io/badge/Framework-NestJS-red)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)
![Swagger](https://img.shields.io/badge/Docs-Swagger-green)

## 🚀 Features

- **📊 Inventory Analytics**: KPI metrics, location/plant analytics, material insights
- **📁 File Processing**: Excel upload, validation, and template management
- **🔍 Advanced Filtering**: Search, pagination, and multi-criteria filtering
- **📚 API Documentation**: Interactive Swagger/OpenAPI documentation
- **🔒 Data Validation**: Comprehensive input validation with class-validator
- **🧪 Testing**: Unit tests, E2E tests, and coverage reporting
- **⚡ Performance**: Optimized data processing and caching strategies

## 🏗️ Architecture

```
src/
├── inventory/              # Core inventory module
│   ├── inventory.controller.ts   # REST API endpoints
│   ├── inventory.service.ts      # Business logic & Excel processing
│   ├── inventory.interface.ts    # TypeScript interfaces
│   └── dto/                      # Data Transfer Objects
│       └── inventory.dto.ts
├── files/                  # File management module  
│   ├── files.controller.ts       # File upload/download endpoints
│   └── files.service.ts          # File processing & validation
├── app.module.ts          # Application configuration
└── main.ts               # Bootstrap with Swagger setup

assets/                    # Static template files
└── inventory_template.xlsx   # Excel template for uploads

uploads/                   # Runtime uploads (gitignored)
├── file-history.json      # Upload tracking
└── [user-uploads]         # Uploaded Excel files
```

## 🛠️ Tech Stack

- **Framework**: NestJS (Node.js/TypeScript)
- **Documentation**: Swagger/OpenAPI 3.0
- **File Processing**: xlsx library for Excel manipulation
- **Validation**: class-validator, class-transformer
- **Testing**: Jest with supertest for E2E
- **Code Quality**: ESLint, Prettier with strict TypeScript

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# The API will be available at:
# http://localhost:3001
# Swagger docs: http://localhost:3001/api/docs
```

## 📊 API Endpoints

### Inventory Analytics

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/inventory/metrics` | Get KPI statistics | Total, blocked, unrestricted counts |
| GET | `/inventory/locations` | Location analytics | Stock distribution by storage location |
| GET | `/inventory/plants` | Plant distribution | Stock distribution by plant |
| GET | `/inventory/materials` | Paginated materials | Material listings with search/filter |
| GET | `/inventory/blocked-materials` | Blocked stock items | Materials with blocked inventory |

### Drill-down Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventory/drill-down/location/:location` | Location-specific materials |
| GET | `/inventory/drill-down/plant/:plant` | Plant-specific materials |

### File Management

| Method | Endpoint | Description | Content-Type |
|--------|----------|-------------|--------------|
| POST | `/files/upload` | Upload Excel files | multipart/form-data |
| GET | `/files/template` | Download Excel template | application/vnd.openxmlformats |
| GET | `/files/history` | File upload history | application/json |

## 📝 API Documentation

Complete interactive API documentation is available at `/api/docs` when the server is running.

### Request/Response Examples

**GET /inventory/metrics**
```json
{
  "totalInventory": 44670000,
  "totalBlocked": 771000,
  "totalUnrestricted": 43899000,
  "totalRestricted": 0,
  "blockedPercentage": 1.73
}
```

**POST /files/upload**
```bash
curl -X POST "http://localhost:3001/files/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@inventory.xlsx"
```

**GET /inventory/materials?page=1&limit=20&search=bearing**
```json
{
  "data": [
    {
      "material": "BEARING001",
      "description": "Ball Bearing - Standard",
      "plant": "Y012",
      "storageLocation": "YP01",
      "unrestrictedStock": 1500,
      "blockedStock": 50
    }
  ],
  "total": 847,
  "page": 1,
  "limit": 20,
  "totalPages": 43
}
```

## 🔧 Development Commands

```bash
# Development
npm run start:dev          # Watch mode development server
npm run start:debug        # Debug mode with inspect

# Production  
npm run build              # Build for production
npm run start:prod         # Production server

# Code Quality
npm run lint               # ESLint with auto-fix
npm run format             # Prettier formatting

# Testing
npm run test               # Unit tests
npm run test:e2e           # End-to-end tests  
npm run test:cov           # Coverage report
npm run test:watch         # Watch mode testing
```

## 📁 File Processing

### Excel Upload Requirements

**Required Columns:**
- Material (string)
- Description (string) 
- Plant (string)
- Storage Location (string)
- Unrestricted Stock (number)
- Blocked Stock (number)

**Supported Formats:**
- .xlsx (Excel 2007+)
- .xls (Excel 97-2003)

**Validation Features:**
- Column structure validation
- Data type checking
- Duplicate detection
- Error file generation for invalid rows

### Template Download

The `/files/template` endpoint provides a properly formatted Excel template located at `assets/inventory_template.xlsx`. This template includes:
- Pre-defined column headers
- Sample data for reference
- Data validation rules
- Formatting guidelines

## 🧪 Testing

### Running Tests

```bash
# Unit tests with coverage
npm run test:cov

# End-to-end tests
npm run test:e2e

# Watch mode for development
npm run test:watch
```

### Test Structure

```
test/
├── app.e2e-spec.ts       # Application E2E tests
└── jest-e2e.json         # E2E Jest configuration

src/
├── **/*.spec.ts          # Unit tests alongside source files
```

## 🔒 Security & Validation

### Input Validation
- DTO-based request validation using class-validator
- File type and size restrictions for uploads
- Sanitization of user inputs

### Error Handling
- Global exception filters
- Structured error responses
- Detailed logging for debugging

### Type Safety
- Strict TypeScript configuration
- Interface-based data contracts
- Runtime validation with transformation

## ⚙️ Configuration

### Environment Variables

Create a `.env` file for environment-specific settings:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=.xlsx,.xls

# CORS Settings
CORS_ORIGIN=http://localhost:5173
```

### Module Configuration

The application uses NestJS modules for organization:
- **InventoryModule**: Core inventory functionality
- **FilesModule**: File upload and processing
- **AppModule**: Root application module with global configuration

## 🚦 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY dist/ ./dist/
COPY assets/ ./assets/
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

## 📈 Performance Considerations

- **In-memory Processing**: Excel data processed in memory for fast responses
- **Pagination**: Large datasets handled with efficient pagination
- **Caching**: Strategic caching of processed analytics
- **Async Processing**: Non-blocking file processing operations

## 🤝 Contributing

1. Follow the established code patterns
2. Add tests for new functionality
3. Update API documentation
4. Run linting and tests before submitting

## 📖 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Swagger/OpenAPI Spec](https://swagger.io/specification/)
- [Class Validator](https://github.com/typestack/class-validator)
- [xlsx Library](https://docs.sheetjs.com/)

---

**Part of the Smart Inventory Hub project - Built with NestJS & TypeScript** 🚀