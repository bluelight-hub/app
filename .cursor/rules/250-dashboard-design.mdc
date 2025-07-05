---
description: Diese Regel erläutert, wie Dashboards eingesetzt werden können
globs: 
alwaysApply: false
---
# Dashboard-Design und -Architektur

## Context
- Dashboards in separaten Tauri Webview-Fenstern
- Gilt für Komponenten unter `src/components/pages/dashboard/**/*`
- Spezialisierte Ansichten für Datenvisualisierung und Monitoring

## Requirements
1. **Ordnerstruktur**
   - Alle Dashboard-Komponenten in `src/components/pages/dashboard/[feature]/`
   - Namenskonvention: `page.tsx` für Haupt-Dashboard-Komponente

2. **Layout und Design**
   - Verwendung von `DashboardLayout` aus `src/components/templates/DashboardLayout`
   - Keine Hauptnavigation, fokussierte Darstellung
   - Responsive Design für verschiedene Monitorgrößen
   - Klare visuelle Hierarchie mit Karten/Statistiken am Anfang

3. **Daten-Aktualisierung**
   - Implementierung von automatischer Aktualisierung (Polling/Subscriptions)
   - Anzeige des letzten Aktualisierungszeitpunkts
   - Manuelle Refresh-Möglichkeit

4. **State Management**
   - Autonomes State Management für jedes Dashboard
   - Verwendung von React Hooks oder Zustand für lokalen State
   - Klare Loading-States und Error-Handling

5. **Performance**
   - Optimierter Re-Render-Zyklus für Echtzeit-Updates
   - Memoization für berechnete Werte
   - Lazy Loading für sekundäre Inhalte

## Examples

<example>
# Korrektes Dashboard mit Auto-Refresh und Error-Handling
```tsx
const DashboardPage: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { data, error, isLoading, refetch } = useDataQuery();

  // Auto-Refresh Mechanismus
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastUpdate(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Loading-State
  if (isLoading && !data) {
    return <Spin size="large" tip="Lade Daten..." />;
  }

  // Error-State
  if (error) {
    return <Alert message="Fehler" description={error.toString()} type="error" />;
  }

  return (
    <div>
      <Title level={2}>Dashboard</Title>
      <Text type="secondary">
        Letzte Aktualisierung: {formatDateTime(lastUpdate)}
      </Text>
      <Button onClick={() => refetch()}>Aktualisieren</Button>
      
      {/* Statistik-Karten */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic title="Gesamt" value={data.total} />
          </Card>
        </Col>
        {/* Weitere Statistik-Karten */}
      </Row>
      
      {/* Detail-Daten */}
      <Table dataSource={data.items} />
    </div>
  );
};
```
</example>

<example type="invalid">
# Fehlerhaftes Dashboard ohne Aktualisierung und Error-Handling
```tsx
const BadDashboard: React.FC = () => {
  const { data } = useDataQuery();
  
  return (
    <div>
      <h1>Dashboard</h1>
      {data && data.items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};
```
</example> 