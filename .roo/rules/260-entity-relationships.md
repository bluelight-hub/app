---
description: DEFINE RELATIONSHIPS WHEN CREATING ENTITIES
globs: **/*.entity.ts
alwaysApply: false
---
# Entity & Relationship Best Practices

## Context
- Diese Regel gilt, wenn neue Entities erstellt oder bestehende Entities erweitert werden.
- Der Schwerpunkt liegt auf klar definierten Relationen und konsequenter ID-Verwaltung, um Datenintegrität und gute Wartbarkeit zu gewährleisten. ⚙️

## Requirements
1. **ID-Erzeugung**  
   - Jedes Entity sollte eine eindeutige ID besitzen (z. B. `@PrimaryColumn` + `@BeforeInsert` mit `nanoid()`).
   - Die ID wird im Lifecycle-Hook (`@BeforeInsert`) gesetzt und darf nicht manuell überschrieben werden.

2. **Relationen**  
   - **1:N und N:1**: 
     - Im "Parent"-Entity `@OneToMany` und im "Child"-Entity `@ManyToOne` verwenden.  
     - Achte auf beidseitige Navigation und den Einsatz von `{ onDelete: 'CASCADE' }` wo sinnvoll.
   - **Optionale Verknüpfungen**: 
     - Mit `nullable: true` kennzeichnen, wenn sie nicht verpflichtend sind.  
   - **Rekursive Strukturen** (z. B. `parent` und `children`) sollten eindeutig dokumentiert werden, um Missverständnisse zu vermeiden.

3. **Feld-Typen & Validierung**  
   - Nutze passende Datentypen, z. B. `type: 'datetime'` für Datumsfelder, `type: 'text'` für längere Texte.  
   - Bei Statusfeldern (z. B. `status: 'offen' | 'in Bearbeitung' | 'erledigt'`) immer TypeScript-Typen oder Enums verwenden.

4. **Naming & Beschreibung**  
   - Klar verständliche Feldnamen (CamelCase) und Entity-Namen (Singular).
   - Beschreibungen (`beschreibung`, `comment` oder ähnliche) sollten die Feldfunktion kurz erläutern (wenn sinnvoll).

5. **Token-Effizienz**  
   - Keine überflüssigen Daten (Felder, Comments usw.) speichern, die nicht für den AI-Kontext oder die Anwendung nötig sind.  
   - Kompakte und sinnvolle Kommentare beibehalten.

## Examples

### Gültiges Beispiel:
```typescript
@Entity()
export class Checkliste {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  setId() {
    this.id = nanoid();
  }

  @Column()
  name: string;

  @Column({ type: 'boolean', default: false })
  erledigt: boolean;

  @ManyToOne(() => Einsatz, (e) => e.checklisten, { onDelete: 'CASCADE' })
  einsatz: Einsatz;
}
```

### Ungültiges Beispiel:
```typescript
@Entity()
export class InvalidCheckliste {
  // Keine Erzeugung einer ID mit nanoid()
  @PrimaryColumn()
  id: string;

  // Fehlende Hook-Methode (z. B. @BeforeInsert)

  // Fehlende Relation oder Cascade-Definition
}
``` 