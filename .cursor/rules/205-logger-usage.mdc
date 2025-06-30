---
description: 
globs: *.tsx,*.ts
alwaysApply: false
---

# Logger Usage Standards

## Context
- Einheitliche Nutzung des (consola) Loggers anstatt `console.*`
- Sowohl im Frontend als auch Backend

## Requirements
1. **Logger statt console**
   - Keine `console.log`, `console.error` etc.
   - Nur `logger.info`, `logger.error`, `this.logger.log` etc.
2. **Frontend**
   ```ts
   import { logger } from '@/utils/logger';
   logger.info('Info');
   logger.error('Fehler aufgetreten', error);
   ```
3. **Backend**
    Via DI (constructor(@Inject('Logger') private logger: LoggerService))
    Oder direkter Import (import { logger } from '@/logger/consola.logger';)
4. **Log Level**
    error, warn, info, debug, trace
5. **Konfiguration**
    Produktion: mind. Level 3 (info)
    Entwicklung: Level 4-5 (debug/trace)

## Examples
<example>
    # Richtig
    logger.info('Eine Info-Nachricht')
</example>
<example type="invalid">
    console.log('Nicht erlaubtes Logging')
</example>
