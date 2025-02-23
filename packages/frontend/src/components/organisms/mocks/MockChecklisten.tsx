import {
    closestCenter,
    DndContext,
    DragEndEvent,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
    Button,
    Card,
    Checkbox,
    Col,
    Divider,
    Dropdown,
    Input,
    List,
    Modal,
    Progress,
    Row,
    Tabs
} from "antd";
import React, { useMemo, useState } from "react";

const { TextArea } = Input;
const { TabPane } = Tabs;


// Datei: SortableItem.tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
    id: string;
    children: React.ReactNode;
}

export const SortableItem: React.FC<Props> = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

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
                            <div className="flex justify-between cursor-grab select-none"
                                ref={setActivatorNodeRef}
                                {...attributes}
                                {...listeners}
                            >
                                <div>
                                    {cardChild.props.title.props.children[0]}
                                </div>
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
        id: "1.1",
        title: "Erste Lageerkundung (Quick-Check)",
        description: "Schnelle Übersicht über die Einsatzstelle gewinnen",
        category: "Einsatzvorbereitung",
        steps: [
            { name: "Einsatzstelle anfahren: Sicherheit prüfen" },
            { name: "Rückmeldung an Leitstelle/Einsatzleitung" },
            { name: "Zusätzliche Kräfte anfordern" },
            { name: "Gefahrenbereich absichern" },
        ],
    },
    {
        id: "1.2",
        title: "Einsatzleitung einrichten",
        description: "Einsatzleitwagen und Rollenverteilung",
        category: "Einsatzvorbereitung",
        steps: [
            { name: "ELW platzieren" },
            { name: "Rollen (Einsatzleiter, Funk, etc.) festlegen" },
            { name: "Kommunikationsmittel prüfen (Funk, Handys)" },
            { name: "Technische Ressourcen hochfahren" },
        ],
    },
    {
        id: "2.1",
        title: "Unwetter / Sturm / Hochwasser",
        description: "Maßnahmen bei starken Unwettern und Hochwasser",
        category: "Besondere Einsatzlagen",
        steps: [
            { name: "Unwetterwarnungen einholen" },
            { name: "Material checken (Sandsäcke, Pumpen)" },
            { name: "Kräfte koordinieren (Feuerwehr/THW)" },
            { name: "Lagekarte aktualisieren" },
        ],
    },
    {
        id: "2.2",
        title: "Massenanfall von Verletzten (MANV)",
        description: "Spezielle Organisation bei vielen Verletzten",
        category: "Besondere Einsatzlagen",
        steps: [
            { name: "MANV-Lage einschätzen (Anzahl Verletzte)" },
            { name: "Zusätzliche Rettungsmittel anfordern" },
            { name: "Absprache mit Kliniken (Aufnahmefähigkeit)" },
            { name: "Patientensammelstelle/Triage" },
        ],
    },
];

