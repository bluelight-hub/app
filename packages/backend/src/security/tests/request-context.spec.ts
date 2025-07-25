import { Request } from 'express';
import { extractRequestInfo, normalizeIpAddress } from '../utils/request-context';

describe('Request Context Utils', () => {
  describe('extractRequestInfo', () => {
    it('should handle undefined request', () => {
      const result = extractRequestInfo(undefined);

      expect(result).toEqual({
        ipAddress: undefined,
        userAgent: undefined,
      });
    });

    it('should extract IP from X-Forwarded-For header', () => {
      const mockRequest = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
          'user-agent': 'Mozilla/5.0',
        },
        socket: {},
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      expect(result).toEqual({
        ipAddress: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should handle X-Forwarded-For as array', () => {
      const mockRequest = {
        headers: {
          'x-forwarded-for': ['203.0.113.1, 198.51.100.1', '192.0.2.1'],
        },
        socket: {},
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      expect(result.ipAddress).toBe('203.0.113.1');
    });

    it('should extract IP from X-Real-IP header', () => {
      const mockRequest = {
        headers: {
          'x-real-ip': '203.0.113.2',
        },
        socket: {},
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      expect(result.ipAddress).toBe('203.0.113.2');
    });

    it('should extract IP from X-Client-IP header', () => {
      const mockRequest = {
        headers: {
          'x-client-ip': '203.0.113.3',
        },
        socket: {},
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      expect(result.ipAddress).toBe('203.0.113.3');
    });

    it('should extract IP from CF-Connecting-IP header (Cloudflare)', () => {
      const mockRequest = {
        headers: {
          'cf-connecting-ip': '203.0.113.4',
        },
        socket: {},
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      expect(result.ipAddress).toBe('203.0.113.4');
    });

    it('should extract IP from socket.remoteAddress', () => {
      const mockRequest = {
        headers: {},
        socket: {
          remoteAddress: '::ffff:192.168.1.100',
        },
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      expect(result.ipAddress).toBe('192.168.1.100');
    });

    it('should use request.ip as last fallback', () => {
      const mockRequest = {
        headers: {},
        socket: {},
        ip: '10.0.0.1',
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      expect(result.ipAddress).toBe('10.0.0.1');
    });

    it('should handle user-agent as array', () => {
      const mockRequest = {
        headers: {
          'user-agent': ['Mozilla/5.0 (Windows)', 'Chrome/91.0'],
        },
        socket: {},
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      expect(result.userAgent).toBe('Mozilla/5.0 (Windows)');
    });

    it('should handle missing headers gracefully', () => {
      const mockRequest = {
        headers: {},
        socket: {},
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      expect(result).toEqual({
        ipAddress: undefined,
        userAgent: undefined,
      });
    });

    it('should respect header priority order', () => {
      const mockRequest = {
        headers: {
          'x-forwarded-for': '1.1.1.1',
          'x-real-ip': '2.2.2.2',
          'x-client-ip': '3.3.3.3',
          'cf-connecting-ip': '4.4.4.4',
        },
        socket: {
          remoteAddress: '5.5.5.5',
        },
        ip: '6.6.6.6',
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      // Should use X-Forwarded-For first
      expect(result.ipAddress).toBe('1.1.1.1');
    });

    it('should trim whitespace from X-Forwarded-For IPs', () => {
      const mockRequest = {
        headers: {
          'x-forwarded-for': '  203.0.113.1  ,  198.51.100.1  ',
        },
        socket: {},
      } as any as Request;

      const result = extractRequestInfo(mockRequest);

      expect(result.ipAddress).toBe('203.0.113.1');
    });
  });

  describe('normalizeIpAddress', () => {
    it('should normalize valid IPv4 addresses', () => {
      expect(normalizeIpAddress('192.168.1.1')).toBe('192.168.1.1');
      expect(normalizeIpAddress('  10.0.0.1  ')).toBe('10.0.0.1');
      expect(normalizeIpAddress('255.255.255.255')).toBe('255.255.255.255');
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(normalizeIpAddress('256.1.1.1')).toBeUndefined();
      expect(normalizeIpAddress('192.168.1')).toBeUndefined();
      expect(normalizeIpAddress('192.168.1.1.1')).toBeUndefined();
      expect(normalizeIpAddress('192.168.-1.1')).toBeUndefined();
    });

    it('should normalize valid IPv6 addresses', () => {
      expect(normalizeIpAddress('2001:db8::1')).toBe('2001:db8::1');
      expect(normalizeIpAddress('2001:0DB8::1')).toBe('2001:0db8::1'); // Lowercase
    });

    it('should handle undefined and empty strings', () => {
      expect(normalizeIpAddress(undefined)).toBeUndefined();
      expect(normalizeIpAddress('')).toBeUndefined();
      expect(normalizeIpAddress('   ')).toBeUndefined();
    });

    it('should reject malformed addresses', () => {
      expect(normalizeIpAddress('not-an-ip')).toBeUndefined();
      expect(normalizeIpAddress('192.168.1.1:8080')).toBeUndefined();
      expect(normalizeIpAddress('http://192.168.1.1')).toBeUndefined();
    });
  });
});
