import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InventoryModule } from './inventory/inventory.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [InventoryModule, FilesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
