import { Button, Card, Form, Input, message, Radio, Select, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { TableRowSelection } from 'antd/es/table/interface';
import React, { useState } from 'react';
import { PiMagnifyingGlass } from 'react-icons/pi';

/**
 * TypeScript-Interfaces
 */
type VehicleStatus = 'Einsatzbereit' | 'Unterwegs' | 'Außer Dienst' | 'Werkstatt';
type VehicleType = 'RTW' | 'KTW' | 'MTF' | 'NEF' | 'ELW' | 'GW-San' | 'Sonstiges';

interface Vehicle {
  id: string;
  callsign: string; // z.B. "Rotkreuz Musterstadt 41/83-1"
  type: VehicleType; // z.B. "RTW"
  licensePlate: string; // z.B. "ABC-DRK-123"
  status: VehicleStatus; // "Einsatzbereit" / "Unterwegs" / ...
  location: string; // z.B. "Wache 1"
  driver?: string; // Fahrer
  crew?: string; // z.B. "2/1"
  fms?: number; // FMS-Status: 1=Frei auf Funk, 2=Frei auf Wache, 3=auf Anfahrt, 4=an E-Stelle
}

// Mögliche Auswahlwerte
const statusOptions: VehicleStatus[] = ['Einsatzbereit', 'Unterwegs', 'Außer Dienst', 'Werkstatt'];

const typeOptions: VehicleType[] = ['RTW', 'KTW', 'MTF', 'NEF', 'ELW', 'GW-San', 'Sonstiges'];

/**
 * MOCK-DATEN: Bitte später durch echte Datenquelle (API/DB) ersetzen.
 */
const initialVehicles: Vehicle[] = [
  {
    id: 'V-001',
    callsign: 'Rotkreuz Musterstadt 41/83-1',
    type: 'RTW',
    licensePlate: 'ABC-DRK-123',
    status: 'Einsatzbereit',
    location: 'Wache 1',
    driver: 'Max Mustermann',
    crew: '2/1',
    fms: 1,
  },
  {
    id: 'V-002',
    callsign: 'Rotkreuz Musterstadt 41/19-1',
    type: 'MTF',
    licensePlate: 'ABC-DRK-456',
    status: 'Unterwegs',
    location: 'Rückfahrt Einsatzstelle',
    driver: 'Julia Beispiel',
    crew: '1/6',
    fms: 3,
  },
  {
    id: 'V-003',
    callsign: 'Rotkreuz Musterstadt 41/85-1',
    type: 'KTW',
    licensePlate: 'ABC-DRK-789',
    status: 'Außer Dienst',
    location: 'Werkstatt',
    driver: '',
    crew: '0/0',
    fms: 6,
  },
];

const FahrzeugeUebersicht: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Zur Massenverarbeitung: Key = vehicle.id
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // "Bearbeitungsmodus": Welche Fahrzeug-ID wird gerade bearbeitet?
  const [editingId, setEditingId] = useState<string | null>(null);

  // Inline-Form zur Bearbeitung
  const [form] = Form.useForm<Vehicle>();

  /**
   * 👉 Filter-Funktion: Suche nach callsign, licensePlate, driver, location, status
   */
  const filteredData: Vehicle[] = vehicles.filter((v) => {
    const term = searchTerm.toLowerCase();
    return (
      v.callsign.toLowerCase().includes(term) ||
      v.licensePlate.toLowerCase().includes(term) ||
      (v.driver && v.driver.toLowerCase().includes(term)) ||
      (v.location && v.location.toLowerCase().includes(term)) ||
      (v.status && v.status.toLowerCase().includes(term))
    );
  });

  /**
   * 👉 Checkbox-Auswahl (Massenverarbeitung)
   */
  const rowSelection: TableRowSelection<Vehicle> = {
    selectedRowKeys,
    onChange: (newSelectedKeys) => {
      setSelectedRowKeys(newSelectedKeys);
    },
  };

  /**
   * 👉 Spalten
   */
  const columns: ColumnsType<Vehicle> = [
    {
      title: 'Funkrufname',
      dataIndex: 'callsign',
      key: 'callsign',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Typ',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Kennzeichen',
      dataIndex: 'licensePlate',
      key: 'licensePlate',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      // Optional farbige Tags: hier nur Text
    },
    {
      title: 'Standort',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Fahrer',
      dataIndex: 'driver',
      key: 'driver',
      render: (driver: string | undefined) => driver || '–',
    },
    {
      title: 'Crew',
      dataIndex: 'crew',
      key: 'crew',
      render: (crew: string | undefined) => crew || '–',
    },
    {
      title: 'FMS',
      dataIndex: 'fms',
      key: 'fms',
      render: (fms: number | undefined) =>
        fms !== undefined ? (
          <Tooltip title={`FMS-Status ${fms} (1=Einsatzklar, 2=Fahrt, 3=E-Stelle...)`}>{fms}</Tooltip>
        ) : (
          '–'
        ),
    },
    {
      title: 'Aktion',
      key: 'aktion',
      render: (_, record) => (
        <div className="flex gap-2">
          {editingId === record.id ? (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                form.submit(); // Speichern triggern
              }}
            >
              Speichern
            </Button>
          ) : (
            <Button
              size="small"
              onClick={() => {
                // Inline-Form vorbereiten
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
   * 👉 Expanded Row: Zeigt entweder das Inline-Form (wenn "editingId" übereinstimmt)
   * oder zusätzliche Infos (falls erwünscht).
   */
  const expandedRowRender = (record: Vehicle) => {
    if (editingId === record.id) {
      // Inline-Bearbeitung
      return (
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="id" hidden>
            <input type="hidden" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Funkrufname"
              name="callsign"
              rules={[{ required: true, message: 'Bitte Funkrufname eingeben' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Fahrzeugtyp"
              name="type"
              rules={[{ required: true, message: 'Bitte Fahrzeugtyp wählen' }]}
            >
              <Select options={typeOptions.map((t) => ({ label: t, value: t }))} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Kennzeichen" name="licensePlate">
              <Input />
            </Form.Item>
            <Form.Item label="Status" name="status" rules={[{ required: true, message: 'Bitte Status auswählen' }]}>
              <Radio.Group>
                {statusOptions.map((opt) => (
                  <Radio.Button key={opt} value={opt}>
                    {opt}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Standort" name="location">
              <Input placeholder="z.B. Wache 1 / Bereitstellungsraum" />
            </Form.Item>
            <Form.Item label="Fahrer" name="driver">
              <Input placeholder="Wer fährt aktuell?" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Crew" name="crew">
              <Input placeholder="z.B. 2/1" />
            </Form.Item>
            <Form.Item label="FMS-Status" name="fms" tooltip="1=Einsatzklar, 2=Fahrt, 3=E-Stelle, 6=Werkstatt...">
              <Input type="number" min={1} max={9} />
            </Form.Item>
          </div>
        </Form>
      );
    } else {
      // Falls du weitere Details anzeigen willst, könntest du hier etwas ausgeben.
      // Default: kein weiterer Inhalt
      return null;
    }
  };

  /**
   * 👉 Speichern aus Inline-Form
   */
  const handleSave = (values: Vehicle) => {
    if (!values.id) {
      // Neuer Eintrag
      const newId = `V-${Math.floor(Math.random() * 10000)}`;
      const newVehicle = { ...values, id: newId };
      setVehicles((prev) => [...prev, newVehicle]);
      message.success('Fahrzeug hinzugefügt ✅');
    } else {
      // Update
      setVehicles((prev) => prev.map((v) => (v.id === values.id ? values : v)));
      message.success('Fahrzeug aktualisiert ✅');
    }
    setEditingId(null);
  };

  /**
   * 👉 Löschen
   */
  const handleDelete = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    message.info(`Fahrzeug ${id} entfernt 🚮`);
  };

  /**
   * 👉 Beispiel-Massenaktion (z.B. alle ausgewählten auf "Einsatzbereit" setzen)
   */
  const handleMassAction = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Keine Fahrzeuge ausgewählt ❗');
      return;
    }
    const updated = vehicles.map((v) =>
      selectedRowKeys.includes(v.id) ? { ...v, status: 'Einsatzbereit' as VehicleStatus } : v,
    );
    setVehicles(updated);
    message.success(`${selectedRowKeys.length} Fahrzeuge auf "Einsatzbereit" gesetzt ✅`);
    // Selektion zurücksetzen
    setSelectedRowKeys([]);
  };

  return (
    <div className="p-4">
      <Card className="shadow-sm max-w-6xl mx-auto">
        {/* Header: Suche + Massenaktion */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-4">
          <h2 className="text-xl font-semibold mb-0">Fahrzeugübersicht</h2>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Suche (Rufname, Kennzeichen, Fahrer...)"
              prefix={<PiMagnifyingGlass />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 240 }}
            />
            <Button onClick={handleMassAction}>Massenaktion</Button>
          </div>
        </div>

        {/* Tabelle: Checkboxen + expandierbare Zeilen */}
        <Table<Vehicle>
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          rowSelection={rowSelection}
          expandable={{
            expandedRowRender,
            rowExpandable: () => true,
          }}
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};

export default FahrzeugeUebersicht;
