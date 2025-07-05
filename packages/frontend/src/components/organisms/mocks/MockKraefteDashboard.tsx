import { Button, Card, Form, Input, Modal, Radio, Select, Table, Tabs, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';
import { PiPlusCircleBold, PiTruckBold, PiUserFill, PiUsersThreeBold } from 'react-icons/pi';

/** -- 1) TYPEN -- **/

// Einsatzkräfte
type KraftStatus = 'verfügbar' | 'eingesetzt' | 'pause';
type KraftRole = 'Sanitäter' | 'Notarzt' | 'Betreuung' | 'Technik';
interface Einsatzkraft {
  id: string;
  name: string;
  role: KraftRole;
  status: KraftStatus;
  abschnitt?: string;
}

// Fahrzeuge
type FahrzeugStatus = 'Einsatzbereit' | 'Unterwegs' | 'Außer Dienst';
interface Fahrzeug {
  id: string;
  name: string; // z.B. "RTW 1", "MTF 2"
  type: string; // z.B. "RTW", "KTW", "ELW"
  status: FahrzeugStatus;
  standort?: string;
}

// Rollen
interface Rolle {
  id: string;
  name: string; // z.B. "Einsatzleiter"
  beschreibung?: string;
  aktiv: boolean; // Rolle derzeit nutzbar?
}

/** -- 2) MOCK-DATEN -- **/
// Einsatzkräfte (Beispiel)
const initialKraefte: Einsatzkraft[] = [
  { id: 'K-001', name: 'Max Mustermann', role: 'Sanitäter', status: 'verfügbar' },
  { id: 'K-002', name: 'Julia Beispiel', role: 'Notarzt', status: 'eingesetzt' },
  { id: 'K-003', name: 'Lukas Maier', role: 'Betreuung', status: 'pause' },
];

// Fahrzeuge
const initialFahrzeuge: Fahrzeug[] = [
  { id: 'F-001', name: 'RTW 1', type: 'RTW', status: 'Einsatzbereit', standort: 'Wache 1' },
  { id: 'F-002', name: 'MTF 2', type: 'MTF', status: 'Unterwegs', standort: 'Abschnitt Süd' },
];

// Rollen
const initialRollen: Rolle[] = [
  { id: 'R-001', name: 'Einsatzleiter', beschreibung: 'Gesamtverantwortung', aktiv: true },
  { id: 'R-002', name: 'Gruppenführer', beschreibung: 'Leitet eine Gruppe', aktiv: true },
  { id: 'R-003', name: 'Sprechfunker', aktiv: true },
];

/** -- 3) KOMPONENTE -- **/

const KraefteUebersicht: React.FC = () => {
  // Daten-States
  const [kraefte, setKraefte] = useState<Einsatzkraft[]>(initialKraefte);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>(initialFahrzeuge);
  const [rollen, setRollen] = useState<Rolle[]>(initialRollen);

  // Aktiver Tab
  const [activeTab, setActiveTab] = useState('kraefte');

  // Modal-Steuerung (Kraft / Fahrzeug / Rolle)
  const [kraftModalOpen, setKraftModalOpen] = useState(false);
  const [fahrzeugModalOpen, setFahrzeugModalOpen] = useState(false);
  const [rollenModalOpen, setRollenModalOpen] = useState(false);

  // Aktuell bearbeitete Einträge
  const [editingKraft, setEditingKraft] = useState<Einsatzkraft | null>(null);
  const [editingFahrzeug, setEditingFahrzeug] = useState<Fahrzeug | null>(null);
  const [editingRolle, setEditingRolle] = useState<Rolle | null>(null);

  // Formulare
  const [formKraft] = Form.useForm<Einsatzkraft>();
  const [formFahrzeug] = Form.useForm<Fahrzeug>();
  const [formRolle] = Form.useForm<Rolle>();

  /** -- 4) STAT-ÜBERSICHT OBEN -- **/
  const totalKraefte = kraefte.length;
  const totalFahrzeuge = fahrzeuge.length;
  const totalRollen = rollen.length;

  /** -- 5) TABELLEN-SPALTEN -- **/

  // 5a) Einsatzkräfte
  const columnsKraefte: ColumnsType<Einsatzkraft> = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (t) => <strong>{t}</strong> },
    { title: 'Rolle', dataIndex: 'role', key: 'role' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Abschnitt', dataIndex: 'abschnitt', key: 'abschnitt', render: (a) => a ?? '–' },
    {
      title: 'Aktion',
      key: 'aktion',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEditKraft(record)}>
          Bearbeiten
        </Button>
      ),
    },
  ];

  // 5b) Fahrzeuge
  const columnsFahrzeuge: ColumnsType<Fahrzeug> = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (t) => <strong>{t}</strong> },
    { title: 'Typ', dataIndex: 'type', key: 'type' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Standort', dataIndex: 'standort', key: 'standort', render: (s) => s ?? '–' },
    {
      title: 'Aktion',
      key: 'aktion',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEditFahrzeug(record)}>
          Bearbeiten
        </Button>
      ),
    },
  ];

  // 5c) Rollen
  const columnsRollen: ColumnsType<Rolle> = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (t) => <strong>{t}</strong> },
    { title: 'Beschreibung', dataIndex: 'beschreibung', key: 'beschreibung', render: (b) => b ?? '–' },
    {
      title: 'Aktiv',
      dataIndex: 'aktiv',
      key: 'aktiv',
      render: (val) => (val ? 'Ja' : 'Nein'),
    },
    {
      title: 'Aktion',
      key: 'aktion',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEditRolle(record)}>
          Bearbeiten
        </Button>
      ),
    },
  ];

  /** -- 6) CRUD-FUNKTIONEN (Einsatzkräfte) -- **/
  const handleNewKraft = () => {
    setEditingKraft(null);
    formKraft.resetFields();
    setKraftModalOpen(true);
  };
  const handleEditKraft = (item: Einsatzkraft) => {
    setEditingKraft(item);
    formKraft.setFieldsValue(item);
    setKraftModalOpen(true);
  };
  const handleSaveKraft = async () => {
    try {
      const values = await formKraft.validateFields();
      if (editingKraft) {
        // Update
        const updated = { ...editingKraft, ...values };
        setKraefte((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
        message.success('Einsatzkraft aktualisiert');
      } else {
        // Neu
        const newId = `K-${Math.floor(Math.random() * 10000)}`;
        const newItem: Einsatzkraft = { ...values, id: newId };
        setKraefte([...kraefte, newItem]);
        message.success('Neue Einsatzkraft angelegt');
      }
      setKraftModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  /** -- 7) CRUD-FUNKTIONEN (Fahrzeuge) -- **/
  const handleNewFahrzeug = () => {
    setEditingFahrzeug(null);
    formFahrzeug.resetFields();
    setFahrzeugModalOpen(true);
  };
  const handleEditFahrzeug = (item: Fahrzeug) => {
    setEditingFahrzeug(item);
    formFahrzeug.setFieldsValue(item);
    setFahrzeugModalOpen(true);
  };
  const handleSaveFahrzeug = async () => {
    try {
      const values = await formFahrzeug.validateFields();
      if (editingFahrzeug) {
        const updated = { ...editingFahrzeug, ...values };
        setFahrzeuge((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        message.success('Fahrzeug aktualisiert');
      } else {
        const newId = `F-${Math.floor(Math.random() * 10000)}`;
        const newItem: Fahrzeug = { ...values, id: newId };
        setFahrzeuge([...fahrzeuge, newItem]);
        message.success('Neues Fahrzeug angelegt');
      }
      setFahrzeugModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  /** -- 8) CRUD-FUNKTIONEN (Rollen) -- **/
  const handleNewRolle = () => {
    setEditingRolle(null);
    formRolle.resetFields();
    setRollenModalOpen(true);
  };
  const handleEditRolle = (item: Rolle) => {
    setEditingRolle(item);
    formRolle.setFieldsValue(item);
    setRollenModalOpen(true);
  };
  const handleSaveRolle = async () => {
    try {
      const values = await formRolle.validateFields();
      if (editingRolle) {
        const updated = { ...editingRolle, ...values };
        setRollen((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        message.success('Rolle aktualisiert');
      } else {
        const newId = `R-${Math.floor(Math.random() * 10000)}`;
        const newItem: Rolle = { ...values, id: newId };
        setRollen([...rollen, newItem]);
        message.success('Neue Rolle angelegt');
      }
      setRollenModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  /** -- 9) RENDER -- **/
  return (
    <Card title="Kräfteübersicht" bodyStyle={{ paddingTop: 16 }}>
      {/* OBERE STAT-LEISTE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* EINsatzkräfte */}
        <Card className="flex items-center gap-3">
          <PiUserFill size={32} className="text-gray-600" />
          <div>
            <p className="text-sm text-gray-500">Einsatzkräfte</p>
            <p className="text-xl font-semibold">{totalKraefte}</p>
          </div>
        </Card>
        {/* FAHRzeuge */}
        <Card className="flex items-center gap-3">
          <PiTruckBold size={32} className="text-gray-600" />
          <div>
            <p className="text-sm text-gray-500">Fahrzeuge</p>
            <p className="text-xl font-semibold">{totalFahrzeuge}</p>
          </div>
        </Card>
        {/* ROLLen */}
        <Card className="flex items-center gap-3">
          <PiUsersThreeBold size={32} className="text-gray-600" />
          <div>
            <p className="text-sm text-gray-500">Rollen</p>
            <p className="text-xl font-semibold">{totalRollen}</p>
          </div>
        </Card>
      </div>

      {/* TABS */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={[
          {
            key: 'kraefte',
            label: 'Einsatzkräfte',
            children: (
              <>
                <div className="mb-2 flex justify-end">
                  <Button icon={<PiPlusCircleBold />} onClick={handleNewKraft} type="primary">
                    Neue Kraft
                  </Button>
                </div>
                <Table dataSource={kraefte} columns={columnsKraefte} rowKey="id" pagination={{ pageSize: 5 }} />
              </>
            ),
          },
          {
            key: 'fahrzeuge',
            label: 'Fahrzeuge',
            children: (
              <>
                <div className="mb-2 flex justify-end">
                  <Button icon={<PiPlusCircleBold />} onClick={handleNewFahrzeug} type="primary">
                    Neues Fahrzeug
                  </Button>
                </div>
                <Table dataSource={fahrzeuge} columns={columnsFahrzeuge} rowKey="id" pagination={{ pageSize: 5 }} />
              </>
            ),
          },
          {
            key: 'rollen',
            label: 'Rollen',
            children: (
              <>
                <div className="mb-2 flex justify-end">
                  <Button icon={<PiPlusCircleBold />} onClick={handleNewRolle} type="primary">
                    Neue Rolle
                  </Button>
                </div>
                <Table dataSource={rollen} columns={columnsRollen} rowKey="id" pagination={{ pageSize: 5 }} />
              </>
            ),
          },
        ]}
      />

      {/* MODAL: KRAFT */}
      <Modal
        title={editingKraft ? 'Einsatzkraft bearbeiten' : 'Neue Einsatzkraft'}
        open={kraftModalOpen}
        onOk={handleSaveKraft}
        onCancel={() => setKraftModalOpen(false)}
        okText="Speichern"
        cancelText="Abbrechen"
      >
        <Form form={formKraft} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Bitte Namen eingeben' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Rolle" name="role" rules={[{ required: true, message: 'Bitte Rolle wählen' }]}>
            <Select
              options={[
                { label: 'Sanitäter', value: 'Sanitäter' },
                { label: 'Notarzt', value: 'Notarzt' },
                { label: 'Betreuung', value: 'Betreuung' },
                { label: 'Technik', value: 'Technik' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Status" name="status" rules={[{ required: true, message: 'Bitte Status wählen' }]}>
            <Radio.Group>
              <Radio.Button value="verfügbar">Verfügbar</Radio.Button>
              <Radio.Button value="eingesetzt">Eingesetzt</Radio.Button>
              <Radio.Button value="pause">Pause</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="Abschnitt" name="abschnitt">
            <Input placeholder="z.B. Abschnitt Süd" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL: FAHRZEUG */}
      <Modal
        title={editingFahrzeug ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}
        open={fahrzeugModalOpen}
        onOk={handleSaveFahrzeug}
        onCancel={() => setFahrzeugModalOpen(false)}
        okText="Speichern"
        cancelText="Abbrechen"
      >
        <Form form={formFahrzeug} layout="vertical">
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Bitte einen Fahrzeugnamen eingeben' }]}
          >
            <Input placeholder="z.B. RTW 1" />
          </Form.Item>
          <Form.Item label="Typ" name="type" rules={[{ required: true, message: 'Bitte Typ wählen' }]}>
            <Select
              options={[
                { label: 'RTW', value: 'RTW' },
                { label: 'KTW', value: 'KTW' },
                { label: 'MTF', value: 'MTF' },
                { label: 'ELW', value: 'ELW' },
                { label: 'Sonstiges', value: 'Sonstiges' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Status" name="status" rules={[{ required: true, message: 'Bitte Status wählen' }]}>
            <Radio.Group>
              <Radio.Button value="Einsatzbereit">Einsatzbereit</Radio.Button>
              <Radio.Button value="Unterwegs">Unterwegs</Radio.Button>
              <Radio.Button value="Außer Dienst">Außer Dienst</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="Standort" name="standort">
            <Input placeholder="z.B. Wache 1" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL: ROLLE */}
      <Modal
        title={editingRolle ? 'Rolle bearbeiten' : 'Neue Rolle'}
        open={rollenModalOpen}
        onOk={handleSaveRolle}
        onCancel={() => setRollenModalOpen(false)}
        okText="Speichern"
        cancelText="Abbrechen"
      >
        <Form form={formRolle} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Bitte einen Rollennamen eingeben' }]}>
            <Input placeholder="z.B. Einsatzleiter" />
          </Form.Item>
          <Form.Item label="Beschreibung" name="beschreibung">
            <Input.TextArea rows={2} placeholder="z.B. Aufgaben / Zuständigkeiten" />
          </Form.Item>
          <Form.Item label="Aktiv?" name="aktiv" initialValue={true}>
            <Radio.Group>
              <Radio.Button value={true}>Ja</Radio.Button>
              <Radio.Button value={false}>Nein</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default KraefteUebersicht;
