import {
  closestCenter,
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  FloatButton,
  Grid,
  Input,
  List,
  Modal,
  Progress,
  Tabs,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PiListPlus, PiNotePencil } from 'react-icons/pi';

const { TextArea } = Input;
const { TabPane } = Tabs;

// Datei: SortableItem.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { logger } from '@/utils/logger.ts';

interface Props {
  id: string;
  children: React.ReactNode;
}

export const SortableItem: React.FC<Props> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const transformStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} className={`${isDragging ? 'opacity-50 z-100' : 'opacity-100'}`} style={transformStyle}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === Card) {
          const cardChild = child as React.ReactElement<{
            title: React.ReactElement<{
              children: [React.ReactElement, React.ReactElement];
            }>;
          }>;

          return React.cloneElement(cardChild, {
            ...cardChild.props,
            title: (
              <div
                className="flex justify-between cursor-grab select-none"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
              >
                <div>{cardChild.props.title.props.children[0]}</div>
                {cardChild.props.title.props.children[1]}
              </div>
            ),
          });
        }
        return child;
      })}
    </div>
  );
};

// ------------------ TYPES -------------------

interface ChecklistStep {
  name: string;
  note?: string;
}

interface Checklist {
  id: string;
  title: string;
  description: string;
  category: string; // Zur Gruppierung
  steps: ChecklistStep[];
}

interface CheckedItemsType {
  [checklistId: string]: {
    [stepIndex: number]: boolean;
  };
}

interface NotesType {
  [checklistId: string]: {
    [stepIndex: number]: string;
  };
}

// ------------------ MOCK-DATEN (Backlog) -------------------
const initialBacklog: Checklist[] = [
  {
    id: '1.1',
    title: 'Erste Lageerkundung (Quick-Check)',
    description: 'Schnelle Übersicht über die Einsatzstelle gewinnen',
    category: 'Einsatzvorbereitung',
    steps: [
      { name: 'Einsatzstelle anfahren: Sicherheit prüfen' },
      { name: 'Rückmeldung an Leitstelle/Einsatzleitung' },
      { name: 'Zusätzliche Kräfte anfordern' },
      { name: 'Gefahrenbereich absichern' },
    ],
  },
  {
    id: '1.2',
    title: 'Einsatzleitung einrichten',
    description: 'Einsatzleitwagen und Rollenverteilung',
    category: 'Einsatzvorbereitung',
    steps: [
      { name: 'ELW platzieren' },
      { name: 'Rollen (Einsatzleiter, Funk, etc.) festlegen' },
      { name: 'Kommunikationsmittel prüfen (Funk, Handys)' },
      { name: 'Technische Ressourcen hochfahren' },
    ],
  },
  {
    id: '2.1',
    title: 'Unwetter / Sturm / Hochwasser',
    description: 'Maßnahmen bei starken Unwettern und Hochwasser',
    category: 'Besondere Einsatzlagen',
    steps: [
      { name: 'Unwetterwarnungen einholen' },
      { name: 'Material checken (Sandsäcke, Pumpen)' },
      { name: 'Kräfte koordinieren (Feuerwehr/THW)' },
      { name: 'Lagekarte aktualisieren' },
    ],
  },
  {
    id: '2.2',
    title: 'Massenanfall von Verletzten (MANV)',
    description: 'Spezielle Organisation bei vielen Verletzten',
    category: 'Besondere Einsatzlagen',
    steps: [
      { name: 'MANV-Lage einschätzen (Anzahl Verletzte)' },
      { name: 'Zusätzliche Rettungsmittel anfordern' },
      { name: 'Absprache mit Kliniken (Aufnahmefähigkeit)' },
      { name: 'Patientensammelstelle/Triage' },
    ],
  },
];

// --------------- EXTRAHIERTE KOMPONENTEN ---------------

