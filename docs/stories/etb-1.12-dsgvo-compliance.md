# Story: ETB DSGVO-Compliance & Vollständiger Audit-Trail

## Story Details
- **Story ID**: ETB-1.12
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH  
- **Story Points**: 10
- **Sprint**: Phase 1
- **PRD-Referenz**: FR12, NFR3, NFR4

## Titel
DSGVO-konforme Datenspeicherung und vollständiger Audit-Trail für ETB

## Beschreibung
Als **Compliance-Officer** möchte ich sicherstellen, dass alle ETB-Einträge DSGVO-konform gespeichert werden und ein vollständiger Audit-Trail (wer, wann, was) für alle Änderungen gemäß rechtlichen Anforderungen vorhanden ist.

## Akzeptanzkriterien
### DSGVO-Compliance
- [ ] Einfacher Hinweis bei Eingabe: "Bitte keine Patientennamen verwenden"
- [ ] Löschkonzept nach 10 Jahren implementiert (via Export)
- [ ] Datenexport-Funktion für Auskunftsersuchen
- [ ] Recht auf Vergessenwerden (anonymisieren statt löschen)

### Vollständiger Audit-Trail (FR12)
- [ ] Jede CREATE-Operation wird geloggt (wer, wann, was)
- [ ] Jede UPDATE-Operation wird geloggt mit Diff (vorher/nachher)
- [ ] Jede DELETE-Operation wird geloggt
- [ ] Jeder LESEZUGRIFF auf sensitive Daten wird geloggt
- [ ] Export-Operationen werden detailliert geloggt
- [ ] Status-Änderungen (DRAFT→ACTIVE→LOCKED) werden geloggt
- [ ] Login/Logout-Events im ETB-Kontext werden geloggt
- [ ] Fehlgeschlagene Zugriffsversuche werden geloggt
- [ ] Audit-Logs sind unveränderlich (append-only)
- [ ] Audit-Log-Viewer mit Filteroptionen für Administratoren

## Technische Details

### Backend Implementation
```typescript
// packages/backend/src/etb/validators/dsgvo.validator.ts
export class DsgvoValidator {
  private readonly namePatterns = [
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/, // Vor- und Nachname
    /\b(Herr|Frau|Dr\.) [A-Z][a-z]+\b/,
  ];

  validateEntry(text: string): ValidationResult {
    const warnings: string[] = [];
    
    this.namePatterns.forEach(pattern => {
      if (pattern.test(text)) {
        warnings.push('Möglicher Klarname erkannt');
      }
    });
    
    return { valid: warnings.length === 0, warnings };
  }
  
  pseudonymize(text: string): string {
    // Ersetze erkannte Namen mit Pseudonymen
    return text.replace(this.namePatterns[0], 'Patient [ID]');
  }
}
```

### Frontend Implementation
```tsx
// packages/frontend/src/components/etb/DsgvoWarning.tsx
export const DsgvoWarning: React.FC<{ text: string }> = ({ text }) => {
  const { data: validation } = useQuery({
    queryKey: ['dsgvo-validate', text],
    queryFn: () => api.etb().validateDsgvo({ text }),
  });

  if (!validation?.warnings?.length) return null;

  return (
    <Alert type="warning">
      <AlertTitle>Datenschutz-Warnung</AlertTitle>
      <AlertDescription>
        {validation.warnings.map(w => (
          <div key={w}>{w}</div>
        ))}
      </AlertDescription>
    </Alert>
  );
};
```

### Erweiterte Audit-Log Implementation
```typescript
// packages/backend/src/audit/services/etb-audit.service.ts
@Injectable()
export class EtbAuditService {
  async logOperation(params: {
    userId: string;
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'STATUS_CHANGE';
    entityType: 'ETB' | 'ETB_EINTRAG' | 'ETB_HISTORIE';
    entityId: string;
    details?: any;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const auditEntry = {
      ...params,
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      diff: params.oldValue && params.newValue 
        ? this.calculateDiff(params.oldValue, params.newValue)
        : null,
    };
    
    // Unveränderlicher Audit-Log (append-only)
    await this.prisma.etbAuditLog.create({
      data: {
        ...auditEntry,
        checksum: this.calculateChecksum(auditEntry),
      },
    });
    
    // Critical operations alert
    if (['DELETE', 'STATUS_CHANGE', 'EXPORT'].includes(params.operation)) {
      await this.alertService.sendCriticalOperationAlert(auditEntry);
    }
  }
  
  @UseInterceptors(AuditInterceptor)
  async getAuditTrail(
    etbId: string,
    filters?: AuditFilterDto,
  ): Promise<AuditTrailResponse> {
    // Auch Lesezugriffe auf Audit-Logs werden geloggt
    await this.logOperation({
      userId: this.currentUser.id,
      operation: 'READ',
      entityType: 'AUDIT_LOG',
      entityId: etbId,
      details: { filters },
    });
    
    return this.prisma.etbAuditLog.findMany({
      where: this.buildAuditQuery(etbId, filters),
      orderBy: { timestamp: 'desc' },
    });
  }
}
```

### Prisma Schema Erweiterung
```prisma
model EtbEintrag {
  // ... existing fields
  
  // DSGVO-relevante Felder
  istPseudonymisiert  Boolean  @default(false)
  originalHash        String?  // Hash des Original-Texts für Audit
  verschluesselt      Boolean  @default(false)
  
  @@map("etb_eintraege")
}

model EtbAuditLog {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  operation     AuditOperation
  entityType    String   
  entityId      String
  
  // Detaillierte Änderungsinformationen
  oldValue      Json?    // Vorheriger Zustand
  newValue      Json?    // Neuer Zustand
  diff          Json?    // Berechnete Unterschiede
  details       Json?    // Zusätzliche Details
  
  // Kontext-Informationen
  timestamp     DateTime @default(now())
  sessionId     String?
  ipAddress     String?
  userAgent     String?
  
  // Unveränderlichkeit
  checksum      String   // SHA-256 Hash für Integritätsprüfung
  
  @@index([userId, timestamp])
  @@index([entityId, timestamp])
  @@index([operation, timestamp])
  @@map("etb_audit_logs")
}

enum AuditOperation {
  CREATE
  READ
  UPDATE
  DELETE
  EXPORT
  STATUS_CHANGE
  LOGIN
  LOGOUT
  ACCESS_DENIED
}
```

### Frontend Audit-Viewer
```tsx
// packages/frontend/src/components/organisms/admin/AuditLogViewer.tsx
export const AuditLogViewer: React.FC = () => {
  const [filters, setFilters] = useState<AuditFilters>({
    operation: null,
    userId: null,
    dateFrom: null,
    dateTo: null,
    entityType: null,
  });
  
  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => api.audit().getEtbAuditLogs(filters),
  });
  
  return (
    <div className="space-y-4">
      <AuditFilterBar filters={filters} onChange={setFilters} />
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th>Zeitstempel</th>
              <th>Benutzer</th>
              <th>Operation</th>
              <th>Entität</th>
              <th>Details</th>
              <th>IP-Adresse</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs?.map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

## Dependencies
- etb-1.2-prisma-schema-setup.md (für Schema-Erweiterungen)
- etb-1.3-backend-crud-module.md (für Validator-Integration)

## Aufwandsschätzung
- Backend: 8 Story Points
- Frontend: 5 Story Points
- Testing: 3 Story Points

## Testing
- Unit Tests für Validator
- Integration Tests für Pseudonymisierung
- E2E Test für Warnung bei Klarnamen-Eingabe
- Compliance-Review durch Datenschutzbeauftragten