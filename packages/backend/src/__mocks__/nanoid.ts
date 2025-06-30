/**
 * Mock für nanoid
 */
export const nanoid = jest.fn((size?: number) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = size || 10;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
});
