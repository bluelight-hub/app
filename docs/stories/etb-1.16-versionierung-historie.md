# Story 1.16: Versionierung und Historie

## Story Details
- **Story ID**: ETB-1.16
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 5
- **Sprint**: Phase 2
- **PRD-Referenz**: FR10, FR12

## User Story
**Als** Compliance-Officer  
**möchte ich** alle Änderungen an ETB-Einträgen nachvollziehen können  
**damit** rechtliche Anforderungen zur Revisionssicherheit erfüllt sind

## Acceptance Criteria
- [ ] Jede Änderung eines ETB-Eintrags erzeugt automatisch eine neue Version
- [ ] Alte Versionen bleiben unverändert in der Historie erhalten
- [ ] Versionsnummer wird automatisch hochgezählt
- [ ] Änderungsgrund kann optional angegeben werden
- [ ] Einfache Vorher/Nachher-Ansicht verfügbar
- [ ] Komplette Änderungshistorie pro Eintrag einsehbar
- [ ] Wiederherstellung alter Versionen möglich (nur für EL)
- [ ] Audit-Log zeigt: Wer, Wann, Was geändert, Von Version X zu Y
- [ ] Historie-Export als PDF für rechtliche Zwecke
- [ ] Performance: Historie-Abruf < 200ms
- [ ] Soft-Delete: Gelöschte Einträge werden nur markiert, nicht entfernt

## Technical Implementation Guide

### 1. Versionierungs-Service
```typescript
// packages/backend/src/etb/services/etb-versioning.service.ts
@Injectable()
export class EtbVersioningService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}
  
  async updateEintragWithVersioning(
    eintragId: string,
    updateDto: UpdateEtbEintragDto,
    userId: string,
    aenderungsgrund?: string,
  ): Promise<EtbEintrag> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Aktuelle Version abrufen
      const currentEintrag = await tx.etbEintrag.findUniqueOrThrow({
        where: { id: eintragId },
      });
      
      // 2. Prüfen ob ETB gesperrt
      const etb = await tx.einsatztagebuch.findUnique({
        where: { id: currentEintrag.etbId },
      });
      
      if (etb.status === EtbStatus.LOCKED) {
        throw new ForbiddenException('ETB ist gesperrt');
      }
      
      // 3. Historie-Eintrag erstellen
      await tx.etbEintragHistorie.create({
        data: {
          eintragId,
          version: currentEintrag.version,
          text: currentEintrag.text,
          kategorie: currentEintrag.kategorie,
          geaendertVon: userId,
          aenderungsgrund,
          snapshot: JSON.stringify(currentEintrag), // Kompletter Snapshot
        },
      });
      
      // 4. Eintrag aktualisieren mit neuer Version
      const updatedEintrag = await tx.etbEintrag.update({
        where: { id: eintragId },
        data: {
          ...updateDto,
          version: { increment: 1 },
          zuletztGeaendertVon: userId,
          zuletztGeaendertAm: new Date(),
        },
      });
      
      // 5. Audit-Log
      await this.auditService.log({
        aktion: 'ETB_EINTRAG_UPDATE',
        entitaet: 'EtbEintrag',
        entitaetId: eintragId,
        userId,
        details: {
          vonVersion: currentEintrag.version,
          zuVersion: updatedEintrag.version,
          aenderungsgrund,
          geaenderteFelder: Object.keys(updateDto),
        },
      });
      
      return updatedEintrag;
    });
  }
  
  async getEintragHistorie(
    eintragId: string,
  ): Promise<EtbEintragHistorie[]> {
    return this.prisma.etbEintragHistorie.findMany({
      where: { eintragId },
      orderBy: { version: 'desc' },
      include: { geaendertVonUser: true },
    });
  }
  
  async compareVersions(
    eintragId: string,
    version1: number,
    version2: number,
  ): Promise<VersionDiff> {
    const [v1, v2] = await Promise.all([
      this.getVersion(eintragId, version1),
      this.getVersion(eintragId, version2),
    ]);
    
    return {
      version1: v1,
      version2: v2,
      changes: this.calculateDiff(v1, v2),
    };
  }
  
  async restoreVersion(
    eintragId: string,
    targetVersion: number,
    userId: string,
  ): Promise<EtbEintrag> {
    const historicVersion = await this.prisma.etbEintragHistorie.findFirst({
      where: { eintragId, version: targetVersion },
    });
    
    if (!historicVersion) {
      throw new NotFoundException(`Version ${targetVersion} nicht gefunden`);
    }
    
    const snapshot = JSON.parse(historicVersion.snapshot);
    
    return this.updateEintragWithVersioning(
      eintragId,
      {
        text: snapshot.text,
        kategorie: snapshot.kategorie,
      },
      userId,
      `Wiederherstellung von Version ${targetVersion}`,
    );
  }
  
  private calculateDiff(v1: any, v2: any): FieldChange[] {
    const changes: FieldChange[] = [];
    const fields = ['text', 'kategorie', 'timestamp'];
    
    for (const field of fields) {
      if (v1[field] !== v2[field]) {
        changes.push({
          field,
          oldValue: v1[field],
          newValue: v2[field],
          type: this.getChangeType(v1[field], v2[field]),
        });
      }
    }
    
    return changes;
  }
}
```

