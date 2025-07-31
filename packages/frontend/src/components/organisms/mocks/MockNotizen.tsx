import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  InsertTable,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { Button, Card, Drawer, Form, Input, message, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';
import './MockNotizen.css';

import { PiPencil, PiPlus } from 'react-icons/pi';
import { logger } from '@/utils/logger.ts';

/**
 * Typ für eine Notiz
 */
interface Note {
  id: string;
  title: string;
  content: string; // MDX/Markdown-Inhalt
  updatedAt: string; // Zeitstempel (String)
}

/** Beispielhafte Anfangsdaten */
const initialNotes: Note[] = [
  {
    id: 'N-001',
    title: 'Kurze Checkliste',
    content: `# Aufgaben\n- [x] Fahrzeug checken\n- [ ] Dokumente aktualisieren`,
    updatedAt: '2025-03-10 10:15',
  },
  {
    id: 'N-002',
    title: 'Übungsvorbereitung',
    content: `## Punkte\n1. Alarmplan prüfen\n2. Material einpacken\n\n> Achtung: Zeitfenster eng!`,
    updatedAt: '2025-03-12 08:45',
  },
];

const NotizenPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Aktuell ausgewählte Notiz (zum Bearbeiten oder Anzeigen)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Form für Titel etc.
  const [form] = Form.useForm<Note>();

  // Editor-Content (MDX/Markdown)
  const [mdValue, setMdValue] = useState<string>('');

  /**
   * MDXEditor Plugins Konfiguration
   *
   * TODO: [BUG] Das Dropdown-Menü für die Überschriften-Auswahl wird im Hintergrund angezeigt
   * - Problem: z-index Konflikt mit dem Ant Design Modal
   * - Mögliche Lösungen:
   *   1. MDXEditor Portal-Implementierung prüfen
   *   2. Alternative Dropdown-Komponente verwenden
   *   3. Auf neuere Version des MDXEditors warten
   *   4. Eigene Dropdown-Komponente implementieren
   *   5. Komponente nicht im Modal, sondern auf der Seite anzeigen (wahrscheinlich die beste Lösung)
   */
  const editorPlugins = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    toolbarPlugin({
      toolbarContents: () => (
        <>
          <UndoRedo />
          <BoldItalicUnderlineToggles />
          <BlockTypeSelect />
          <CreateLink />
          <InsertTable />
          <ListsToggle />
        </>
      ),
    }),
  ];

  /**
   * Spalten der Tabelle
   */
  const columns: ColumnsType<Note> = [
    {
      title: 'Titel',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Zuletzt geändert',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: '20%',
    },
    {
      title: 'Aktion',
      key: 'aktion',
      width: '20%',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" icon={<PiPencil />} onClick={() => handleEdit(record)}>
            Bearbeiten
          </Button>
          <Button size="small" onClick={() => handlePreview(record)}>
            Vorschau
          </Button>
        </div>
      ),
    },
  ];

  /**
   * Neue Notiz anlegen
   */
  const handleNew = () => {
    setSelectedNote(null);
    form.resetFields();
    setMdValue('');
    setModalOpen(true);
  };

  /**
   * Bearbeiten
   */
  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    form.setFieldsValue(note);
    setMdValue(note.content);
    setModalOpen(true);
  };

  /**
   * Vorschau (Drawer)
   */
  const handlePreview = (note: Note) => {
    setSelectedNote(note);
    setDrawerOpen(true);
  };

  /**
   * Modal: Speichern (Neu oder Update)
   */
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

      if (selectedNote) {
        // Update
        const updated = {
          ...selectedNote,
          title: values.title,
          content: mdValue,
          updatedAt: now,
        };
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        message.success('Notiz aktualisiert');
      } else {
        // Neu
        const newId = `N-${Math.floor(Math.random() * 10000)}`;
        const newNote: Note = {
          id: newId,
          title: values.title,
          content: mdValue,
          updatedAt: now,
        };
        setNotes([...notes, newNote]);
        message.success('Neue Notiz angelegt');
      }
      setModalOpen(false);
    } catch (err) {
      // Validierungsfehler
      logger.error(err);
    }
  };

  /**
   * Modal: Abbrechen
   */
  const handleCancel = () => {
    setModalOpen(false);
  };

  /**
   * Drawer: Schließen
   */
  const handleClosePreview = () => {
    setDrawerOpen(false);
    setSelectedNote(null);
  };

  /**
   * Rendert den Inhalt als Markdown
   */
  const renderPreview = () => {
    if (!selectedNote) return null;
    return (
      <div className="p-2 text-sm text-gray-800">
        <h3 className="text-lg font-bold mb-2">{selectedNote.title}</h3>
        <MDXEditor readOnly markdown={selectedNote.content} />
        <div className="mt-4 text-gray-400 text-xs">Letzte Änderung: {selectedNote.updatedAt}</div>
      </div>
    );
  };

  return (
    <Card title="Notizen (MDXEditor)">
      <div className="flex justify-end mb-4">
        <Button type="primary" icon={<PiPlus />} onClick={handleNew}>
          Neue Notiz
        </Button>
      </div>

      <Table dataSource={notes} columns={columns} rowKey="id" pagination={{ pageSize: 5 }} />

      {/* MODAL: Erstellen/Bearbeiten */}
      <Modal
        title={selectedNote ? 'Notiz bearbeiten' : 'Neue Notiz'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={handleCancel}
        okText="Speichern"
        cancelText="Abbrechen"
        width={800}
        className="mdx-editor-modal"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Titel" name="title" rules={[{ required: true, message: 'Bitte einen Titel eingeben' }]}>
            <Input />
          </Form.Item>
        </Form>
        <p className="text-sm text-gray-600 mb-1">Inhalt (MDX/Markdown):</p>

        <div className="border rounded-md relative" style={{ isolation: 'isolate' }}>
          <MDXEditor
            markdown={mdValue}
            onChange={(val: string) => setMdValue(val)}
            plugins={editorPlugins}
            contentEditableClassName="prose prose-sm max-w-none px-4 py-2"
            className="mdx-editor-wrapper"
          />
        </div>
      </Modal>

      {/* DRAWER: Vorschau */}
      <Drawer title="Notiz-Vorschau" open={drawerOpen} onClose={handleClosePreview} width={600}>
        <div className="prose max-w-full">{renderPreview()}</div>
      </Drawer>
    </Card>
  );
};

export default NotizenPage;
