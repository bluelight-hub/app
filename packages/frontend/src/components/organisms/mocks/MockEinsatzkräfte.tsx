import { Button, Card, Form, Input, message, Radio, Select, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { TableRowSelection } from 'antd/es/table/interface';
import React, { useState } from 'react';
import { PiMagnifyingGlass } from 'react-icons/pi';

/**
 * Typen für Kraft, Rolle, Status etc.
 */
type Status = 'verfügbar' | 'eingesetzt' | 'pause';
type Role = 'Sanitäter' | 'Notarzt' | 'Betreuung' | 'Technik';

interface Kraft {
  id: string;
  name: string;
  role: Role;
  status: Status;
  abschnitt: string;
  funkkanal?: string;
  phone?: string;
  ankunft?: string;
  fahrzeug?: string; // z.B. "RTW 1"
  ereignisse?: string[]; // Aktuell relevante Ereignisse für diese Person
}

const rolesList = [
  { label: 'Sanitäter', value: 'Sanitäter' },
  { label: 'Notarzt', value: 'Notarzt' },
  { label: 'Betreuung', value: 'Betreuung' },
  { label: 'Technik', value: 'Technik' },
];

const statusList = [
  { label: 'Verfügbar', value: 'verfügbar' },
  { label: 'Eingesetzt', value: 'eingesetzt' },
  { label: 'Pause', value: 'pause' },
];

/**
 * MOCK-DATEN: Bitte durch echte API-Daten ersetzen.
 */
const initialKraefte: Kraft[] = [
  {
    id: 'K-001',
    name: 'Max Mustermann',
    role: 'Sanitäter',
    status: 'verfügbar',
    abschnitt: 'Nord',
    funkkanal: 'Kanal 3',
    phone: '0151-2345678',
    ankunft: '08:30',
    fahrzeug: 'RTW 1',
    ereignisse: ['Wartet auf Zuweisung', 'Keine Besonderheiten'],
  },
  {
    id: 'K-002',
    name: 'Julia Beispiel',
    role: 'Notarzt',
    status: 'eingesetzt',
    abschnitt: 'Süd',
    funkkanal: 'Kanal 1',
    phone: '0151-8765432',
    ankunft: '07:00',
    fahrzeug: 'NEF 2',
    ereignisse: ['Unterstützt Behandlung in Abschnitt Süd'],
  },
  {
    id: 'K-003',
    name: 'Lukas Maier',
    role: 'Betreuung',
    status: 'pause',
    abschnitt: 'Bereitstellungsraum',
    funkkanal: 'Kanal 2',
    phone: '0157-1112223',
    ankunft: '09:00',
    ereignisse: ['Auf Abruf'],
  },
];

const KraefteUebersicht: React.FC = () => {
  const [kraefte, setKraefte] = useState<Kraft[]>(initialKraefte);
  const [searchTerm, setSearchTerm] = useState('');

  // Checkbox-Auswahl für Massenverarbeitung
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Für "In-Zeile-Bearbeitung" merken wir uns, welches ID wir gerade bearbeiten.
  // (Wenn null, wird gerade keine Zeile bearbeitet)
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fürs Bearbeiten inline
  const [form] = Form.useForm<Kraft>();

  /**
   * 👉 Filterung nach searchTerm
   */
  const filteredData: Kraft[] = kraefte.filter((kraft) => {
    const term = searchTerm.toLowerCase();
    return (
      kraft.name.toLowerCase().includes(term) ||
      kraft.role.toLowerCase().includes(term) ||
      kraft.status.toLowerCase().includes(term) ||
      kraft.abschnitt.toLowerCase().includes(term) ||
      (kraft.fahrzeug?.toLowerCase().includes(term) ?? false)
    );
  });

  /**
   * 👉 Checkbox-Selektion (Massenverarbeitung)
   */
  const rowSelection: TableRowSelection<Kraft> = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  /**
   * 👉 Spalten-Definition
   */
  const columns: ColumnsType<Kraft> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Rolle',
      dataIndex: 'role',
      key: 'role',
      filters: rolesList.map((r) => ({ text: r.label, value: r.value })),
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color: string;
        switch (status) {
          case 'verfügbar':
            color = 'green';
            break;
          case 'eingesetzt':
            color = 'red';
            break;
          case 'pause':
            color = 'blue';
            break;
          default:
            color = 'default';
        }
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
      filters: statusList.map((s) => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Abschnitt',
      dataIndex: 'abschnitt',
      key: 'abschnitt',
    },
    {
      title: 'Fahrzeug',
      dataIndex: 'fahrzeug',
      key: 'fahrzeug',
      render: (fahrzeug) => fahrzeug ?? '–',
    },
    {
      title: 'Funkkanal',
      dataIndex: 'funkkanal',
      key: 'funkkanal',
      render: (funkkanal) => funkkanal ?? '–',
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) =>
        phone ? (
          <Tooltip title={`Anrufen: ${phone}`}>
            <span>{phone}</span>
          </Tooltip>
        ) : (
          '–'
        ),
    },
    {
      title: 'Ankunft',
      dataIndex: 'ankunft',
      key: 'ankunft',
      render: (time) => time ?? '–',
    },
    {
      title: 'Aktion',
      key: 'aktion',
      render: (_, record) => (
        <div className="flex gap-2">
          {editingId === record.id ? (
            // Gerade im Bearbeitungsmodus
            <Button
              type="primary"
              size="small"
              onClick={() => {
                form.submit();
              }}
            >
              Speichern
            </Button>
          ) : (
            // Noch nicht im Bearbeitungsmodus
            <Button
              size="small"
              onClick={() => {
                // Form initialisieren
                form.setFieldsValue(record);
                setEditingId(record.id);
              }}
            >
              Bearbeiten
            </Button>
          )}
          <Button danger size="small" onClick={() => handleDelete(record.id)}>
            Entfernen
          </Button>
        </div>
      ),
    },
  ];

  /**
   * 👉 Expanded-Row: Zeigt entweder zusätzliche Infos oder (wenn wir
   * gerade diese Zeile bearbeiten) ein Inline-Formular.
   */
  const expandedRowRender = (record: Kraft) => {
    // Prüfen, ob wir genau diese Zeile bearbeiten
    if (editingId === record.id) {
      // 👇 Inline-Form (Bearbeitung)
      return (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          // Feldwerte sind bereits gesetzt via setFieldsValue(...)
        >
          <Form.Item name="id" hidden>
            <input type="hidden" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Bitte Namen eingeben' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Rolle" name="role" rules={[{ required: true, message: 'Bitte eine Rolle wählen' }]}>
              <Select options={rolesList} />
            </Form.Item>
            <Form.Item label="Status" name="status" rules={[{ required: true, message: 'Bitte einen Status wählen' }]}>
              <Radio.Group>
                {statusList.map((s) => (
                  <Radio.Button key={s.value} value={s.value}>
                    {s.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item label="Abschnitt" name="abschnitt">
              <Input />
            </Form.Item>
            <Form.Item label="Fahrzeug" name="fahrzeug">
              <Input placeholder="z.B. RTW 1" />
            </Form.Item>
            <Form.Item label="Funkkanal" name="funkkanal">
              <Input placeholder="z.B. Kanal 1" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item label="Telefon" name="phone">
              <Input placeholder="z.B. 0151-XXXXXXX" />
            </Form.Item>
            <Form.Item label="Ankunft" name="ankunft">
              <Input placeholder="z.B. 08:30" />
            </Form.Item>
          </div>
        </Form>
      );
    } else {
      // 👇 Nur Details anzeigen
      return (
        <div className="p-2 text-sm text-gray-600">
          <p className="mb-1">
            <strong>Ereignisse:</strong>{' '}
            {record.ereignisse?.length ? record.ereignisse.join(', ') : '– Keine besonderen Ereignisse'}
          </p>
        </div>
      );
    }
  };

  /**
   * 👉 Speichern (aus Inline-Form)
   */
  const handleSave = (values: Kraft) => {
    // Prüfen, ob neuer oder bestehender Datensatz
    if (!values.id) {
      // Fallback: Neuer Eintrag (wenn man das ermöglichen will)
      values.id = `K-${Math.floor(Math.random() * 10000)}`;
      setKraefte((prev) => [...prev, values]);
      message.success('Neue Kraft gespeichert ✅');
    } else {
      // Update
      setKraefte((prev) => prev.map((k) => (k.id === values.id ? values : k)));
      message.success('Änderungen gespeichert ✅');
    }
    setEditingId(null);
  };

  /**
   * 👉 Löschen
   */
  const handleDelete = (id: string) => {
    setKraefte((prev) => prev.filter((k) => k.id !== id));
    message.info(`Kraft ${id} entfernt 🚮`);
  };

  /**
   * 👉 Beispiel einer Massenaktion
   */
  const handleMassAction = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Keine Kräfte ausgewählt ❗');
      return;
    }

    // Hier könntest du z.B. alle ausgewählten Kräfte auf "verfügbar" setzen
    // oder komplett löschen o. Ä.
    const updated = kraefte.map((k) =>
      selectedRowKeys.includes(k.id)
        ? { ...k, status: 'verfügbar' } // oder was auch immer
        : k,
    );
    setKraefte(updated as Kraft[]);
    message.success(`${selectedRowKeys.length} Kräfte mit Massenaktion aktualisiert ✅`);

    // Checkbox-Selektion zurücksetzen
    setSelectedRowKeys([]);
  };

  return (
    <div className="p-4">
      <Card className="shadow-md max-w-6xl mx-auto">
        {/* Header-Bereich: Suche + Massenaktionen */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-2">
          <h2 className="text-xl font-semibold mb-0">Kräfteübersicht</h2>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Suche (Name, Rolle, Status, Abschnitt...)"
              prefix={<PiMagnifyingGlass />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 250 }}
            />
            <Button onClick={handleMassAction}>Massenaktion</Button>
          </div>
        </div>

        {/* Beispielhafte Übersichtszahlen */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="col-span-1 text-center shadow-sm">
            <span className="block text-gray-500 text-sm">Gesamt</span>
            <span className="text-2xl font-bold">{kraefte.length}</span>
          </Card>
          <Card className="col-span-1 text-center shadow-sm">
            <span className="block text-gray-500 text-sm">Eingesetzt</span>
            <span className="text-2xl font-bold">{kraefte.filter((k) => k.status === 'eingesetzt').length}</span>
          </Card>
          <Card className="col-span-1 text-center shadow-sm">
            <span className="block text-gray-500 text-sm">Verfügbar</span>
            <span className="text-2xl font-bold">{kraefte.filter((k) => k.status === 'verfügbar').length}</span>
          </Card>
        </div>

        {/* Tabelle mit Checkbox-Selektion und Zeilen-Erweiterung */}
        <Table<Kraft>
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          rowSelection={rowSelection}
          expandable={{
            expandedRowRender,
            rowExpandable: () => true,
          }}
        />
      </Card>
    </div>
  );
};

export default KraefteUebersicht;
