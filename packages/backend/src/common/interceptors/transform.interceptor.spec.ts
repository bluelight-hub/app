import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response.interface';
import { TransformInterceptor } from './transform.interceptor';

// Mock für den Logger
jest.mock('@/logger/consola.logger', () => ({
    logger: {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('TransformInterceptor', () => {
    let interceptor: TransformInterceptor<any>;
    let mockContext: ExecutionContext;
    let mockCallHandler: { handle: jest.Mock };

    beforeEach(() => {
        interceptor = new TransformInterceptor();
        mockContext = {} as ExecutionContext;
        mockCallHandler = {
            handle: jest.fn(),
        };

        // Setze Zeitstempel für Tests
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should transform a simple response', (done) => {
        // Arrange
        const responseData = { id: 1, name: 'Test' };
        mockCallHandler.handle.mockReturnValue(of(responseData));

        // Act
        const transformedResponse$ = interceptor.intercept(mockContext, mockCallHandler as any);

        // Assert
        transformedResponse$.subscribe((result: ApiResponse<any>) => {
            expect(result).toEqual({
                data: responseData,
                meta: {
                    timestamp: '2023-01-01T12:00:00.000Z',
                }
            });
            done();
        });
    });

    it('should preserve existing data field', (done) => {
        // Arrange
        const responseData = {
            data: [{ id: 1, name: 'Test' }],
            somethingElse: 'value'
        };
        mockCallHandler.handle.mockReturnValue(of(responseData));

        // Act
        const transformedResponse$ = interceptor.intercept(mockContext, mockCallHandler as any);

        // Assert
        transformedResponse$.subscribe((result: ApiResponse<any>) => {
            expect(result).toEqual({
                data: [{ id: 1, name: 'Test' }],
                meta: {
                    timestamp: '2023-01-01T12:00:00.000Z',
                }
            });
            done();
        });
    });

    it('should include message field if present', (done) => {
        // Arrange
        const responseData = {
            data: { id: 1 },
            message: 'Operation erfolgreich'
        };
        mockCallHandler.handle.mockReturnValue(of(responseData));

        // Act
        const transformedResponse$ = interceptor.intercept(mockContext, mockCallHandler as any);

        // Assert
        transformedResponse$.subscribe((result: any) => {
            expect(result).toEqual({
                data: { id: 1 },
                meta: {
                    timestamp: '2023-01-01T12:00:00.000Z',
                },
                message: 'Operation erfolgreich'
            });
            done();
        });
    });

    it('should handle pagination with entries/total format', (done) => {
        // Arrange
        const responseData = {
            entries: [{ id: 1 }, { id: 2 }],
            total: 10
        };
        mockCallHandler.handle.mockReturnValue(of(responseData));

        // Act
        const transformedResponse$ = interceptor.intercept(mockContext, mockCallHandler as any);

        // Assert
        transformedResponse$.subscribe((result: any) => {
            expect(result).toEqual({
                data: responseData,
                meta: {
                    timestamp: '2023-01-01T12:00:00.000Z',
                    pagination: {
                        page: 1,
                        limit: 2,
                        total: 10,
                        totalPages: 5
                    }
                }
            });
            done();
        });
    });

    it('should preserve existing pagination data', (done) => {
        // Arrange
        const responseData = {
            data: [{ id: 1 }],
            meta: {
                pagination: {
                    page: 2,
                    limit: 5,
                    total: 15,
                    totalPages: 3
                }
            }
        };
        mockCallHandler.handle.mockReturnValue(of(responseData));

        // Act
        const transformedResponse$ = interceptor.intercept(mockContext, mockCallHandler as any);

        // Assert
        transformedResponse$.subscribe((result: any) => {
            expect(result).toEqual({
                data: [{ id: 1 }],
                meta: {
                    timestamp: '2023-01-01T12:00:00.000Z',
                    pagination: {
                        page: 2,
                        limit: 5,
                        total: 15,
                        totalPages: 3
                    }
                }
            });
            done();
        });
    });

    it('should handle edge case with zero limit in pagination', (done) => {
        // Arrange
        const responseData = {
            entries: [],
            total: 10
        };
        mockCallHandler.handle.mockReturnValue(of(responseData));

        // Act
        const transformedResponse$ = interceptor.intercept(mockContext, mockCallHandler as any);

        // Assert
        transformedResponse$.subscribe((result: any) => {
            expect(result).toEqual({
                data: responseData,
                meta: {
                    timestamp: '2023-01-01T12:00:00.000Z',
                    pagination: {
                        page: 1,
                        limit: 0,
                        total: 10,
                        totalPages: 1
                    }
                }
            });
            done();
        });
    });
}); 