import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    forwardRef(() => InventoryModule),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
      fileFilter: (req, file, cb) => {
        // Accept Excel and CSV files
        if (file.mimetype.includes('excel') || 
            file.mimetype.includes('spreadsheet') ||
            file.mimetype.includes('csv') ||
            file.originalname.match(/\.(xlsx|xls|csv)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'), false);
        }
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}