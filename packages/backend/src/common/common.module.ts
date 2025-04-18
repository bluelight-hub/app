import { Global, Module } from '@nestjs/common';
import { PaginationService } from './services/pagination.service';

/**
 * Gemeinsames Modul für Dienste und Funktionen, die im gesamten Backend verfügbar sein sollen.
 */
@Global()
@Module({
    providers: [PaginationService],
    exports: [PaginationService],
})
export class CommonModule { } 