### 2. Erweiterte Prisma Schema
```prisma
model EtbEintragHistorie {
  id              String      @id @default(cuid())
  eintragId       String
  eintrag         EtbEintrag  @relation(fields: [eintragId], references: [id])
  
  version         Int
  text            String      @db.Text
  kategorie       EtbKategorie
  timestamp       DateTime    // Original-Zeitstempel
  
  aenderungsgrund String?     @db.Text
  snapshot        Json        // Kompletter JSON-Snapshot
  
  geaendertVon    String      
  geaendertVonUser User       @relation(fields: [geaendertVon], references: [id])
  geaendertAm     DateTime    @default(now())
  
  @@unique([eintragId, version])
  @@index([eintragId, version])
  @@index([geaendertAm])
  @@map("etb_eintrag_historie")
}

model EtbEintrag {
  // ... existing fields ...
  
  version             Int              @default(1)
  istGeloescht        Boolean          @default(false) // Soft-Delete
  geloeschtAm         DateTime?
  geloeschtVon        String?
  
  zuletztGeaendertVon String?
  zuletztGeaendertAm  DateTime?
  
  historie            EtbEintragHistorie[]
}
```

### 3. Frontend Historie-Komponente
```tsx
// packages/frontend/src/components/organisms/etb/EtbHistorie.tsx
export const EtbHistorie: React.FC<{ eintragId: string }> = ({ eintragId }) => {
  const [selectedVersions, setSelectedVersions] = useState<[number?, number?]>([]);
  const { user } = useAuth();
  
  const { data: historie } = useQuery({
    queryKey: ['etb-historie', eintragId],
    queryFn: () => api.etb().getEintragHistorie(eintragId),
  });
  
  const { data: diff } = useQuery({
    queryKey: ['etb-diff', eintragId, selectedVersions],
    queryFn: () => 
      selectedVersions[0] && selectedVersions[1]
        ? api.etb().compareVersions(eintragId, selectedVersions[0], selectedVersions[1])
        : null,
    enabled: selectedVersions.length === 2,
  });
  
  const restoreMutation = useMutation({
    mutationFn: (version: number) => 
      api.etb().restoreVersion(eintragId, version),
    onSuccess: () => {
      queryClient.invalidateQueries(['etb-eintraege']);
      toast.success('Version wiederhergestellt');
    },
  });
  
  return (
    <div className="space-y-6">
      {/* Version Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        {historie?.map((version, index) => (
          <div key={version.id} className="relative flex items-start mb-4">
            <div className="absolute left-4 w-2 h-2 bg-blue-500 rounded-full -translate-x-1/2" />
            <div className="ml-10 flex-1">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">Version {version.version}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {formatDateTime(version.geaendertAm)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleVersionSelection(version.version)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Vergleichen
                    </button>
                    {user?.rolle === 'EL' && index > 0 && (
                      <button
                        onClick={() => restoreMutation.mutate(version.version)}
                        className="text-sm text-orange-600 hover:underline"
                      >
                        Wiederherstellen
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="text-sm">
                  <p className="text-gray-700">{version.geaendertVonUser.name}</p>
                  {version.aenderungsgrund && (
                    <p className="text-gray-600 italic mt-1">
                      Grund: {version.aenderungsgrund}
                    </p>
                  )}
                </div>
                
                {/* Preview of changes */}
                <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                  <DiffPreview 
                    oldText={historie[index + 1]?.text}
                    newText={version.text}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Diff View */}
      {diff && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-medium mb-4">
            Vergleich Version {selectedVersions[0]} ↔ {selectedVersions[1]}
          </h3>
          <DiffViewer diff={diff} />
        </div>
      )}
    </div>
  );
};
```

### 4. Audit-Log Integration
```typescript
// packages/backend/src/etb/interceptors/etb-audit.interceptor.ts
@Injectable()
export class EtbAuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    
    return next.handle().pipe(
      tap(async (data) => {
        // Log successful ETB operations
        if (url.includes('/etb/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          await this.auditService.log({
            userId: user.id,
            aktion: `ETB_${method}`,
            ressource: url,
            details: {
              body: request.body,
              response: data,
            },
          });
        }
      }),
    );
  }
}
```

## Dependencies
- ETB-1.2 (Prisma Schema) - Erweiterung für Historie-Tabellen
- ETB-1.3 (Backend CRUD) - Integration in Service-Layer
- ETB-1.6 (Rollenbasierte Berechtigungen) - Für Restore-Rechte
- ETB-1.12 (DSGVO Compliance) - Für Audit-Log

## Testing Requirements
- Unit Tests für Versionierungs-Service
- Integration Tests für Transaction-Safety
- E2E Tests für Historie-Workflow
- Performance Tests für große Historien
- Konsistenz-Tests für Soft-Delete

## Non-Functional Requirements
- Unveränderlichkeit: Historien-Einträge sind immutable
- Performance: Historie-Abruf < 200ms
- Speicher: Effiziente Snapshot-Speicherung
- Compliance: Vollständige Audit-Trail

## Risk Mitigation
- **Speicherplatz**: Implementiere Archivierung alter Versionen
- **Performance**: Nutze Pagination für Historie-Ansicht
- **Datenkonsistenz**: Transactional Safety für alle Operationen