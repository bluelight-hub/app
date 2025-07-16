import { parseOptionalDate, parseDateRange, daysAgo, hoursAgo, minutesAgo } from './date.utils';

describe('Date Utils', () => {
  beforeEach(() => {
    // Mock Date.now() for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('parseOptionalDate', () => {
    it('should parse a valid date string', () => {
      const result = parseOptionalDate('2024-01-10T10:00:00.000Z');
      expect(result).toEqual(new Date('2024-01-10T10:00:00.000Z'));
    });

    it('should return undefined when no date string provided and no default', () => {
      const result = parseOptionalDate();
      expect(result).toBeUndefined();
    });

    it('should return default value when no date string provided', () => {
      const defaultDate = new Date('2024-01-01T00:00:00.000Z');
      const result = parseOptionalDate(undefined, defaultDate);
      expect(result).toEqual(defaultDate);
    });

    it('should parse date string even when default is provided', () => {
      const defaultDate = new Date('2024-01-01T00:00:00.000Z');
      const result = parseOptionalDate('2024-01-10T10:00:00.000Z', defaultDate);
      expect(result).toEqual(new Date('2024-01-10T10:00:00.000Z'));
    });
  });

  describe('parseDateRange', () => {
    it('should parse both start and end dates when provided', () => {
      const result = parseDateRange('2024-01-10T00:00:00.000Z', '2024-01-15T00:00:00.000Z');
      expect(result.start).toEqual(new Date('2024-01-10T00:00:00.000Z'));
      expect(result.end).toEqual(new Date('2024-01-15T00:00:00.000Z'));
    });

    it('should use default values when dates not provided', () => {
      const result = parseDateRange();
      // Default is 1 day back for start
      expect(result.start).toEqual(new Date('2024-01-14T12:00:00.000Z'));
      // Default is current time for end
      expect(result.end).toEqual(new Date('2024-01-15T12:00:00.000Z'));
    });

    it('should use custom days back when specified', () => {
      const result = parseDateRange(undefined, undefined, 7);
      // 7 days back from mocked time
      expect(result.start).toEqual(new Date('2024-01-08T12:00:00.000Z'));
      expect(result.end).toEqual(new Date('2024-01-15T12:00:00.000Z'));
    });

    it('should handle mixed provided and default dates', () => {
      const result = parseDateRange('2024-01-10T00:00:00.000Z', undefined);
      expect(result.start).toEqual(new Date('2024-01-10T00:00:00.000Z'));
      expect(result.end).toEqual(new Date('2024-01-15T12:00:00.000Z'));

      const result2 = parseDateRange(undefined, '2024-01-20T00:00:00.000Z');
      expect(result2.start).toEqual(new Date('2024-01-14T12:00:00.000Z'));
      expect(result2.end).toEqual(new Date('2024-01-20T00:00:00.000Z'));
    });
  });

  describe('daysAgo', () => {
    it('should return date for specified days ago', () => {
      expect(daysAgo(1)).toEqual(new Date('2024-01-14T12:00:00.000Z'));
      expect(daysAgo(7)).toEqual(new Date('2024-01-08T12:00:00.000Z'));
      expect(daysAgo(30)).toEqual(new Date('2023-12-16T12:00:00.000Z'));
    });

    it('should handle 0 days (current time)', () => {
      expect(daysAgo(0)).toEqual(new Date('2024-01-15T12:00:00.000Z'));
    });
  });

  describe('hoursAgo', () => {
    it('should return date for specified hours ago', () => {
      expect(hoursAgo(1)).toEqual(new Date('2024-01-15T11:00:00.000Z'));
      expect(hoursAgo(24)).toEqual(new Date('2024-01-14T12:00:00.000Z'));
      expect(hoursAgo(48)).toEqual(new Date('2024-01-13T12:00:00.000Z'));
    });

    it('should handle 0 hours (current time)', () => {
      expect(hoursAgo(0)).toEqual(new Date('2024-01-15T12:00:00.000Z'));
    });
  });

  describe('minutesAgo', () => {
    it('should return date for specified minutes ago', () => {
      expect(minutesAgo(30)).toEqual(new Date('2024-01-15T11:30:00.000Z'));
      expect(minutesAgo(60)).toEqual(new Date('2024-01-15T11:00:00.000Z'));
      expect(minutesAgo(90)).toEqual(new Date('2024-01-15T10:30:00.000Z'));
    });

    it('should handle 0 minutes (current time)', () => {
      expect(minutesAgo(0)).toEqual(new Date('2024-01-15T12:00:00.000Z'));
    });
  });
});
