---
description: ENFORCE consistent floating button usage across mobile views
globs:
- packages/frontend/src/components/**/*.tsx
alwaysApply: false
---

# Mobile Floating Button Standards

## Context
- Gilt für alle mobilen Ansichten der Anwendung
- Betrifft die Verwendung von Floating Action Buttons (FABs)
- Sicherstellt konsistente UX auf mobilen Geräten

## Requirements

1. **Position & Aussehen**
   - Platzierung: Unten rechts
   - Abstand vom Rand: 16px
   - Icon-Größe: 24px
   - Primärfarbe für Hauptaktionen
   - Tooltip muss vorhanden sein

2. **Verhalten**
   - Öffnet Drawer von der rechten Seite
   - Drawer-Breite: 100% auf Mobilgeräten
   - Drawer erscheint mit Animation (slide-in)
   - Schließen durch Swipe oder X-Button

3. **Verwendungszwecke**
   - Hauptaktion der Ansicht
   - Neue Einträge erstellen
   - Listen oder Optionen anzeigen
   - Sekundäre Navigation

4. **Performance**
   - Drawer-Inhalt lazy laden
   - Mindestens 300ms Verzögerung beim ersten Render
   - Skeleton-Loading für Inhalte

## Examples

```tsx
// Korrektes Beispiel
const MobileView = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  useEffect(() => {
    if (isDrawerOpen) {
      const timer = setTimeout(() => setIsContentLoaded(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isDrawerOpen]);

  return (
    <>
      <FloatButton
        icon={<PiPlus size={24} />}
        type="primary"
        onClick={() => setIsDrawerOpen(true)}
        tooltip="Neu erstellen"
      />
      <Drawer
        width="100%"
        placement="right"
        
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        {isContentLoaded ? <DrawerContent /> : <SkeletonLoading />}
      </Drawer>
    </>
  );
};
``` 