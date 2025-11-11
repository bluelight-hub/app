# Rate Limiting

**Global Default:**
- 100 Requests / Minute (Standard-Guard)

**Spezifische Limits:**
- **Auth - Unified Login**: 5 Requests / Minute
- **Auth - Check**: 10 Requests / Minute
- **Geocoding**: 10 Requests / Minute (Controller) + 1 Request / Sekunde (Service)
- **ETB - Create/Update/Delete**: 20 Requests / Minute
- **ETB - Read**: 100 Requests / Minute

**Response bei Überschreitung:**
- Status: 429 Too Many Requests
- Header: `Retry-After` mit Zeitangabe in Sekunden

---
