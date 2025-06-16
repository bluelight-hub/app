import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * Validiert, dass ein String im NanoID-Format ist.
 * Standardmäßig wird eine Länge von 21 Zeichen erwartet (Standard für nanoid),
 * aber die Länge kann angepasst werden.
 * 
 * @param validationOptions Optionale Validierungsoptionen für class-validator
 * @param length Erwartete Länge der NanoID. Standard ist 21 Zeichen.
 * @returns PropertyDecorator für class-validator
 */
export function IsNanoId(validationOptions?: ValidationOptions, length: number = 21) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isNanoId',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [length],
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (value === undefined || value === null) {
                        return true; // Optional-Validierung überlassen wir @IsOptional
                    }

                    const [expectedLength] = args.constraints;

                    // Überprüfen, ob es ein String ist
                    if (typeof value !== 'string') {
                        return false;
                    }

                    // Überprüfen, ob die Länge korrekt ist
                    if (value.length !== expectedLength) {
                        return false;
                    }

                    // Überprüfen, ob nur gültige Zeichen enthalten sind (A-Za-z0-9_-)
                    // Dies ist das Standard-Alphabet von NanoID
                    return /^[A-Za-z0-9_-]+$/.test(value);
                },
                defaultMessage(args: ValidationArguments) {
                    const [expectedLength] = args.constraints;
                    return `${args.property} muss eine gültige NanoID sein (${expectedLength} Zeichen, nur A-Za-z0-9_-)`;
                },
            },
        });
    };
} 