import { LoggerService, LogLevel } from '@nestjs/common';
import { consola } from 'consola';


export const logger = consola.create({
    level: process.env.NODE_ENV === 'production' ? 3 : 4,
});

export class ConsolaLogger implements LoggerService {
    constructor() {
    }

    log(message: any, ...optionalParams: any[]) {
        logger.log(message, ...optionalParams);
    }

    error(message: any, ...optionalParams: any[]) {
        logger.error(message, ...optionalParams);
    }

    warn(message: any, ...optionalParams: any[]) {
        logger.warn(message, ...optionalParams);
    }

    debug(message: any, ...optionalParams: any[]) {
        logger.debug(message, ...optionalParams);
    }

    verbose(message: any, ...optionalParams: any[]) {
        logger.trace(message, ...optionalParams);
    }

    setLogLevels(_levels: LogLevel[]) {
        // Consola verwendet ein anderes Level-System, daher ignorieren wir dies
    }
} 