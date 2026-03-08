import { Result } from '@domain/common/result';

export function expectSuccess<T>(result: Result<T>): T {
  expect(result.isSuccess).toBe(true);

  if (result.isFailure) {
    throw new Error(result.error ?? 'Expected successful result');
  }

  return result.value as T;
}

export function expectDefined<T>(value: T | null | undefined): T {
  expect(value).toBeDefined();

  if (value == null) {
    throw new Error('Expected value to be defined');
  }

  return value;
}

export function getMockCallArg<T>(mockFn: jest.Mock, callIndex: number, argIndex: number): T {
  const call = expectDefined(mockFn.mock.calls[callIndex]);
  return expectDefined(call[argIndex]) as T;
}

export function getRequiredLogMessage(mockFn: jest.Mock): string {
  return getMockCallArg<string>(mockFn, 0, 0);
}