// ------------------ HAUPTKOMPONENTE -------------------
const ChecklistsManager: React.FC = () => {
    // State für aktive Checklisten
    const [activeChecklists, setActiveChecklists] = useState<Checklist[]>([]);
    // State für Backlog
    const [backlog, setBacklog] = useState<Checklist[]>(initialBacklog);
    // Suchfeld
    const [searchTerm, setSearchTerm] = useState("");
    // Checkbox-States
    const [checkedItems, setCheckedItems] = useState<CheckedItemsType>({});
    // Notizen
    const [notes, setNotes] = useState<NotesType>({});
    // Modal für Notizen
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentChecklistId, setCurrentChecklistId] = useState<string>("");
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [tempNote, setTempNote] = useState("");

    // --------------- DRAG & DROP SETUP ---------------
    // Wir verwenden den "closestCenter" Sensor und Maus/Touch
    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor)
    );

    // --------------- FUNKTION: CHECKLISTE AKTIVIEREN ---------------
    const activateChecklist = (checklist: Checklist) => {
        setActiveChecklists((prev) => [...prev, checklist]);
        setBacklog((prev) => prev.filter((item) => item.id !== checklist.id));
    };

    // --------------- FUNKTION: CHECKBOX TOGGLE ---------------
    const handleCheckToggle = (checklistId: string, stepIndex: number) => {
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
    };

    // --------------- NOTIZEN HANDLING ---------------
    const openNoteModal = (checklistId: string, stepIndex: number) => {
        setCurrentChecklistId(checklistId);
        setCurrentStepIndex(stepIndex);
        const existingNote = notes[checklistId]?.[stepIndex] || "";
        setTempNote(existingNote);
        setIsModalOpen(true);
    };

    const handleSaveNote = () => {
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
        setTempNote("");
    };

    // --------------- PROGRESS pro Checkliste ---------------
    const getChecklistProgress = (checklist: Checklist) => {
        const total = checklist.steps.length;
        const done = (checkedItems[checklist.id] || {});
        const doneCount = Object.values(done).filter(Boolean).length;
        return (doneCount / total) * 100;
    };

    // --------------- DRAG & DROP EVENTS ---------------
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = activeChecklists.findIndex((item) => item.id === active.id);
        const newIndex = activeChecklists.findIndex((item) => item.id === over.id);

        // arrayMove aus dnd-kit (verschiebt Elemente im Array)
        setActiveChecklists((items) => arrayMove(items, oldIndex, newIndex));
    };

    // --------------- BACKLOG FILTERN NACH SUCHE ---------------
    const filteredBacklog = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return backlog.filter((checklist) =>
            checklist.title.toLowerCase().includes(lowerSearch) ||
            checklist.description.toLowerCase().includes(lowerSearch)
        );
    }, [searchTerm, backlog]);

    // --------------- BACKLOG GRUPPIEREN ---------------
    // Wir packen die gefilterten Checklisten in ein Objekt nach category
    const backlogGrouped = useMemo(() => {
        const groups: Record<string, Checklist[]> = {};
        filteredBacklog.forEach((item) => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item);
        });
        return groups;
    }, [filteredBacklog]);

    // --------------- EXPORT einzelner Checklisten ---------------
    const handleExport = (checklist: Checklist, type: 'pdf' | 'print') => {
        if (type === 'pdf') {
            console.log("PDF Export der Checkliste:", checklist);
            // TODO: PDF Export Implementierung
        } else {
            console.log("Drucken der Checkliste:", checklist);
            window.print();
        }
    };

    const exportItems = [
        {
            key: 'pdf',
            label: 'Als PDF exportieren',
            onClick: (checklist: Checklist) => handleExport(checklist, 'pdf'),
        },
        {
            key: 'print',
            label: 'Drucken',
            onClick: (checklist: Checklist) => handleExport(checklist, 'print'),
        },
    ];

    // --------------- RENDERING ---------------
    return (
        <div className="p-4">
            <h1 className="text-2xl mb-4">Checklisten-Manager</h1>

            <Row gutter={24}>
                {/* Spalte 1: Backlog */}
                <Col xs={24} md={8}>
                    <h2>Backlog</h2>
                    <Input.Search
                        placeholder="Checklisten durchsuchen..."
                        allowClear
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-4"
                        autoComplete="off" spellCheck="false"
                    />
                    {/* TABS nach Kategorie */}
                    <Tabs defaultActiveKey="1">
                        {Object.entries(backlogGrouped).map(([category, items]) => (
                            <TabPane tab={category} key={category}>
                                <List
                                    dataSource={items}
                                    renderItem={(checklist) => (
                                        <List.Item
                                            actions={[
                                                <Button
                                                    type="link"
                                                    onClick={() => activateChecklist(checklist)}
                                                >
                                                    Aktivieren
                                                </Button>,
                                            ]}
                                        >
                                            <List.Item.Meta
                                                title={checklist.title}
                                                description={checklist.description}
                                            />
                                        </List.Item>
                                    )}
                                />
                            </TabPane>
                        ))}
                    </Tabs>
                </Col>

                {/* Spalte 2: Aktive Checklisten */}
                <Col xs={24} md={16} className="space-y-4">
                    <h2>Aktive Checklisten</h2>
                    {activeChecklists.length === 0 && (
                        <p>Keine Checklisten aktiv. Wähle eine aus dem Backlog aus.</p>
                    )}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={activeChecklists.map((item) => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {activeChecklists.map((checklist) => {
                                const progressPercent = getChecklistProgress(checklist);
                                return (
                                    <SortableItem key={checklist.id} id={checklist.id}>
                                        <Card
                                            className="mb-4"
                                            title={
                                                <div className="flex justify-between">
                                                    <span>{checklist.title}</span>
                                                    <Progress
                                                        type="circle"
                                                        percent={Math.round(progressPercent)}
                                                        size={40}
                                                    />
                                                </div>
                                            }
                                        >
                                            <p className="italic mb-4">
                                                {checklist.description}
                                            </p>
                                            <List
                                                dataSource={checklist.steps}
                                                renderItem={(step, index) => {
                                                    const isChecked = checkedItems[checklist.id]?.[index] || false;
                                                    const stepNote = notes[checklist.id]?.[index] || "";
                                                    return (
                                                        <List.Item>
                                                            <div className="flex items-center w-full">
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    onChange={() => handleCheckToggle(checklist.id, index)}
                                                                />
                                                                <div className="ml-2 flex-1">
                                                                    <div className={`${isChecked ? 'line-through text-gray-500' : ''}`}>
                                                                        {step.name}
                                                                    </div>
                                                                    {stepNote && (
                                                                        <div className="text-xs text-gray-500">
                                                                            Notiz: {stepNote}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <Button
                                                                    type="link"
                                                                    onClick={() => openNoteModal(checklist.id, index)}
                                                                >
                                                                    Notiz
                                                                </Button>
                                                            </div>
                                                        </List.Item>
                                                    );
                                                }}
                                            />
                                            <Divider />
                                            <div className="flex justify-end">
                                                <Dropdown
                                                    menu={{
                                                        items: exportItems.map(item => ({
                                                            key: item.key,
                                                            label: item.label,
                                                            onClick: () => item.onClick(checklist),
                                                        })),
                                                    }}
                                                    placement="bottomRight"
                                                >
                                                    <Button type="dashed">
                                                        Exportieren
                                                    </Button>
                                                </Dropdown>
                                            </div>
                                        </Card>
                                    </SortableItem>
                                );
                            })}
                        </SortableContext>
                    </DndContext>
                </Col>
            </Row>

            {/* MODAL FÜR NOTIZ */}
            <Modal
                title="Notiz hinzufügen / bearbeiten"
                open={isModalOpen}
                onOk={handleSaveNote}
                onCancel={() => setIsModalOpen(false)}
            >
                <TextArea
                    rows={4}
                    value={tempNote}
                    onChange={(e) => setTempNote(e.target.value)}
                />
            </Modal>
        </div>
    );
};

export default ChecklistsManager;
