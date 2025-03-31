import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Request } from 'express';
import * as fs from 'fs';
import { diskStorage, DiskStorageOptions } from 'multer';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { EtbAttachment } from './entities/etb-attachment.entity';
import { EtbEntry } from './entities/etb-entry.entity';
import { EtbController } from './etb.controller';
import { EtbService } from './etb.service';

/**
 * Modul für das Einsatztagebuch (ETB).
 * Konfiguriert alle benötigten Komponenten für die ETB-Funktionalität.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([EtbEntry, EtbAttachment]),
        MulterModule.register({
            storage: diskStorage({
                destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
                    const uploadPath = path.join(process.cwd(), 'uploads', 'etb-attachments');

                    // Stelle sicher, dass der Upload-Ordner existiert
                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, { recursive: true });
                    }

                    cb(null, uploadPath);
                },
                filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
                    // Generiere einen eindeutigen Dateinamen mit UUID und Originalname
                    const uniqueFilename = `${uuid()}-${file.originalname}`;
                    cb(null, uniqueFilename);
                },
            } as DiskStorageOptions),
        }),
    ],
    controllers: [EtbController],
    providers: [EtbService],
    exports: [EtbService],
})
export class EtbModule { } 