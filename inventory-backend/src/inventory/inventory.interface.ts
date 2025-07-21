export interface InventoryItem {
  material: number;
  materialDescription: string;
  plant: string;
  storageLocation: string;
  baseUnitOfMeasure: string;
  unrestricted: number;
  stockInTransfer: number;
  inQualityInsp: number;
  restrictedUseStock: number;
  blocked: number;
  valueUnrestricted: number;
  totalShelfLife: number;
  sled: number;
  dateOfManufacture: number;
  batch: string | number;
}

export interface InventoryMetrics {
  totalInventory: number;
  totalBlocked: number;
  totalUnrestricted: number;
  totalRestricted: number;
  totalInTransfer: number;
  totalInQualityInsp: number;
  totalInventoryValue: number;
  totalBlockedValue: number;
  totalUnrestrictedValue: number;
  totalRestrictedValue: number;
  totalInTransferValue: number;
  totalInQualityInspValue: number;
}

export interface LocationStats {
  storageLocation: string;
  totalQuantity: number;
  blockedQuantity: number;
  unrestrictedQuantity: number;
  materialCount: number;
  totalValue: number;
  blockedValue: number;
  unrestrictedValue: number;
}

export interface PlantStats {
  plant: string;
  totalQuantity: number;
  blockedQuantity: number;
  unrestrictedQuantity: number;
  materialCount: number;
  locations: string[];
  totalValue: number;
  blockedValue: number;
  unrestrictedValue: number;
}

export interface MaterialDetail extends InventoryItem {
  totalQuantity: number;
  status: 'blocked' | 'unrestricted' | 'restricted' | 'in-transfer' | 'quality-inspection';
}

export interface DrillDownFilter {
  plant?: string;
  storageLocation?: string;
  material?: number;
  status?: string;
  materialDescription?: string;
  search?: string;
}