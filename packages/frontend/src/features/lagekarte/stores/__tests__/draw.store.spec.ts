/**
 * Unit Tests für den Draw-Store — fokussiert auf Mutex- und Reset-Verhalten
 * der Gefahren-Sidebar-Actions (Issue: Gefahren-Tools ins Edit-Panel).
 *
 * Deckt insbesondere Szenarien aus der I/O-Matrix der Spec ab, die sonst nur
 * indirekt durch Component-Tests verifiziert wären.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { drawStore, openGefahrenSidebar, openZeichenSidebar, resetDrawStore, setDrawContext, setDrawMode, toggleGefahrenSidebar, toggleLock, toggleZeichenSidebar } from '../draw.store';

describe('draw.store — Gefahren-Sidebar', () => {
  beforeEach(() => {
    resetDrawStore();
  });

  describe('toggleGefahrenSidebar — Mutex', () => {
    it('sollte beim Öffnen die Zeichen-Sidebar schließen', () => {
      openZeichenSidebar('katalog');
      expect(drawStore.state.isZeichenSidebarVisible).toBe(true);

      toggleGefahrenSidebar();

      expect(drawStore.state.isGefahrenSidebarVisible).toBe(true);
      expect(drawStore.state.isZeichenSidebarVisible).toBe(false);
    });

    it('sollte beim Öffnen pendingZeichenPlacement abbrechen', () => {
      drawStore.setState((s) => ({ ...s, pendingZeichenPlacement: { definition: {} as never } }));
      toggleGefahrenSidebar();
      expect(drawStore.state.pendingZeichenPlacement).toBeNull();
    });
  });

  describe('toggleGefahrenSidebar — Close-Reset', () => {
    it('sollte drawContext + drawMode zurücksetzen, wenn Zone-Flow aktiv ist', () => {
      openGefahrenSidebar('zone');
      setDrawContext('gefahrenzone');
      setDrawMode('draw_polygon');
      expect(drawStore.state.drawMode).toBe('draw_polygon');
      expect(drawStore.state.drawContext).toBe('gefahrenzone');

      toggleGefahrenSidebar();

      expect(drawStore.state.isGefahrenSidebarVisible).toBe(false);
      expect(drawStore.state.drawMode).toBe('select');
      expect(drawStore.state.drawContext).toBeNull();
    });

    it('sollte drawMode zurücksetzen, wenn GAMS-Flow aktiv ist', () => {
      openGefahrenSidebar('gams');
      setDrawMode('draw_gams');
      expect(drawStore.state.drawMode).toBe('draw_gams');

      toggleGefahrenSidebar();

      expect(drawStore.state.isGefahrenSidebarVisible).toBe(false);
      expect(drawStore.state.drawMode).toBe('select');
    });

    it('sollte drawMode nicht verändern, wenn kein Gefahren-Flow aktiv ist', () => {
      openGefahrenSidebar('symbole');
      setDrawMode('draw_point');

      toggleGefahrenSidebar();

      expect(drawStore.state.isGefahrenSidebarVisible).toBe(false);
      expect(drawStore.state.drawMode).toBe('draw_point');
    });
  });

  describe('toggleZeichenSidebar — Mutex', () => {
    it('sollte beim Öffnen die Gefahren-Sidebar schließen', () => {
      openGefahrenSidebar('zone');
      expect(drawStore.state.isGefahrenSidebarVisible).toBe(true);

      toggleZeichenSidebar();

      expect(drawStore.state.isZeichenSidebarVisible).toBe(true);
      expect(drawStore.state.isGefahrenSidebarVisible).toBe(false);
    });
  });

  describe('toggleLock — Reset-Verhalten', () => {
    it('sollte beide Sidebars, drawContext und pendingZeichenPlacement zurücksetzen', () => {
      openGefahrenSidebar('zone');
      setDrawContext('gefahrenzone');
      setDrawMode('draw_polygon');
      drawStore.setState((s) => ({ ...s, pendingZeichenPlacement: { definition: {} as never } }));

      toggleLock();

      expect(drawStore.state.isLocked).toBe(true);
      expect(drawStore.state.isGefahrenSidebarVisible).toBe(false);
      expect(drawStore.state.isZeichenSidebarVisible).toBe(false);
      expect(drawStore.state.drawContext).toBeNull();
      expect(drawStore.state.pendingZeichenPlacement).toBeNull();
      expect(drawStore.state.drawMode).toBe('select');
    });

    it('sollte beim Entsperren den drawContext nicht automatisch setzen', () => {
      toggleLock();
      expect(drawStore.state.isLocked).toBe(true);

      toggleLock();
      expect(drawStore.state.isLocked).toBe(false);
      expect(drawStore.state.drawContext).toBeNull();
    });
  });
});
