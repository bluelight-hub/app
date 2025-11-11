# Testing

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/unified \
  -H "Content-Type: application/json" \
  -d '{"username": "test.user"}' \
  -c cookies.txt
```

**Authenticated Request:**
```bash
curl http://localhost:3000/api/alpha/einsatz \
  -b cookies.txt
```

---
