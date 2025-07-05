import { logger } from '@/utils/logger';
import { isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Button, Space } from 'antd';
import React from 'react';
import { PiChartBar, PiPlus } from 'react-icons/pi';

/**
 * Header-Komponente für das Einsatztagebuch
 * Enthält den Titel und einen Button zum Erstellen neuer Einträge
 */
interface ETBHeaderProps {
  /**
   * Gibt an, ob das Eingabeformular sichtbar ist
   */
  inputVisible: boolean;

  /**
   * Funktion zum Umschalten der Sichtbarkeit des Eingabeformulars
   */
  setInputVisible: (visible: boolean) => void;
}

/**
 * Öffnet das ETB-Dashboard in einem neuen Fenster
 * Verwendet Tauri-API falls verfügbar, sonst Browser-Fenster
 */
const openDashboard = () => {
  // Prüfen, ob Tauri verfügbar ist
  if (isTauri()) {
    try {
      // Absoluten URL-Pfad für Dashboard ermitteln
      const currentUrl = new URL(window.location.href);
      const dashboardUrl = `${currentUrl.protocol}//${currentUrl.host}/dashboard/etb`;

      logger.info('Öffne ETB-Dashboard mit Tauri', { dashboardUrl });

      // Tauri importieren und neues Fenster öffnen
      const appWindow = new WebviewWindow('etb-dashboard', {
        url: dashboardUrl,
        title: 'ETB Dashboard',
        width: 1200,
        height: 800,
        resizable: true,
        center: true,
        x: 100,
        y: 100,
      });
      appWindow.once('tauri://created', () => {
        appWindow.show();
      });
      appWindow.once('tauri://error', (err) => {
        logger.error('Fehler beim Öffnen des Tauri-Fensters', err);
      });

      logger.info('ETB-Dashboard mit Tauri geöffnet');
    } catch (err) {
      logger.error('Fehler beim Öffnen des Tauri-Fensters', err);
      // Fallback zum Browser-Fenster
      window.open('/dashboard/etb', '_blank');
    }
  } else {
    // Fallback für Browser (ohne Tauri)
    logger.info('Öffne ETB-Dashboard im Browser');
    window.open('/dashboard/etb', '_blank');
  }
};

export const ETBHeader: React.FC<ETBHeaderProps> = ({ inputVisible, setInputVisible }) => {
  return (
    <div className="flex items-center justify-between pb-5 border-b border-gray-200">
      <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">Einsatztagebuch</h1>
      <div className="mt-3 sm:mt-0 sm:ml-4">
        <Space>
          <Button onClick={openDashboard} icon={<PiChartBar />}>
            Dashboard
          </Button>
          <Button type="primary" onClick={() => setInputVisible(!inputVisible)} icon={<PiPlus />}>
            Neuer Eintrag
          </Button>
        </Space>
      </div>
    </div>
  );
};
