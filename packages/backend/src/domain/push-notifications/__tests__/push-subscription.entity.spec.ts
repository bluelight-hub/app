import { PushSubscription } from '../push-subscription.entity';

describe('PushSubscription Entity', () => {
  const validProps = {
    userId: 'user-1',
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    p256dh: 'BDpx3WJf',
    auth: 'wT9WsE6M',
  };

  describe('create()', () => {
    it('returns a Result.ok for valid props', () => {
      const result = PushSubscription.create(validProps);
      expect(result.isSuccess).toBe(true);
      expect(result.value?.userId).toBe('user-1');
      expect(result.value?.endpoint).toBe(validProps.endpoint);
    });

    it('rejects empty userId', () => {
      const result = PushSubscription.create({ ...validProps, userId: '' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('userId');
    });

    it('rejects non-HTTPS endpoint', () => {
      const result = PushSubscription.create({ ...validProps, endpoint: 'http://example.com/push' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('HTTPS');
    });

    it('rejects malformed endpoint URL', () => {
      const result = PushSubscription.create({ ...validProps, endpoint: 'not-a-url' });
      expect(result.isFailure).toBe(true);
    });

    it('rejects empty VAPID keys', () => {
      const missingP256 = PushSubscription.create({ ...validProps, p256dh: '' });
      const missingAuth = PushSubscription.create({ ...validProps, auth: '' });
      expect(missingP256.isFailure).toBe(true);
      expect(missingAuth.isFailure).toBe(true);
    });

    it('rejects non-Base64Url characters in VAPID keys', () => {
      const invalidP256 = PushSubscription.create({ ...validProps, p256dh: 'not+valid/base64' });
      const invalidAuth = PushSubscription.create({ ...validProps, auth: 'bad key' });
      expect(invalidP256.isFailure).toBe(true);
      expect(invalidP256.error).toContain('Base64Url');
      expect(invalidAuth.isFailure).toBe(true);
      expect(invalidAuth.error).toContain('Base64Url');
    });

    it.each([
      ['https://localhost/push', 'localhost'],
      ['https://127.0.0.1/push', 'IPv4 loopback'],
      ['https://10.0.0.5/push', 'RFC1918 10.x'],
      ['https://192.168.1.1/push', 'RFC1918 192.168'],
      ['https://172.16.5.4/push', 'RFC1918 172.16-31'],
      ['https://169.254.169.254/push', 'AWS-metadata-link-local'],
      ['https://[::1]/push', 'IPv6 loopback'],
    ])('rejects %s as SSRF risk (%s)', (endpoint) => {
      const result = PushSubscription.create({ ...validProps, endpoint });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('privaten/internen Host');
    });
  });

  describe('getEndpointHost()', () => {
    it('returns only the host part of the endpoint', () => {
      const entity = PushSubscription.reconstruct({
        id: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/opaque-token-xyz',
        p256dh: 'p',
        auth: 'a',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
      expect(entity.getEndpointHost()).toBe('fcm.googleapis.com');
    });
  });
});
