import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService, ValidationResult, UploadedFile as FileRecord } from './files.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-file')
  @ApiOperation({ summary: 'Upload inventory Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<{
    message: string;
    fileId: string;
    recordCount: number;
    validation: ValidationResult;
  }> {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.filesService.processUploadedFile(file);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'File processing failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get file upload history' })
  async getFileHistory(): Promise<FileRecord[]> {
    return this.filesService.getFileHistory();
  }

  @Post(':fileId/activate')
  @ApiOperation({ summary: 'Activate a specific file' })
  async activateFile(@Param('fileId') fileId: string) {
    return this.filesService.activateFile(fileId);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete a file' })
  async deleteFile(@Param('fileId') fileId: string) {
    return this.filesService.deleteFile(fileId);
  }

  @Get('download-sample')
  @ApiOperation({ summary: 'Download sample Excel template' })
  async downloadSample(@Res() res: Response) {
    const filePath = await this.filesService.generateSampleFile();
    res.download(filePath, 'inventory_template.xlsx');
  }

  @Get('download-current-data')
  @ApiOperation({ summary: 'Download current inventory data' })
  async downloadCurrentData(@Res() res: Response) {
    const filePath = await this.filesService.generateCurrentDataFile();
    res.download(filePath, `inventory_data_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  @Get('download-errors/:fileId')
  @ApiOperation({ summary: 'Download file with validation errors' })
  async downloadErrorFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const filePath = await this.filesService.getErrorFile(fileId);
    res.download(filePath, `inventory_errors_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  @Get('debug/active-data')
  @ApiOperation({ summary: 'Debug: Get active file data info' })
  async debugActiveData() {
    const activeData = this.filesService.getActiveFileData();
    return {
      hasActiveData: !!activeData,
      recordCount: activeData?.length || 0,
      firstRecord: activeData?.[0] || null,
      activeFileId: (this.filesService as any).activeFileId,
    };
  }
}