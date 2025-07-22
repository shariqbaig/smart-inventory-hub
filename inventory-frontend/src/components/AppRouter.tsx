import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';
import RouterDashboard from './RouterDashboard';
import RouterMaterialDetails from './RouterMaterialDetails';
import PlantsListView from './PlantsListView';
import LocationsListView from './LocationsListView';
import PlantPerformanceView from './PlantPerformanceView';
import LocationUtilizationView from './LocationUtilizationView';
import MaterialsSummaryView from './MaterialsSummaryView';
import RestrictedMaterialsView from './RestrictedMaterialsView';
import InTransferMaterialsView from './InTransferMaterialsView';
import QualityInspectionMaterialsView from './QualityInspectionMaterialsView';
import DataRequirementsView from './DataRequirementsView';
import ValueAnalysisView from './ValueAnalysisView';
import InventoryTrendsView from './InventoryTrendsView';
import ShelfLifeAnalysisView from './ShelfLifeAnalysisView';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Main Dashboard */}
        <Route path="/" element={<RouterDashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        
        {/* Material Views */}
        <Route path="/materials" element={<RouterMaterialDetails filters={{}} title="Total Inventory - All Materials" showTotalInventory={true} />} />
        <Route path="/materials/blocked" element={<RouterMaterialDetails filters={{}} title="Blocked Materials" showBlockedOnly={true} />} />
        <Route path="/materials/unrestricted" element={<RouterMaterialDetails filters={{}} title="Unrestricted Materials" showUnrestrictedOnly={true} />} />
        <Route path="/materials/restricted" element={<RestrictedMaterialsView />} />
        <Route path="/materials/in-transfer" element={<InTransferMaterialsView />} />
        <Route path="/materials/quality-inspection" element={<QualityInspectionMaterialsView />} />
        
        {/* Facility Views */}
        <Route path="/plants" element={<PlantsListView />} />
        <Route path="/locations" element={<LocationsListView />} />
        <Route path="/plant-performance" element={<PlantPerformanceView />} />
        <Route path="/location-utilization" element={<LocationUtilizationView />} />
        
        {/* Plant and Location Drill-downs */}
        <Route path="/plants/:plantId" element={<RouterMaterialDetails />} />
        <Route path="/locations/:locationId" element={<RouterMaterialDetails />} />
        
        {/* Advanced Analysis */}
        <Route path="/materials-summary" element={<MaterialsSummaryView onBack={() => window.history.back()} />} />
        <Route path="/value-analysis" element={<ValueAnalysisView />} />
        <Route path="/inventory-trends" element={<InventoryTrendsView />} />
        <Route path="/shelf-life-analysis" element={<ShelfLifeAnalysisView />} />
        <Route path="/data-requirements" element={<DataRequirementsView onBack={() => window.history.back()} />} />
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;