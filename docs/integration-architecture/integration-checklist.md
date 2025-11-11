# Integration Checklist

When adding new features, ensure:

- [ ] Backend endpoint has OpenAPI decorators
- [ ] DTO classes use `class-validator` and `@ApiProperty()`
- [ ] Run `pnpm run generate-api` after backend changes
- [ ] Frontend uses generated client (no manual `fetch()` calls)
- [ ] TanStack Query hook wraps API call for caching
- [ ] Mutations invalidate related queries
- [ ] Authentication guard applied to protected endpoints
- [ ] CORS allows frontend origin
- [ ] Error handling for network failures
- [ ] Loading states in UI components

---
