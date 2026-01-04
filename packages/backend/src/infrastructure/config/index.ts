// Pure Configuration (no domain imports)
export * from './cache.config';
export * from './error-handling.config';
export * from './hiorg-oauth.config';
export * from './security.config';

// Adapters that implement domain ports are in @infrastructure/common/adapters/
// - CacheConfigService -> implements CacheOptionsFactory
// - HiOrgOAuthConfigAdapter -> implements IHiOrgOAuthConfigPort
