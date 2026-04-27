import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodIssue, ZodTypeAny, infer as zodInfer } from 'zod';

/**
 * Standardisierte Fehler-Antwort eines fehlgeschlagenen Zod-Parses (HTTP 400).
 *
 * Form orientiert sich am Plattform-Pattern für Validation-Errors:
 * `error: 'Bad Request'`, `message`-Sammelstring + `context.issues` als
 * strukturierte Liste pro fehlerhaftem Pfad. Frontend kann darauf inline
 * Felder markieren, ohne den Message-String zu parsen.
 */
export interface ZodValidationFailedResponse {
  statusCode: 400;
  error: 'Bad Request';
  message: string;
  context: {
    rule: 'ZodValidationFailed';
    issues: ReadonlyArray<{
      path: string;
      message: string;
      code: string;
    }>;
  };
}

/**
 * NestJS-Pipe, die ein Zod-Schema als hartes Validation-Gate vor das
 * class-validator-Regelwerk schaltet. Zweck:
 *
 * 1. **Single-Source-of-Truth-Discriminator** — der Zod-`discriminatedUnion`
 *    aus `packages/shared/src/schemas/eigenschutz/sicherheitsregel.schema.ts`
 *    erkennt invalide Kombinationen (`einsatzweit:true` + `einheitIds:[…]`),
 *    die class-validator mit `@ValidateIf` nicht auffängt.
 * 2. **Trim-Konsistenz** — das Shared-Schema trimt Title/Inhalt vor der
 *    Längenprüfung; class-validator macht das nicht. Pipe gibt das geparste
 *    + getrimmte Objekt zurück, sodass die Service-Schicht garantiert mit
 *    der getrimten Version arbeitet.
 * 3. **Strukturierte 400-Antwort** — `context.issues` als JSON-Array.
 *
 * Nutzung:
 * ```ts
 * @Post('foo')
 * createFoo(@Body(new ZodValidationPipe(FooSchema)) body: z.infer<typeof FooSchema>) { … }
 * ```
 */
@Injectable()
export class ZodValidationPipe<TSchema extends ZodTypeAny> implements PipeTransform<unknown, zodInfer<TSchema>> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): zodInfer<TSchema> {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data as zodInfer<TSchema>;
    }
    const issues = result.error.issues.map((issue: ZodIssue) => ({
      path: issue.path.length > 0 ? issue.path.join('.') : '<root>',
      message: issue.message,
      code: issue.code,
    }));
    const message = issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ') || 'Eingaben sind ungültig';
    const response: ZodValidationFailedResponse = {
      statusCode: 400,
      error: 'Bad Request',
      message,
      context: { rule: 'ZodValidationFailed', issues },
    };
    throw new BadRequestException(response);
  }
}
