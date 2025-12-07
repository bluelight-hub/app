import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiCreatedResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Generiert das Schema für eine gewrappte Response mit data und meta.
 *
 * @param model - Das DTO-Model für die Response
 * @param isArray - Ob data ein Array ist
 */
const createWrappedSchema = <TModel extends Type<unknown>>(model: TModel, isArray: boolean) => ({
  type: 'object' as const,
  properties: {
    data: isArray
      ? {
          type: 'array' as const,
          items: { $ref: getSchemaPath(model) },
        }
      : {
          $ref: getSchemaPath(model),
        },
    meta: {
      type: 'object' as const,
      properties: {
        timestamp: {
          type: 'string' as const,
          format: 'date-time',
          example: '2025-08-29T14:00:00.000Z',
        },
        version: {
          type: 'string' as const,
          example: 'alpha',
        },
        requestId: {
          type: 'string' as const,
          example: 'abc123xyz',
        },
      },
      required: ['timestamp', 'version', 'requestId'],
    },
    ...(isArray
      ? {
          pagination: {
            type: 'object' as const,
            properties: {
              page: { type: 'number' as const, example: 1 },
              limit: { type: 'number' as const, example: 20 },
              total: { type: 'number' as const, example: 100 },
              totalPages: { type: 'number' as const, example: 5 },
            },
          },
        }
      : {}),
  },
  required: ['data', 'meta'],
});

/**
 * Custom Decorator für gewrappte API-Responses (HTTP 200 OK).
 * Beschreibt die tatsächliche Response-Struktur mit data und meta.
 */
export const ApiWrappedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  options?: {
    description?: string;
    isArray?: boolean;
  },
) => {
  const isArray = options?.isArray ?? false;
  const description = options?.description ?? 'Successful response';

  return applyDecorators(ApiExtraModels(model), ApiOkResponse({ description, schema: createWrappedSchema(model, isArray) }));
};

/**
 * Custom Decorator für gewrappte API-Responses bei Resource-Erstellung (HTTP 201 Created).
 * Beschreibt die tatsächliche Response-Struktur mit data und meta.
 */
export const ApiWrappedCreatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  options?: {
    description?: string;
  },
) => {
  const description = options?.description ?? 'Resource successfully created';

  return applyDecorators(ApiExtraModels(model), ApiCreatedResponse({ description, schema: createWrappedSchema(model, false) }));
};
