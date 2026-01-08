import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator';
import type { z } from 'zod';

/**
 * Custom class-validator Decorator für Zod-Schema Validation.
 *
 * Ermöglicht die Nutzung von Zod-Schemas in NestJS DTOs,
 * um konsistente Validierung mit dem Frontend zu garantieren.
 *
 * @param schema - Das Zod-Schema für die Validierung
 * @param validationOptions - Optional: class-validator ValidationOptions
 *
 * @example
 * ```typescript
 * import { usernameSchema } from '@bluelight-hub/shared/schemas';
 *
 * export class CreateUserDto {
 *   @ApiProperty()
 *   @ValidateWithZod(usernameSchema)
 *   username!: string;
 * }
 * ```
 */
export function ValidateWithZod<T>(schema: z.ZodSchema<T>, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'validateWithZod',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments): boolean {
          const result = schema.safeParse(value);
          return result.success;
        },
        defaultMessage(args: ValidationArguments): string {
          const result = schema.safeParse(args.value);
          if (!result.success) {
            // Nutze die erste Zod-Fehlermeldung (Zod v4: issues statt errors)
            const firstError = result.error.issues[0];
            return firstError?.message || 'Validation failed';
          }
          return 'Validation failed';
        },
      },
    });
  };
}
