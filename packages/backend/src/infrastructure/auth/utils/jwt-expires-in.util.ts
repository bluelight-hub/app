import * as jwt from 'jsonwebtoken';

export type JwtExpiresIn = NonNullable<jwt.SignOptions['expiresIn']>;

export function toJwtExpiresIn(value: string): JwtExpiresIn {
  const trimmed = value.trim();
  const numericValue = Number(trimmed);

  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  return trimmed as JwtExpiresIn;
}
