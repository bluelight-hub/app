# 10. Growing the Architecture

## When Adding New Modules

The recommended pattern for new feature modules:

```
src/modules/your-new-module/
├── controllers/
│   └── your-resource.controller.ts
├── services/
│   └── your-resource.service.ts
├── repositories/
│   └── your-resource.repository.ts
├── entities/
│   └── your-resource.entity.ts
├── dto/
│   ├── create-your-resource.dto.ts
│   └── update-your-resource.dto.ts
└── your-module.module.ts
```

## Module Import/Export Best Practices

```typescript
// Good: Feature module exports services for reuse
@Module({
  imports: [PrismaModule, OtherModule],
  controllers: [YourController],
  providers: [YourService, YourRepository],
  exports: [YourService]  // ✅ Allows other modules to inject YourService
})
```

## Avoid Circular Dependencies

**Current Solution:** Event-based decoupling
- Einsatz doesn't know about Lagekarte
- Other modules can listen to events from any other module

---
