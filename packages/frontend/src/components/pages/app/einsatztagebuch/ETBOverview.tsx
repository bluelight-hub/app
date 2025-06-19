import { useFahrzeuge } from '@/hooks/etb/useFahrzeuge';
import { formatNatoDateTime } from '@/utils/date';
import { EtbKategorie } from '@bluelight-hub/shared/client';
import { EtbEntryDto, EtbEntryDtoStatusEnum } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import { ETBFormWrapper } from '@molecules/etb/ETBFormWrapper';
import { ETBHeader } from '@molecules/etb/ETBHeader';
import { ETBCardList } from '@organisms/etb/ETBCardList';
import { ETBEntryForm, ETBEntryFormData } from '@organisms/etb/ETBEntryForm';
import { ETBTable } from '@organisms/etb/ETBTable';
import { Alert, DatePicker, Drawer, Input, message, Space, Spin, Switch, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PiMagnifyingGlass } from 'react-icons/pi';
import { useEinsatztagebuch } from '../../../../hooks/etb/useEinsatztagebuch';
import { logger } from '../../../../utils/logger';

/**
 * Vereinfachter Mobile-Check
 */
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

/**
 * Komponente zur Anzeige des Einsatztagebuchs
 */
export const ETBOverview: React.FC = () => {
  // State für Filter
  const [includeUeberschrieben, setIncludeUeberschrieben] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filter, setFilter] = useState<{
    kategorie?: string;
    autorId?: string;
    search?: string;
    vonZeitstempel?: string;
    bisZeitstempel?: string;
    status?: EtbEntryDtoStatusEnum;
    empfaenger?: string;
  }>({});

  const { fahrzeuge, error: fahrzeugeError, refreshFahrzeuge } = useFahrzeuge();

  // States für UI
  const [inputVisible, setInputVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingEintrag, setEditingEintrag] = useState<EtbEntryDto | null>(null);
  const [isUeberschreibeModus, setIsUeberschreibeModus] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const {
    einsatztagebuch,
    archiveEinsatztagebuchEintrag,
    createEinsatztagebuchEintrag,
    ueberschreibeEinsatztagebuchEintrag,
  } = useEinsatztagebuch({
    filterParams: {
      includeUeberschrieben,
      page,
      limit: pageSize,
      ...filter,
      // Sortierung kann hier ergänzt werden, wenn Backend unterstützt
    },
  });

  // Periodisches Aktualisieren der Daten
  useEffect(() => {
    const interval = setInterval(() => {
      refreshFahrzeuge();
    }, 30000); // Alle 30 Sekunden aktualisieren

    return () => clearInterval(interval);
  }, [refreshFahrzeuge]);

  /**
   * Öffnet den Drawer zur Bearbeitung eines Eintrags
   */
  const modifyEntry = useCallback((entry: EtbEntryDto) => {
    setIsOpen(true);
    setEditingEintrag(entry);
    setIsUeberschreibeModus(true);
  }, []);

  /**
   * Schließt den Drawer
   */
  const onDrawerClose = useCallback(() => {
    setEditingEintrag(null);
    setIsOpen(false);
    setIsUeberschreibeModus(false);
  }, []);

  /**
   * Submit-Handler für das Formular
   */
  const handleEditFormSubmit = async (data: Partial<ETBEntryFormData>) => {
    if (editingEintrag && isUeberschreibeModus) {
      // Überschreiben des Eintrags
      await ueberschreibeEinsatztagebuchEintrag.mutateAsync({
        id: editingEintrag.id,
        beschreibung: data.content || '',
      });
      setIsOpen(false);
      setEditingEintrag(null);
      setIsUeberschreibeModus(false);
    }
  };

  /**
   * Handler für Seitenwechsel
   */
  const handlePageChange = (page: number, pageSize: number) => {
    setPage(page);
    setPageSize(pageSize);
  };

  /**
   * Handler für Änderungen an den Tabellenfiltern und Sortierung
   * @param filters Die gefilterten Spalten mit ihren Werten
   */
  const handleFilterChange = (filters: Record<string, React.Key[] | null>) => {
    // Alle Tabellenfilter zusammenführen und an den Backend-Request übergeben
    const newFilter = {
      ...filter,
      kategorie: filters.kategorie && filters.kategorie[0] ? String(filters.kategorie[0]) : undefined,
      autorId: filters.autorName && filters.autorName[0] ? String(filters.autorName[0]) : undefined,
      status: filters.status && filters.status[0] ? (filters.status[0] as EtbEntryDtoStatusEnum) : undefined,
      empfaenger:
        filters.abgeschlossenVon && filters.abgeschlossenVon[0] ? String(filters.abgeschlossenVon[0]) : undefined,
    };

    // Suche in der Beschreibungsspalte
    if (filters.beschreibung && filters.beschreibung[0]) {
      newFilter.search = String(filters.beschreibung[0]);
    }

    setFilter(newFilter);
    setPage(1); // Bei Filterwechsel auf Seite 1 zurücksetzen
  };

  /**
   * Handler für die Sortierung (für zukünftige Implementierung)
   */
  const handleSorterChange = () => {
    // Sortierung kann hier implementiert werden, wenn das Backend dies unterstützt
  };

  /**
   * Handler für die globale Suche
   * @param e Das Änderungsereignis des Eingabefelds
   */
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Da die globale Suche die Beschreibungsspalte betrifft, aktualisiere nur den search-Parameter
    const value = e.target.value;
    setFilter((prev) => ({
      ...prev,
      search: value || undefined,
    }));
    setPage(1); // Bei Suchänderung auf Seite 1 zurücksetzen
  };

  /**
   * Handler für Zeitraumfilter
   */
  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (!dates || !dates[0] || !dates[1]) {
      // Wenn keine Daten oder ungültige Daten, Filter zurücksetzen
      setFilter((prev) => ({
        ...prev,
        vonZeitstempel: undefined,
        bisZeitstempel: undefined,
      }));
    } else {
      // Prüfen, ob die Datumswerte gültig sind
      const vonDatum = dates[0];
      const bisDatum = dates[1];

      if (vonDatum && bisDatum) {
        // Sonst Filter mit Zeitstempeln setzen
        setFilter((prev) => ({
          ...prev,
          vonZeitstempel: vonDatum.startOf('day').toISOString(),
          bisZeitstempel: bisDatum.endOf('day').toISOString(),
        }));
      }
    }
    setPage(1); // Bei Datumswechsel auf Seite 1
  };

  /**
   * Rendert den Inhalt basierend auf dem Ladezustand
   */
  const renderContent = () => {
    // Zeige Ladeanimation, wenn Daten geladen werden
    if (einsatztagebuch.query.isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      );
    }

    // Zeige Fehler an, falls vorhanden
    if (einsatztagebuch.query.error) {
      return (
        <Alert
          message="Fehler beim Laden des Einsatztagebuchs"
          description={einsatztagebuch.query.error.toString()}
          type="error"
          showIcon
          className="mb-4"
          action={
            <button
              onClick={() => {
                einsatztagebuch.refetch();
              }}
              className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
            >
              Erneut versuchen
            </button>
          }
        />
      );
    }

    // Zeige die Tabelle oder Karten-Liste
    return (
      <div ref={parentRef} className="mt-8">
        {isMobile ? (
          // Mobile-Ansicht
          <ETBCardList
            entries={einsatztagebuch.data.items || []}
            onEditEntry={modifyEntry}
            onArchiveEntry={(nummer) => archiveEinsatztagebuchEintrag.mutate({ nummer })}
            onUeberschreibeEntry={modifyEntry}
          />
        ) : (
          // Desktop-Ansicht
          <ETBTable
            entries={einsatztagebuch.data.items || []}
            onEditEntry={modifyEntry}
            onArchiveEntry={(nummer) => archiveEinsatztagebuchEintrag.mutate({ nummer })}
            onUeberschreibeEntry={modifyEntry}
            fahrzeugeImEinsatz={fahrzeuge.data?.fahrzeugeImEinsatz || []}
            isLoading={einsatztagebuch.query.isLoading}
            isEditing={isOpen}
            onPageChange={handlePageChange}
            pagination={
              einsatztagebuch.data.pagination
                ? {
                    ...einsatztagebuch.data.pagination,
                    hasNextPage:
                      einsatztagebuch.data.pagination.currentPage < einsatztagebuch.data.pagination.totalPages,
                    hasPreviousPage: einsatztagebuch.data.pagination.currentPage > 1,
                  }
                : undefined
            }
            onFilterChange={handleFilterChange}
            onSorterChange={handleSorterChange}
          />
        )}
      </div>
    );
  };

  const [messageApi, contextHolder] = message.useMessage();

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {contextHolder}
      {/* Header */}
      <ETBHeader inputVisible={inputVisible} setInputVisible={setInputVisible} />

      {/* Fahrzeug-Fehler anzeigen, falls vorhanden */}
      {fahrzeugeError && (
        <Alert
          message="Fehler beim Laden der Fahrzeugdaten"
          description={fahrzeugeError.toString()}
          type="warning"
          showIcon
          closable
          className="mt-4 mb-2"
        />
      )}

      {/* Erweiterte Filter-Optionen */}
      <div className="mt-4 mb-2 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Space align="center">
            <Typography.Text>Überschriebene Einträge anzeigen:</Typography.Text>
            <Switch
              checked={includeUeberschrieben}
              onChange={setIncludeUeberschrieben}
              data-testid="toggle-ueberschrieben-switch"
            />
          </Space>

          <Space align="center">
            <Typography.Text>Zeitraum:</Typography.Text>
            <DatePicker.RangePicker onChange={handleDateRangeChange} allowClear placeholder={['Von', 'Bis']} />
          </Space>

          <Space align="center">
            <Input
              placeholder="Suchen..."
              onChange={handleSearch}
              allowClear
              prefix={<PiMagnifyingGlass />}
              style={{ width: 250 }}
            />
          </Space>
        </div>
      </div>

      {/* Formular für neuen Eintrag */}
      <ETBFormWrapper inputVisible={inputVisible} closeForm={() => setInputVisible(false)}>
        <ETBEntryForm
          onSubmitSuccess={async (data) => {
            try {
              // Erstellen eines typensicheren Objekts für den API-Aufruf
              const createEtbPayload = {
                inhalt: data.content,
                kategorie: EtbKategorie.Meldung,
                sender: data.sender,
                receiver: data.receiver,
              };

              await createEinsatztagebuchEintrag.mutateAsync(createEtbPayload);
              setInputVisible(false);
            } catch (error) {
              logger.error('Fehler beim Erstellen des Eintrags', error as Error);
              messageApi.error(
                'Fehler beim Erstellen des Eintrags: ' + (error instanceof Error ? error.message : String(error)),
              );
            }
          }}
          onCancel={() => setInputVisible(false)}
        />
      </ETBFormWrapper>

      {/* Hauptinhalt */}
      {renderContent()}

      {/* Drawer für Überschreiben */}
      <Drawer
        open={isOpen}
        onClose={onDrawerClose}
        title={
          editingEintrag && isUeberschreibeModus
            ? `Eintrag ${editingEintrag.laufendeNummer} von 
                            ${formatNatoDateTime(editingEintrag.timestampEreignis)} überschreiben`
            : editingEintrag
              ? `Eintrag ${editingEintrag.laufendeNummer} bearbeiten`
              : ''
        }
      >
        {editingEintrag && (
          <ETBEntryForm
            editingEntry={editingEintrag}
            onSubmitSuccess={handleEditFormSubmit}
            onCancel={onDrawerClose}
            isEditMode={!isUeberschreibeModus}
          />
        )}
      </Drawer>
    </div>
  );
};
