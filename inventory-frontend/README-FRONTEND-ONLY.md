# Smart Inventory Hub - Frontend Only Deployment

This is the **frontend-only** version of the Smart Inventory Hub that runs completely in the browser without any backend server.

## Features

✅ **Complete client-side operation** - No backend server required  
✅ **Excel file processing** - Upload and validate Excel files directly in browser  
✅ **Local data storage** - All data stored in browser's IndexedDB  
✅ **Full dashboard functionality** - KPIs, charts, drill-downs, and filtering  
✅ **File management** - Upload history, file activation, and deletion  
✅ **Data validation** - Comprehensive Excel validation with error reporting  
✅ **Template generation** - Download Excel template with sample data  
✅ **Offline capability** - Works without internet connection once loaded  

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm install
npm run build
npm run preview  # Test production build locally
```

### Deploy to Static Hosting
After building, the `dist/` folder contains all static files ready for deployment to:
- **Vercel**: `vercel --prod`
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**: Upload `dist/` contents
- **Any CDN or web server**: Serve `dist/` folder

## Architecture

### Client-Side Services
- **DataStorageService**: IndexedDB wrapper for persistent data storage
- **InventoryService**: Business logic and calculations (migrated from backend)
- **ExcelProcessorService**: File upload, validation, and Excel processing
- **ClientInventoryApi**: Drop-in replacement for backend API

### Data Flow
1. **File Upload** → Excel processing → Validation → IndexedDB storage
2. **Dashboard** → Client API → Inventory Service → IndexedDB retrieval
3. **All operations** happen locally in the browser

## File Requirements

### Required Columns
- Material (required)
- Material Description
- Plant (required)  
- Storage Location
- Base Unit of Measure
- Unrestricted
- Blocked (required)

### Optional Columns
- Stock in transfer
- In Quality Insp.
- Restricted-Use Stock
- Value Unrestricted
- Total shelf life
- SLED/BBD
- Date of Manufacture
- Batch

## Browser Support

- Chrome 63+
- Firefox 55+
- Safari 10.1+
- Edge 79+

Requires IndexedDB support for data persistence.

## Storage

- **Data**: Stored in browser's IndexedDB
- **Files**: File metadata and processed data
- **Settings**: Active file and application state
- **Persistence**: Data persists across browser sessions
- **Size Limit**: ~250MB typical browser storage limit

## Migration from Backend Version

This version maintains the same UI and functionality as the backend version but:
- ❌ No server required
- ❌ No server-side validation
- ❌ No network requests
- ✅ Faster response times (no network latency)
- ✅ Works offline
- ✅ Zero hosting costs for backend
- ✅ Privacy - data never leaves browser

## Development Notes

- All API calls replaced with client-side operations
- IndexedDB used for persistent storage
- Excel processing happens client-side using `xlsx` library
- Service initialization happens on app start
- Error handling for storage failures and browser compatibility

## Deployment Checklist

- [ ] Build optimized for production (`npm run build`)
- [ ] Test with `npm run preview` 
- [ ] Verify Excel upload and validation works
- [ ] Check dashboard loads with existing data
- [ ] Test file management (upload/activate/delete)
- [ ] Validate template download works
- [ ] Deploy `dist/` folder to static hosting

## Troubleshooting

**Q: Data disappeared after browser restart**  
A: Check if IndexedDB is supported and enabled in your browser. Private/incognito modes may have limited storage.

**Q: Excel upload not working**  
A: Ensure the file is .xlsx or .xls format and under 10MB. Check console for specific error messages.

**Q: Dashboard shows no data**  
A: Upload and activate an Excel file first. Data is stored locally and doesn't persist across different browsers/devices.

**Q: Template download not working**  
A: Check if your browser allows downloads. Some security settings might block automatic downloads.