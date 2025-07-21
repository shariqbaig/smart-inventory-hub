import { IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetInventoryMetricsDto {
  @ApiPropertyOptional({ description: 'Filter by plant code', example: 'Y012' })
  @IsOptional()
  @IsString()
  plant?: string;

  @ApiPropertyOptional({ description: 'Filter by storage location', example: 'YP01' })
  @IsOptional()
  @IsString()
  storageLocation?: string;
}

export class GetLocationStatsDto {
  @ApiPropertyOptional({ description: 'Filter by plant code', example: 'Y012' })
  @IsOptional()
  @IsString()
  plant?: string;
}

export class GetPlantStatsDto {
  // No additional filters needed
}

export class GetMaterialDetailsDto {
  @ApiPropertyOptional({ description: 'Filter by plant code', example: 'Y012' })
  @IsOptional()
  @IsString()
  plant?: string;

  @ApiPropertyOptional({ description: 'Filter by storage location', example: 'YP01' })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({ description: 'Filter by material number', example: 20152232 })
  @IsOptional()
  @IsNumber()
  material?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by material status', 
    example: 'blocked',
    enum: ['blocked', 'unrestricted', 'restricted', 'in-transfer', 'quality-inspection']
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search in material description', example: 'SODIUM' })
  @IsOptional()
  @IsString()
  materialDescription?: string;

  @ApiPropertyOptional({ description: 'General search term (searches in material description)', example: 'SODIUM' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', example: 1, default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', example: 50, default: 50 })
  @IsOptional()
  limit?: number = 50;
}

export class InventoryMetricsResponseDto {
  @ApiProperty({ description: 'Total inventory quantity across all categories', example: 44672206.402 })
  totalInventory: number;

  @ApiProperty({ description: 'Total blocked stock quantity', example: 771155.176 })
  totalBlocked: number;

  @ApiProperty({ description: 'Total unrestricted stock quantity', example: 43901051.226 })
  totalUnrestricted: number;

  @ApiProperty({ description: 'Total restricted-use stock quantity', example: 0 })
  totalRestricted: number;

  @ApiProperty({ description: 'Total stock in transfer', example: 0 })
  totalInTransfer: number;

  @ApiProperty({ description: 'Total stock in quality inspection', example: 0 })
  totalInQualityInsp: number;

  @ApiProperty({ description: 'Total inventory value across all categories (PKR)', example: 1234567.89 })
  totalInventoryValue: number;

  @ApiProperty({ description: 'Total blocked stock value (PKR)', example: 98765.43 })
  totalBlockedValue: number;

  @ApiProperty({ description: 'Total unrestricted stock value (PKR)', example: 1135802.46 })
  totalUnrestrictedValue: number;

  @ApiProperty({ description: 'Total restricted-use stock value (PKR)', example: 0 })
  totalRestrictedValue: number;

  @ApiProperty({ description: 'Total stock in transfer value (PKR)', example: 0 })
  totalInTransferValue: number;

  @ApiProperty({ description: 'Total stock in quality inspection value (PKR)', example: 0 })
  totalInQualityInspValue: number;
}

export class LocationStatsResponseDto {
  @ApiProperty({ description: 'Storage location code', example: 'YP01' })
  storageLocation: string;

  @ApiProperty({ description: 'Total quantity in this location', example: 18534976.978 })
  totalQuantity: number;

  @ApiProperty({ description: 'Blocked quantity in this location', example: 234567 })
  blockedQuantity: number;

  @ApiProperty({ description: 'Unrestricted quantity in this location', example: 18300409.978 })
  unrestrictedQuantity: number;

  @ApiProperty({ description: 'Number of different materials in this location', example: 1546 })
  materialCount: number;

  @ApiProperty({ description: 'Total value in this location (PKR)', example: 567890.12 })
  totalValue: number;

  @ApiProperty({ description: 'Blocked value in this location (PKR)', example: 12345.67 })
  blockedValue: number;

  @ApiProperty({ description: 'Unrestricted value in this location (PKR)', example: 555544.45 })
  unrestrictedValue: number;
}

export class PlantStatsResponseDto {
  @ApiProperty({ description: 'Plant code', example: 'Y012' })
  plant: string;

  @ApiProperty({ description: 'Total quantity in this plant', example: 21165339.842 })
  totalQuantity: number;

  @ApiProperty({ description: 'Blocked quantity in this plant', example: 456789 })
  blockedQuantity: number;

  @ApiProperty({ description: 'Unrestricted quantity in this plant', example: 20708550.842 })
  unrestrictedQuantity: number;

  @ApiProperty({ description: 'Number of different materials in this plant', example: 2540 })
  materialCount: number;

  @ApiProperty({ description: 'List of storage locations in this plant', example: ['YP01', 'YM99', 'YY01'] })
  locations: string[];

  @ApiProperty({ description: 'Total value in this plant (PKR)', example: 987654.32 })
  totalValue: number;

  @ApiProperty({ description: 'Blocked value in this plant (PKR)', example: 54321.98 })
  blockedValue: number;

  @ApiProperty({ description: 'Unrestricted value in this plant (PKR)', example: 933332.34 })
  unrestrictedValue: number;
}

export class MaterialDetailResponseDto {
  @ApiProperty({ description: 'Material number', example: 20152232 })
  material: number;

  @ApiProperty({ description: 'Material description', example: 'RM SODIUM SULPHATE' })
  materialDescription: string;

  @ApiProperty({ description: 'Plant code', example: 'Y012' })
  plant: string;

  @ApiProperty({ description: 'Storage location code', example: 'YP01' })
  storageLocation: string;

  @ApiProperty({ description: 'Base unit of measure', example: 'KG' })
  baseUnitOfMeasure: string;

  @ApiProperty({ description: 'Unrestricted quantity', example: 10899.5 })
  unrestricted: number;

  @ApiProperty({ description: 'Stock in transfer', example: 0 })
  stockInTransfer: number;

  @ApiProperty({ description: 'In quality inspection', example: 0 })
  inQualityInsp: number;

  @ApiProperty({ description: 'Restricted-use stock', example: 0 })
  restrictedUseStock: number;

  @ApiProperty({ description: 'Blocked quantity', example: 12300 })
  blocked: number;

  @ApiProperty({ description: 'Value of unrestricted stock', example: 754790.37 })
  valueUnrestricted: number;

  @ApiProperty({ description: 'Total shelf life in days', example: 360 })
  totalShelfLife: number;

  @ApiProperty({ description: 'Shelf life end date / Best before date', example: 46044 })
  sled: number;

  @ApiProperty({ description: 'Date of manufacture', example: 45684 })
  dateOfManufacture: number;

  @ApiProperty({ description: 'Batch number', example: '24011717' })
  batch: string | number;

  @ApiProperty({ description: 'Total quantity (sum of all stock types)', example: 23199.5 })
  totalQuantity: number;

  @ApiProperty({ 
    description: 'Material status based on stock distribution',
    example: 'blocked',
    enum: ['blocked', 'unrestricted', 'restricted', 'in-transfer', 'quality-inspection']
  })
  status: 'blocked' | 'unrestricted' | 'restricted' | 'in-transfer' | 'quality-inspection';
}

export class MaterialListResponseDto {
  @ApiProperty({ description: 'List of materials', type: [MaterialDetailResponseDto] })
  materials: MaterialDetailResponseDto[];

  @ApiProperty({ description: 'Total number of materials matching the filter', example: 2887 })
  total: number;
}