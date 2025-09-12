# Story 1.15: ETB-Suchfunktion und Filter

## Story Details
- **Story ID**: ETB-1.15
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 5
- **Sprint**: Phase 2
- **PRD-Referenz**: FR7

## User Story
**Als** Einsatzleiter  
**möchte ich** ETB-Einträge durchsuchen und filtern können  
**damit** ich schnell relevante Informationen während und nach dem Einsatz finde

## Acceptance Criteria
- [ ] Volltextsuche über alle ETB-Einträge implementiert
- [ ] Filter für Zeitraum (von/bis mit Datepicker)
- [ ] Filter für Kategorie (Multi-Select)
- [ ] Filter für Ersteller (Dropdown mit allen Beteiligten)
- [ ] Kombinierbare Filter mit AND-Verknüpfung
- [ ] Ergebnisse paginiert (20 Einträge pro Seite)
- [ ] Anzahl der Treffer wird angezeigt
- [ ] Filter-Reset Button vorhanden
- [ ] Such-Historie für letzte 5 Suchen
- [ ] Export der gefilterten Ergebnisse möglich
- [ ] Highlighting der Suchbegriffe in Ergebnissen
- [ ] Performance: Suche < 500ms bei 1000 Einträgen

## Technical Implementation Guide

### 1. Backend Search Service (Simplified)
```typescript
// packages/backend/src/etb/services/etb-search.service.ts
@Injectable()
export class EtbSearchService {
  async searchEntries(
    etbId: string,
    searchDto: SearchEtbDto,
  ): Promise<PaginatedResult<EtbEintrag>> {
    const { 
      query, 
      kategorien, 
      erstellerIds, 
      zeitraumVon, 
      zeitraumBis,
      page = 1,
      limit = 20 
    } = searchDto;
    
    // Simple Prisma where clause - no complex full-text search
    const where: Prisma.EtbEintragWhereInput = {
      etbId,
      ...(query && {
        text: { contains: query, mode: 'insensitive' }
      }),
      ...(kategorien?.length && {
        kategorie: { in: kategorien }
      }),
      ...(erstellerIds?.length && {
        erstelltVon: { in: erstellerIds }
      }),
      ...(zeitraumVon || zeitraumBis) && {
        timestamp: {
          ...(zeitraumVon && { gte: zeitraumVon }),
          ...(zeitraumBis && { lte: zeitraumBis })
        }
      }
    };
    
    return this.prisma.etbEintrag.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: { erstelltVonUser: true }
    });
  }
}
```

### 2. Search DTO
```typescript
// packages/backend/src/etb/dto/search-etb.dto.ts
export class SearchEtbDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  query?: string;
  
  @IsOptional()
  @IsArray()
  @IsEnum(EtbKategorie, { each: true })
  kategorien?: EtbKategorie[];
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  erstellerIds?: string[];
  
  @IsOptional()
  @IsISO8601()
  zeitraumVon?: string;
  
  @IsOptional()
  @IsISO8601()
  zeitraumBis?: string;
  
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;
  
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  limit?: number = 20;
}
```

### 3. Frontend Search Component
```tsx
// packages/frontend/src/components/organisms/etb/EtbSearch.tsx
export const EtbSearch: React.FC<{ etbId: string }> = ({ etbId }) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    kategorien: [],
    erstellerIds: [],
    zeitraumVon: null,
    zeitraumBis: null
  });
  
  const { data, isLoading } = useQuery({
    queryKey: ['etb-search', etbId, filters],
    queryFn: () => api.etb().searchEntries(etbId, filters),
    debounceMs: 300, // Using @tanstack/pacer
    enabled: filters.query.length > 1 || hasActiveFilters(filters)
  });
  
  const searchHistory = useStore(etbSearchHistoryStore);
  
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          placeholder="Suche in ETB-Einträgen..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>
      
      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap">
        <KategorieFilter 
          selected={filters.kategorien}
          onChange={(kategorien) => setFilters({ ...filters, kategorien })}
        />
        <ErstellerFilter
          selected={filters.erstellerIds}
          onChange={(erstellerIds) => setFilters({ ...filters, erstellerIds })}
        />
        <ZeitraumFilter
          von={filters.zeitraumVon}
          bis={filters.zeitraumBis}
          onChange={(zeitraum) => setFilters({ ...filters, ...zeitraum })}
        />
        <button
          onClick={() => setFilters(defaultFilters)}
          className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
        >
          Filter zurücksetzen
        </button>
      </div>
      
      {/* Results */}
      <EtbSearchResults 
        results={data?.items} 
        totalCount={data?.total}
        highlightQuery={filters.query}
      />
    </div>
  );
};
```

### 4. Database Optimization
```sql
-- Simple index for search performance
CREATE INDEX idx_etb_eintraege_search 
ON etb_eintraege(etb_id, timestamp DESC);
```

## Dependencies
- ETB-1.2 (Prisma Schema) - Für Datenbank-Struktur
- ETB-1.3 (Backend CRUD) - Für Service-Integration
- ETB-1.4 (API Client) - Für Frontend-Integration
- ETB-1.5 (UI Eingabe/Anzeige) - Für Ergebnis-Darstellung

## Testing Requirements
- Unit Tests für Search-Service
- Integration Tests für Filter-Kombinationen
- Performance Tests mit 1000+ Einträgen
- E2E Tests für Such-Workflow
- Accessibility Tests für Filter-UI

## Non-Functional Requirements
- Performance: Suchergebnisse < 500ms
- Skalierbarkeit: Funktioniert mit 10.000+ Einträgen
- UX: Instant Search mit Debouncing
- Responsive: Mobile-optimiert

## Risk Mitigation
- **Performance-Risiko**: Implementiere Caching für häufige Suchen
- **Datenbank-Last**: Nutze Read-Replicas für Suchen
- **Große Ergebnismengen**: Virtual Scrolling für Ergebnisliste