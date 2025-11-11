# Common Response Structures

## Success Response (Wrapped)
```json
{
  "data": {
    // Response payload hier
  },
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
}
```

**Note:** Response-Wrapping erfolgt automatisch via Custom-Interceptor, außer wenn `@SkipTransform()` Decorator verwendet wird.

---

## Error Response
```json
{
  "statusCode": "number",
  "message": "string | string[]",
  "error": "string (optional)",
  "timestamp": "string (ISO 8601)",
  "path": "string"
}
```

---