// Suchleiste als eigene Komponente, um Fokusproblem zu lösen
interface SearchInputProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchInput: React.FC<SearchInputProps> = React.memo(({ searchTerm, onSearchChange }) => {
  return (
    <Input.Search
      placeholder="Checklisten durchsuchen..."
      allowClear
      onChange={onSearchChange}
      value={searchTerm}
      className="mb-6"
      autoComplete="off"
      spellCheck="false"
      size="large"
    />
  );
});

// Skeleton für das Laden des Backlogs
const BacklogSkeleton: React.FC = () => (
  <div className="space-y-6">
    <Input.Search placeholder="Wird geladen..." disabled className="mb-6" size="large" />
    <div className="space-y-8 mt-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 p-6 rounded-lg">
          <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-100 rounded w-full mt-3 animate-pulse"></div>
          <div className="h-4 bg-gray-100 rounded w-2/3 mt-2 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

// Backlog-Inhalt als eigene Komponente
interface BacklogContentProps {
  isBacklogLoaded: boolean;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  backlogGrouped: Record<string, Checklist[]>;
  activateChecklist: (checklist: Checklist) => void;
  isMobile: boolean;
  debouncedSearchTerm: string;
}

const BacklogContent: React.FC<BacklogContentProps> = React.memo(
  ({ isBacklogLoaded, searchTerm, onSearchChange, backlogGrouped, activateChecklist, isMobile }) => {
    if (!isBacklogLoaded) {
      return <BacklogSkeleton />;
    }

    return (
      <div className="pb-6">
        <SearchInput searchTerm={searchTerm} onSearchChange={onSearchChange} />
        <Tabs defaultActiveKey="1" size="large" className="backlog-tabs" tabPosition="top">
          {Object.entries(backlogGrouped).length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Keine Checklisten gefunden. Bitte ändere deine Suchanfrage."
            />
          ) : (
            Object.entries(backlogGrouped).map(([category, items]) => (
              <TabPane tab={category} key={category}>
                {category === 'Keine Ergebnisse' ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Keine Checklisten gefunden. Bitte ändere deine Suchanfrage."
                  />
                ) : (
                  <List
                    dataSource={items}
                    renderItem={(checklist) => (
                      <List.Item
                        className="p-4 my-6 rounded-lg"
                        actions={[
                          <Button
                            type="primary"
                            onClick={() => {
                              activateChecklist(checklist);
                              if (isMobile) {
                                // Handler wird hier übergeben
                              }
                            }}
                            size="large"
                          >
                            Aktivieren
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Typography.Text strong style={{ fontSize: '18px' }}>
                              {checklist.title}
                            </Typography.Text>
                          }
                          description={
                            <Typography.Paragraph style={{ fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
                              {checklist.description}
                            </Typography.Paragraph>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </TabPane>
            ))
          )}
        </Tabs>
      </div>
    );
  },
);

// Checklisten-Karte als eigene Komponente
interface ChecklistCardProps {
  checklist: Checklist;
  checkedItems: CheckedItemsType;
  notes: NotesType;
  isMobile: boolean;
  handleCheckToggle: (checklistId: string, stepIndex: number) => void;
  openNoteModal: (checklistId: string, stepIndex: number) => void;
  getChecklistProgress: (checklist: Checklist) => number;
  handleExport: (checklist: Checklist, type: 'pdf' | 'print') => void;
}

const ChecklistCard: React.FC<ChecklistCardProps> = React.memo(
  ({
    checklist,
    checkedItems,
    notes,
    isMobile,
    handleCheckToggle,
    openNoteModal,
    getChecklistProgress,
    handleExport,
  }) => {
    const progressPercent = getChecklistProgress(checklist);

    const exportItems = [
      {
        key: 'pdf',
        label: 'Als PDF exportieren',
        onClick: () => handleExport(checklist, 'pdf'),
      },
      {
        key: 'print',
        label: 'Drucken',
        onClick: () => handleExport(checklist, 'print'),
      },
    ];

    return (
      <Card
        className="mb-6 shadow-sm"
        title={
          <div className="flex justify-between items-center">
            <Typography.Text strong className="mr-2 flex-1">
              {checklist.title}
            </Typography.Text>
            <Progress type="circle" percent={Math.round(progressPercent)} size={isMobile ? 32 : 40} />
          </div>
        }
      >
        <Typography.Paragraph italic className="text-sm mb-4">
          {checklist.description}
        </Typography.Paragraph>
        <List
          dataSource={checklist.steps}
          renderItem={(step, index) => {
            const isChecked = checkedItems[checklist.id]?.[index] || false;
            const stepNote = notes[checklist.id]?.[index] || '';
            return (
              <List.Item
                className="py-2"
                actions={[
                  <Button
                    type="text"
                    icon={<PiNotePencil size={20} />}
                    onClick={() => openNoteModal(checklist.id, index)}
                    size={isMobile ? 'large' : 'middle'}
                  />,
                ]}
              >
                <div className="flex items-start w-full gap-2">
                  <Checkbox
                    checked={isChecked}
                    onChange={() => handleCheckToggle(checklist.id, index)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className={`${isChecked ? 'line-through text-gray-500' : ''} break-words`}>{step.name}</div>
                    {stepNote && <div className="text-xs text-gray-500 mt-1 break-words">{stepNote}</div>}
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
        <Divider />
        <div className="flex justify-end">
          <Dropdown
            menu={{
              items: exportItems.map((item) => ({
                key: item.key,
                label: item.label,
                onClick: item.onClick,
              })),
            }}
            placement="bottomRight"
          >
            <Button type="dashed" size={isMobile ? 'large' : 'middle'}>
              Exportieren
            </Button>
          </Dropdown>
        </div>
      </Card>
    );
  },
);

// ------------------ HAUPTKOMPONENTE -------------------
const ChecklistsManager: React.FC = () => {
  const { md } = Grid.useBreakpoint();
  const isMobile = !md;
  const [isBacklogDrawerOpen, setIsBacklogDrawerOpen] = useState(false);
  const [isBacklogLoaded, setIsBacklogLoaded] = useState(false);
  // State für aktive Checklisten
  const [activeChecklists, setActiveChecklists] = useState<Checklist[]>([]);
  // State für Backlog
  const [backlog, setBacklog] = useState<Checklist[]>(initialBacklog);
  // Suchfeld
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  // Checkbox-States
  const [checkedItems, setCheckedItems] = useState<CheckedItemsType>({});
  // Notizen
  const [notes, setNotes] = useState<NotesType>({});
  // Modal für Notizen
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentChecklistId, setCurrentChecklistId] = useState<string>('');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [tempNote, setTempNote] = useState('');

  // --------------- DRAG & DROP SETUP ---------------
  // Wir verwenden den "closestCenter" Sensor und Maus/Touch
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  // --------------- FUNKTION: CHECKLISTE AKTIVIEREN ---------------
  const activateChecklist = useCallback(
    (checklist: Checklist) => {
      setActiveChecklists((prev) => [...prev, checklist]);
      setBacklog((prev) => prev.filter((item) => item.id !== checklist.id));
      if (isMobile) setIsBacklogDrawerOpen(false);
    },
    [isMobile],
  );

  // --------------- FUNKTION: CHECKBOX TOGGLE ---------------
  const handleCheckToggle = useCallback((checklistId: string, stepIndex: number) => {
    setCheckedItems((prev) => {
      const checklistSteps = prev[checklistId] || {};
      return {
        ...prev,
        [checklistId]: {
          ...checklistSteps,
          [stepIndex]: !checklistSteps[stepIndex],
        },
      };
    });
  }, []);

  // --------------- NOTIZEN HANDLING ---------------
  const openNoteModal = useCallback(
    (checklistId: string, stepIndex: number) => {
      setCurrentChecklistId(checklistId);
      setCurrentStepIndex(stepIndex);
      const existingNote = notes[checklistId]?.[stepIndex] || '';
      setTempNote(existingNote);
      setIsModalOpen(true);
    },
    [notes],
  );

  const handleSaveNote = useCallback(() => {
    setNotes((prev) => {
      const checklistNotes = prev[currentChecklistId] || {};
      return {
        ...prev,
        [currentChecklistId]: {
          ...checklistNotes,
          [currentStepIndex]: tempNote,
        },
      };
    });
    setIsModalOpen(false);
    setTempNote('');
  }, [currentChecklistId, currentStepIndex, tempNote]);

  // --------------- PROGRESS pro Checkliste ---------------
  const getChecklistProgress = useCallback(
    (checklist: Checklist) => {
      const total = checklist.steps.length;
      const done = checkedItems[checklist.id] || {};
      const doneCount = Object.values(done).filter(Boolean).length;
      return (doneCount / total) * 100;
    },
    [checkedItems],
  );

  // --------------- DRAG & DROP EVENTS ---------------
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = activeChecklists.findIndex((item) => item.id === active.id);
      const newIndex = activeChecklists.findIndex((item) => item.id === over.id);

      // arrayMove aus dnd-kit (verschiebt Elemente im Array)
      setActiveChecklists((items) => arrayMove(items, oldIndex, newIndex));
    },
    [activeChecklists],
  );

  // Debounce für die Suche, um Fokusverlust zu vermeiden
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --------------- BACKLOG FILTERN NACH SUCHE ---------------
  const filteredBacklog = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return backlog;

    const lowerSearch = debouncedSearchTerm.toLowerCase().trim();
    return backlog.filter(
      (checklist) =>
        checklist.title.toLowerCase().includes(lowerSearch) ||
        checklist.description.toLowerCase().includes(lowerSearch),
    );
  }, [debouncedSearchTerm, backlog]);

  // --------------- BACKLOG GRUPPIEREN ---------------
  // Wir packen die gefilterten Checklisten in ein Objekt nach category
  const backlogGrouped = useMemo(() => {
    const groups: Record<string, Checklist[]> = {};

    // Wenn keine Ergebnisse gefunden wurden, zeigen wir eine Nachricht an
    if (filteredBacklog.length === 0 && debouncedSearchTerm.trim() !== '') {
      groups['Keine Ergebnisse'] = [];
      return groups;
    }

    filteredBacklog.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredBacklog, debouncedSearchTerm]);

  // --------------- BACKLOG LOADING ---------------
  useEffect(() => {
    if (isBacklogDrawerOpen || !isMobile) {
      const timer = setTimeout(() => {
        setIsBacklogLoaded(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isBacklogDrawerOpen, isMobile]);

  // --------------- EXPORT einzelner Checklisten ---------------
  const handleExport = useCallback((checklist: Checklist, type: 'pdf' | 'print') => {
    if (type === 'pdf') {
      logger.log('PDF Export der Checkliste:', checklist);
      // TODO: PDF Export Implementierung
    } else {
      logger.log('Drucken der Checkliste:', checklist);
      window.print();
    }
  }, []);

  // Optimierter Callback für Sucheingabe
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // --------------- RENDERING ---------------
  return (
    <div className="p-4">
      <Typography.Title level={2} className="mb-6">
        Checklisten-Manager
      </Typography.Title>

      {/* Auf Desktop: Tab-Layout statt Spalten */}
      {!isMobile ? (
        <Card className="shadow-sm">
          <Tabs
            defaultActiveKey="active"
            size="large"
            tabBarExtraContent={
              <span className="text-sm text-gray-500 mr-4">
                {activeChecklists.length} aktiv / {backlog.length} verfügbar
              </span>
            }
          >
            <TabPane tab={<span className="px-2">Aktive Checklisten</span>} key="active">
              <div className="p-4 min-h-[300px] max-h-[calc(100vh-280px)] overflow-auto">
                {activeChecklists.length === 0 ? (
                  <div className="text-center py-12  rounded-lg">
                    <Typography.Text type="secondary">
                      Keine Checklisten aktiv. Wähle eine aus dem Backlog aus.
                    </Typography.Text>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext
                        items={activeChecklists.map((item) => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {activeChecklists.map((checklist) => (
                          <SortableItem key={checklist.id} id={checklist.id}>
                            <ChecklistCard
                              checklist={checklist}
                              checkedItems={checkedItems}
                              notes={notes}
                              isMobile={isMobile}
                              handleCheckToggle={handleCheckToggle}
                              openNoteModal={openNoteModal}
                              getChecklistProgress={getChecklistProgress}
                              handleExport={handleExport}
                            />
                          </SortableItem>
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            </TabPane>
            <TabPane tab={<span className="px-2">Backlog</span>} key="backlog">
              <div className="p-4 max-h-[calc(100vh-280px)] overflow-auto">
                <BacklogContent
                  isBacklogLoaded={isBacklogLoaded}
                  searchTerm={searchTerm}
                  onSearchChange={handleSearchChange}
                  backlogGrouped={backlogGrouped}
                  activateChecklist={activateChecklist}
                  isMobile={isMobile}
                  debouncedSearchTerm={debouncedSearchTerm}
                />
              </div>
            </TabPane>
          </Tabs>
        </Card>
      ) : (
        // Mobile: Nur aktive Checklisten zeigen, Backlog im Drawer
        <>
          <div className="mb-4 flex items-center justify-between">
            <Typography.Title level={4} className="m-0">
              Aktive Checklisten
            </Typography.Title>
            <span className="text-sm text-gray-500">{activeChecklists.length} aktiv</span>
          </div>

          {activeChecklists.length === 0 ? (
            <div className="text-center py-12 rounded-lg">
              <Typography.Text type="secondary" style={{ fontSize: '16px' }}>
                Keine Checklisten aktiv. Wähle eine aus dem Backlog aus.
              </Typography.Text>
            </div>
          ) : (
            <div className="space-y-6">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={activeChecklists.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  {activeChecklists.map((checklist) => (
                    <SortableItem key={checklist.id} id={checklist.id}>
                      <ChecklistCard
                        checklist={checklist}
                        checkedItems={checkedItems}
                        notes={notes}
                        isMobile={isMobile}
                        handleCheckToggle={handleCheckToggle}
                        openNoteModal={openNoteModal}
                        getChecklistProgress={getChecklistProgress}
                        handleExport={handleExport}
                      />
                    </SortableItem>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          <Drawer
            title={
              <Typography.Title level={4} style={{ margin: 0 }}>
                Checklisten Backlog
              </Typography.Title>
            }
            placement="right"
            width="100%"
            onClose={() => {
              setIsBacklogDrawerOpen(false);
              // Reset loading state when drawer closes
              setTimeout(() => setIsBacklogLoaded(false), 300);
            }}
            open={isBacklogDrawerOpen}
            bodyStyle={{ padding: '16px', paddingBottom: '80px' }}
          >
            <BacklogContent
              isBacklogLoaded={isBacklogLoaded}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              backlogGrouped={backlogGrouped}
              activateChecklist={activateChecklist}
              isMobile={isMobile}
              debouncedSearchTerm={debouncedSearchTerm}
            />
          </Drawer>
          <FloatButton
            icon={<PiListPlus size={24} />}
            type="primary"
            onClick={() => setIsBacklogDrawerOpen(true)}
            tooltip="Checkliste hinzufügen"
          />
        </>
      )}

      {/* Notiz Modal */}
      <Modal
        title="Notiz hinzufügen / bearbeiten"
        open={isModalOpen}
        onOk={handleSaveNote}
        onCancel={() => setIsModalOpen(false)}
        width={isMobile ? '95%' : '520px'}
      >
        <TextArea
          rows={4}
          value={tempNote}
          onChange={(e) => setTempNote(e.target.value)}
          size={isMobile ? 'large' : 'middle'}
          className="mt-4"
          placeholder="Notiz eingeben..."
        />
      </Modal>
    </div>
  );
};

export default ChecklistsManager;
