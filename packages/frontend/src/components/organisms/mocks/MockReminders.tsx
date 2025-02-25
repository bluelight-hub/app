import { Button, Card, DatePicker, Form, Input, InputNumber, message, Modal, Radio, Select, Table, Tag } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { Key } from 'antd/es/table/interface';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/de';
import { useState } from 'react';
import { DATE_FORMATS, parseNatoDateTime } from '../../../utils/date';

interface RepeatConfig {
    intervalType: 'Minuten' | 'Stunden';
    intervalValue: number;
    endAfter: number;
}

interface Reminder {
    id: string;
    title: string;
    due: Dayjs;
    priority: 'niedrig' | 'mittel' | 'hoch';
    note: string;
    done: boolean;
    repeat: RepeatConfig | null;
}

interface FormValues {
    title: string;
    absoluteTime?: Dayjs;
    relativeIntervalValue?: number;
    relativeIntervalType?: 'Minuten' | 'Stunden';
    priority: Reminder['priority'];
    note?: string;
    repeatActive: boolean;
    intervalType?: 'Minuten' | 'Stunden';
    intervalValue?: number;
    endAfter?: number;
}

// MOCK-DATEN: Bitte später durch echte Daten ersetzen!
const initialReminders: Reminder[] = [
    {
        id: 'R-001',
        title: 'Lagebesprechung',
        due: dayjs().add(15, 'minute'),
        priority: 'hoch',
        note: 'Treffpunkt ELW, alle Abschnittleiter',
        done: false,
        repeat: null,
    },
    {
        id: 'R-002',
        title: 'Schichtwechsel in SEG-Verpflegung',
        due: dayjs().add(1, 'hour'),
        priority: 'mittel',
        note: 'Personalübersicht aktualisieren',
        done: false,
        repeat: {
            intervalType: 'Stunden',
            intervalValue: 3,
            endAfter: 2,
        },
    },
    {
        id: 'R-003',
        title: 'Technik-Check Drohne',
        due: dayjs().subtract(20, 'minute'),
        priority: 'niedrig',
        note: 'Akkus prüfen und Ersatz beschaffen',
        done: true,
        repeat: null,
    },
];

// Kreativere (aber nicht zu kindliche) Prioritäten
const priorities = [
    { label: '🔴 Eilig (Hoch)', value: 'hoch' },
    { label: '🟠 Bald (Mittel)', value: 'mittel' },
    { label: '🟢 Geht klar (Niedrig)', value: 'niedrig' },
];

// Wiederhol-Optionen – hier eine einfache Lösung:
const intervalTypes = [
    { label: 'Minuten', value: 'Minuten' },
    { label: 'Stunden', value: 'Stunden' },
];

