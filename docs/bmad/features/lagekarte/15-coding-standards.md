# 15. Coding Standards

## 15.1 Essential Rules für AI-Agents

**1. API-Client-Generation:**
```typescript
// ✅ RICHTIG: Generierter API-Client verwenden
const pois = await api.lagekarte().getPois({ einsatzId });

// ❌ FALSCH: Manueller Fetch
const pois = await fetch(`/api/lagekarte/${einsatzId}/pois`);
```

**2. TailwindCSS + Headless UI:**
```tsx
// ✅ RICHTIG: Tailwind Classes
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600">POI erstellen</button>

// ❌ FALSCH: Inline Styles oder CSS-in-JS
<button style={{ padding: '8px 16px', background: 'blue' }}>POI erstellen</button>
```

**3. TanStack Query Hooks:**
```typescript
// ✅ RICHTIG: Custom Hook mit TanStack Query
export const usePois = (einsatzId: string) => {
  return useQuery({
    queryKey: LAGEKARTE_QUERY_KEYS.pois(einsatzId),
    queryFn: () => api.lagekarte().getPois({ einsatzId }),
  });
};

// ❌ FALSCH: Direct useState + useEffect
const [pois, setPois] = useState([]);
useEffect(() => { fetchPois(); }, []);
```

---

## 15.2 Naming Conventions

**Frontend:**
- **Components:** PascalCase (z.B. `PoiMarker.tsx`)
- **Hooks:** camelCase mit `use`-Prefix (z.B. `useLagekarteData.ts`)
- **Stores:** camelCase mit `Store`-Suffix (z.B. `lagekarteStore.ts`)

**Backend:**
- **Services:** PascalCase mit `Service`-Suffix (z.B. `PoiService`)
- **Controllers:** PascalCase mit `Controller`-Suffix (z.B. `LagekarteController`)
- **DTOs:** PascalCase mit `Dto`-Suffix (z.B. `CreatePoiDto`)

---

## 15.3 JSDoc Requirements (Backend)

**Sprache:** Deutsch

**Beispiel:**
```typescript
/**
 * Erstellt einen neuen POI auf der Lagekarte.
 *
 * Führt automatisch Geocoding durch, wenn eine Adresse angegeben ist,
 * aber keine Koordinaten vorhanden sind.
 *
 * @param einsatzId - Die ID des Einsatzes
 * @param dto - POI-Erstellungs-Daten
 * @returns Der erstellte POI mit Koordinaten
 * @throws {PoiNotFoundException} Wenn Einsatz nicht gefunden
 * @throws {GeocodingRateLimitException} Wenn Geocoding-Rate-Limit überschritten
 */
async createPoi(einsatzId: string, dto: CreatePoiDto): Promise<LagekartePoi> {
  // ...
}
```

---

## 15.4 Git Commit Format

**Semantic Commit Emojis (aus CLAUDE.md):**
```bash
# Neues Feature
git commit -m "✨(lagekarte): Add POI-Creation mit Auto-Geocoding"

# Bug-Fix
git commit -m "🐛(lagekarte): Fix POI-Marker nicht sichtbar bei Zoom-Level 19"

# Refactoring
git commit -m "♻️(lagekarte): Extrahiere GeocodingService aus PoiService"

# Tests
git commit -m "🧪(lagekarte): Add Unit-Tests für PoiService"

# Dokumentation
git commit -m "📝(lagekarte): Update Architecture-Dokumentation mit Workflows"
```

---
