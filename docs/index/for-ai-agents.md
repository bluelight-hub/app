# For AI Agents

## Best Practices

1. **Start with this index** to understand project structure
2. **Use specific BMM docs** for detailed technical information
3. **Reference [`architecture.md`](./architecture.md)** for current architecture (NOT arc42!)
4. **Follow BREAKING RULES** (no manual API clients, only Tailwind, etc.)
5. **Use semantic commits** with emoji prefixes

## Quick Lookup

**Need to...** → **Read this:**
- Understand architecture → [**Architecture Documentation**](./architecture.md) ⭐
- Understand overall project → [Project Overview](./project-overview.md)
- Add API endpoint → [API Contracts](./backend-api-contracts.md)
- Add UI component → [Component Inventory](./frontend-components.md)
- Modify database → [Data Models](./backend-data-models.md)
- Debug integration → [Integration Architecture](./integration-architecture.md)
- Setup environment → [Development Guide](./development-guide.md)

## Code Generation Patterns

**Backend Endpoint:**
```typescript
@Controller('resource')
@ApiTags('Resource')
export class ResourceController {
  @Get(':id')
  @ApiOperation({ summary: 'Get resource by ID' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  async findOne(@Param('id') id: string) {
    return this.resourceService.findOne(id);
  }
}
```

**Frontend Query Hook:**
```typescript
export const useResource = (id: string) => {
  return useQuery({
    queryKey: ['resource', id],
    queryFn: async () => {
      const response = await api.resource().findOne(id);
      return response.data;
    },
  });
};
```

**Frontend Component:**
```typescript
export const ResourceDetail = ({ id }: Props) => {
  const { data, isLoading, error } = useResource(id);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <NotFound />;

  return <div>{/* render resource */}</div>;
};
```

---
