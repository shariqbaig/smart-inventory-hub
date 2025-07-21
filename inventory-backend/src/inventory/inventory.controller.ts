import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  GetInventoryMetricsDto,
  GetLocationStatsDto,
  GetPlantStatsDto,
  GetMaterialDetailsDto,
  InventoryMetricsResponseDto,
  LocationStatsResponseDto,
  PlantStatsResponseDto,
  MaterialDetailResponseDto,
  MaterialListResponseDto,
} from './dto/inventory.dto';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('metrics')
  @ApiOperation({ 
    summary: 'Get inventory metrics', 
    description: 'Returns overall inventory statistics including total, blocked, unrestricted quantities' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Inventory metrics retrieved successfully',
    type: InventoryMetricsResponseDto 
  })
  getInventoryMetrics(@Query() query: GetInventoryMetricsDto): InventoryMetricsResponseDto {
    return this.inventoryService.getInventoryMetrics(query);
  }

  @Get('locations')
  @ApiOperation({ 
    summary: 'Get location statistics', 
    description: 'Returns inventory statistics grouped by storage location' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Location statistics retrieved successfully',
    type: [LocationStatsResponseDto] 
  })
  getLocationStats(@Query() query: GetLocationStatsDto): LocationStatsResponseDto[] {
    return this.inventoryService.getLocationStats(query);
  }

  @Get('plants')
  @ApiOperation({ 
    summary: 'Get plant statistics', 
    description: 'Returns inventory statistics grouped by plant' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Plant statistics retrieved successfully',
    type: [PlantStatsResponseDto] 
  })
  getPlantStats(@Query() query: GetPlantStatsDto): PlantStatsResponseDto[] {
    return this.inventoryService.getPlantStats(query);
  }

  @Get('materials')
  @ApiOperation({ 
    summary: 'Get material details', 
    description: 'Returns paginated list of materials with filtering options' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Material details retrieved successfully',
    type: MaterialListResponseDto
  })
  getMaterialDetails(@Query() query: GetMaterialDetailsDto) {
    const { page: pageStr = '1', limit: limitStr = '50', ...filters } = query;
    const page = parseInt(pageStr as string, 10) || 1;
    const limit = parseInt(limitStr as string, 10) || 50;
    
    // console.log('API Query:', { page, limit, filters });
    
    return this.inventoryService.getMaterialDetails(filters, page, limit);
  }

  @Get('blocked-materials')
  @ApiOperation({ 
    summary: 'Get blocked materials', 
    description: 'Returns list of materials that have blocked stock quantities' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Blocked materials retrieved successfully',
    type: [MaterialDetailResponseDto]
  })
  getBlockedMaterials(@Query() query: GetMaterialDetailsDto) {
    const { page, limit, ...filters } = query;
    return this.inventoryService.getBlockedMaterials(filters);
  }

  @Get('restricted-materials')
  @ApiOperation({ 
    summary: 'Get restricted materials', 
    description: 'Returns list of materials that have restricted-use stock quantities' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Restricted materials retrieved successfully',
    type: [MaterialDetailResponseDto]
  })
  getRestrictedMaterials(@Query() query: GetMaterialDetailsDto) {
    const { page, limit, ...filters } = query;
    return this.inventoryService.getRestrictedMaterials(filters);
  }

  @Get('drill-down/location/:location')
  @ApiOperation({ 
    summary: 'Drill down by location', 
    description: 'Returns materials filtered by specific storage location' 
  })
  @ApiParam({ name: 'location', description: 'Storage location code', example: 'YP01' })
  @ApiResponse({ 
    status: 200, 
    description: 'Location drill-down data retrieved successfully',
    type: MaterialListResponseDto
  })
  getDrillDownByLocation(@Param('location') location: string, @Query() query: any) {
    return this.inventoryService.getMaterialDetails({ ...query, storageLocation: location });
  }

  @Get('drill-down/plant/:plant')
  @ApiOperation({ 
    summary: 'Drill down by plant', 
    description: 'Returns materials filtered by specific plant' 
  })
  @ApiParam({ name: 'plant', description: 'Plant code', example: 'Y012' })
  @ApiResponse({ 
    status: 200, 
    description: 'Plant drill-down data retrieved successfully',
    type: MaterialListResponseDto
  })
  getDrillDownByPlant(@Param('plant') plant: string, @Query() query: any) {
    return this.inventoryService.getMaterialDetails({ ...query, plant: plant });
  }

  @Get('debug/refresh')
  debugRefresh() {
    this.inventoryService.refreshData();
    return { message: 'Data refreshed' };
  }

  @Get('debug/info')
  async debugInfo() {
    return await this.inventoryService.getDebugInfo();
  }

  @Get('debug/current-data')
  @ApiOperation({ summary: 'Debug current inventory data state' })
  async debugCurrentData() {
    const metrics = this.inventoryService.getInventoryMetrics();
    return {
      currentMetrics: metrics,
      hasData: metrics.totalInventory > 0,
      timestamp: new Date().toISOString()
    };
  }
}