const WeckerUndErinnerungen = () => {
    // State
    const [reminders, setReminders] = useState(initialReminders);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

    // Suchfeld-State
    const [searchText, setSearchText] = useState('');

    // Modus: relative oder absolute Zeit?
    const [timeMode, setTimeMode] = useState('absolute');

    // Farbe je nach Priorität
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'hoch':
                return 'red';
            case 'mittel':
                return 'orange';
            case 'niedrig':
                return 'green';
            default:
                return 'blue';
        }
    };

    // Formatiert Datum für die Anzeige
    const formatDate = (natoDate: string) => {
        try {
            const date = parseNatoDateTime(natoDate);
            return date.format('DD.MM.YYYY HH:mm');
        } catch {
            console.warn('Ungültiges Datumsformat:', natoDate);
            return natoDate;
        }
    };

    // Tabellen-Spalten
    const columns: ColumnType<Reminder>[] = [
        {
            title: 'Titel',
            dataIndex: 'title',
            key: 'title',
            sorter: (a, b) => a.title.localeCompare(b.title),
            render: (text: string, record: Reminder) => (
                <span className={record.done ? 'line-through text-gray-400' : ''}>
                    {text}
                </span>
            ),
        },
        {
            title: 'Fällig um',
            dataIndex: 'due',
            key: 'due',
            width: 180,
            sorter: (a, b) => a.due.unix() - b.due.unix(),
            render: (due: Dayjs) => formatDate(due.format(DATE_FORMATS.NATO_ANT)),
        },
        {
            title: 'Priorität',
            dataIndex: 'priority',
            key: 'priority',
            width: 140,
            filters: priorities.map(p => ({ text: p.label, value: p.value })),
            onFilter: (value: Key | boolean, record: Reminder) => record.priority === value,
            sorter: (a, b) => {
                const priorityOrder = { hoch: 3, mittel: 2, niedrig: 1 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            },
            render: (priorityValue: Reminder['priority']) => {
                const label = priorities.find((p) => p.value === priorityValue)?.label || priorityValue;
                return <Tag color={getPriorityColor(priorityValue)}>{label}</Tag>;
            },
        },
        {
            title: 'Notiz',
            dataIndex: 'note',
            key: 'note',
            width: '35%',
            ellipsis: true,
            sorter: (a, b) => a.note.localeCompare(b.note),
        },
        {
            title: 'Status',
            dataIndex: 'done',
            key: 'done',
            width: 120,
            filters: [
                { text: 'Aktiv', value: false },
                { text: 'Erledigt', value: true }
            ],
            onFilter: (value: Key | boolean, record: Reminder) => record.done === value,
            render: (done: boolean) => (
                <Tag color={done ? 'default' : 'processing'}>
                    {done ? 'Erledigt' : 'Aktiv'}
                </Tag>
            ),
        },
        {
            title: 'Wdh.',
            dataIndex: 'repeat',
            key: 'repeat',
            width: 200,
            filters: [
                { text: 'Einmalig', value: 'none' },
                { text: 'Wiederkehrend', value: 'repeat' }
            ],
            onFilter: (value: Key | boolean, record: Reminder) =>
                value === 'none' ? record.repeat === null : record.repeat !== null,
            render: (repeat: RepeatConfig | null) => {
                if (!repeat) return '–';
                return `Alle ${repeat.intervalValue} ${repeat.intervalType}, endet nach ${repeat.endAfter}x`;
            },
        },
        {
            title: 'Aktion',
            key: 'action',
            width: 160,
            fixed: 'right' as const,
            render: (_: unknown, record: Reminder) => (
                <div className="flex gap-2">
                    {!record.done && (
                        <Button
                            type="primary"
                            size="small"
                            onClick={() => handleMarkDone(record.id)}
                        >
                            Erledigt
                        </Button>
                    )}
                    <Button
                        danger
                        size="small"
                        onClick={() => handleDeleteReminder(record.id)}
                    >
                        Löschen
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => handleEdit(record)}
                    >
                        Bearbeiten
                    </Button>
                </div>
            ),
        },
    ];

    // "Erledigt" markieren
    const handleMarkDone = (id: string) => {
        setReminders((prev) =>
            prev.map((r) => (r.id === id ? { ...r, done: true } : r))
        );
    };

    // Löschen
    const handleDeleteReminder = (id: string) => {
        setReminders((prev) => prev.filter((r) => r.id !== id));
    };

    // Neues Reminder anlegen

    // Reminders filtern basierend auf Suchtext
    const filteredReminders = reminders.filter((r) =>
        r.title.toLowerCase().includes(searchText.toLowerCase()) ||
        r.note.toLowerCase().includes(searchText.toLowerCase())
    );

    // Modal öffnen und Formular zurücksetzen
    const showAddModal = () => {
        form.resetFields();
        setEditingReminder(null);
        setIsModalOpen(true);
    };

    // Bearbeitung starten
    const handleEdit = (reminder: Reminder) => {
        setEditingReminder(reminder);
        form.setFieldsValue({
            title: reminder.title,
            note: reminder.note,
            due: reminder.due,
            priority: reminder.priority,
            repeatActive: reminder.repeat !== null,
            intervalType: reminder.repeat?.intervalType,
            intervalValue: reminder.repeat?.intervalValue,
            endAfter: reminder.repeat?.endAfter,
        });
        setIsModalOpen(true);
    };

    // Modal schließen
    const handleCancel = () => {
        setIsModalOpen(false);
    };

    // Formular speichern
    const handleSave = (values: FormValues) => {
        // Zeitpunkt bestimmen: abhängig von "timeMode"
        let dueTime: Dayjs;
        if (timeMode === 'absolute' && values.absoluteTime) {
            dueTime = values.absoluteTime;
        } else if (values.relativeIntervalValue && values.relativeIntervalType) {
            // Relative Zeit in Minuten/Stunden umrechnen
            const factor = values.relativeIntervalType === 'Stunden' ? 60 : 1;
            dueTime = dayjs().add(values.relativeIntervalValue * factor, 'minute');
        } else {
            dueTime = dayjs(); // Fallback auf jetzt
        }

        // Eintrag generieren
        const newItem: Reminder = {
            id: editingReminder ? editingReminder.id : `R-${Math.floor(Math.random() * 10000)}`,
            title: values.title,
            due: dueTime,
            priority: values.priority,
            note: values.note || '',
            done: false,
            repeat: values.repeatActive && values.intervalType && values.intervalValue && values.endAfter
                ? {
                    intervalType: values.intervalType,
                    intervalValue: values.intervalValue,
                    endAfter: values.endAfter,
                }
                : null,
        };

        if (editingReminder) {
            // Bestehende Erinnerung aktualisieren
            const updatedReminders = reminders.map((reminder) =>
                reminder.id === editingReminder.id
                    ? {
                        ...reminder,
                        title: newItem.title,
                        due: newItem.due,
                        priority: newItem.priority,
                        note: newItem.note,
                        done: newItem.done,
                        repeat: newItem.repeat,
                    }
                    : reminder
            );
            setReminders(updatedReminders);
            message.success('Erinnerung aktualisiert');
        } else {
        // Neue Erinnerung hinzufügen
            setReminders([...reminders, newItem]);
            message.success('Erinnerung hinzugefügt');
        }

        setIsModalOpen(false);
        form.resetFields();
        setTimeMode('absolute');
    };

    return (
        <div className="p-4">
            <Card
                title="Wecker & Erinnerungen"
                className="shadow-md max-w-7xl mx-auto"
                extra={
                    <Button type="primary" onClick={showAddModal}>
                        + Neu
                    </Button>
                }
            >
                {/* Suchfeld 🔍 */}
                <div className="mb-4 flex items-center gap-2">
                    <Input
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="🔍 Suche in Titel und Notizen..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 300 }}
                    />
                </div>

                <Table
                    dataSource={filteredReminders}
                    columns={columns}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `${total} Einträge gesamt`
                    }}
                    scroll={{ x: 1500 }}
                    sticky
                    size="middle"
                />
            </Card>

            <Modal
                title={editingReminder ? 'Erinnerung bearbeiten' : 'Neue Erinnerung'}
                visible={isModalOpen}
                onCancel={handleCancel}
                onOk={() => form.submit()}
                okText="Speichern"
                cancelText="Abbrechen"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    initialValues={{ priority: 'mittel', repeatActive: false }}
                >
                    <Form.Item
                        label="Titel"
                        name="title"
                        rules={[{ required: true, message: 'Bitte einen Titel eingeben!' }]}
                    >
                        <Input autoComplete="off" spellCheck={false} />
                    </Form.Item>

                    {/* Auswahl: Relativ oder Absolut */}
                    <Form.Item label="Zeitmodus" name="timeMode">
                        <Radio.Group
                            value={timeMode}
                            onChange={(e) => setTimeMode(e.target.value)}
                        >
                            <Radio value="absolute">Fester Zeitpunkt (Datum/Uhrzeit)</Radio>
                            <Radio value="relative">Relative Zeit (z.B. in 20 Minuten)</Radio>
                        </Radio.Group>
                    </Form.Item>

                    {/* Absolute Zeit */}
                    {timeMode === 'absolute' && (
                        <Form.Item
                            label="Fälligkeit"
                            name="absoluteTime"
                            rules={[{
                                required: true,
                                message: 'Bitte ein Datum/Uhrzeit angeben!'
                            }]}
                        >
                            <DatePicker
                                showTime
                                placeholder="Datum und Uhrzeit wählen"
                            />
                        </Form.Item>
                    )}

                    {/* Relative Zeit */}
                    {timeMode === 'relative' && (
                        <>
                            <Form.Item
                                label="In wie vielen Einheiten?"
                                name="relativeIntervalValue"
                                rules={[{
                                    required: true,
                                    message: 'Bitte eine Zahl eingeben!'
                                }]}
                            >
                                <InputNumber min={1} autoComplete="off" spellCheck={false} />
                            </Form.Item>

                            <Form.Item
                                label="Einheit (Minuten oder Stunden)"
                                name="relativeIntervalType"
                            >
                                <Select options={intervalTypes} />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item label="Priorität" name="priority">
                        <Select options={priorities} />
                    </Form.Item>

                    <Form.Item label="Notiz" name="note">
                        <Input.TextArea rows={3} autoComplete="off" spellCheck={false} />
                    </Form.Item>

                    {/* Wiederhol-Option */}
                    <Form.Item
                        label="Wiederholung aktiv?"
                        name="repeatActive"
                        valuePropName="checked"
                    >
                        <Radio.Group>
                            <Radio value={false}>Nein</Radio>
                            <Radio value={true}>Ja</Radio>
                        </Radio.Group>
                    </Form.Item>

                    {/* Eingaben für Wiederholung nur anzeigen, wenn repeatActive == true */}
                    {form.getFieldValue('repeatActive') && (
                        <div className="border p-2 mb-2">
                            <Form.Item
                                label="Intervall"
                                name="intervalValue"
                                rules={[{ required: true, message: 'Bitte Intervall angeben!' }]}
                            >
                                <InputNumber min={1} autoComplete="off" spellCheck={false} />
                            </Form.Item>
                            <Form.Item label="Einheit" name="intervalType">
                                <Select options={intervalTypes} />
                            </Form.Item>
                            <Form.Item
                                label="Endet nach (Anzahl Wiederholungen)"
                                name="endAfter"
                                rules={[{ required: true, message: 'Bitte Anzahl angeben!' }]}
                            >
                                <InputNumber min={1} autoComplete="off" spellCheck={false} />
                            </Form.Item>
                        </div>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default WeckerUndErinnerungen;
