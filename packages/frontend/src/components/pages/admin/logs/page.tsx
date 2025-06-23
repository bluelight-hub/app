import React, { useState } from 'react';
import { Table, Tag, Input, Select, DatePicker, Button, Card } from 'antd';
import { PiMagnifyingGlass, PiArrowClockwise, PiDownloadSimple, PiFunnel } from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'debug';
    category: string;
    user: string;
    action: string;
    details: string;
    ip: string;
}

const LogsPage: React.FC = () => {
    const [searchText, setSearchText] = useState('');
    const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
    const [_dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

    // Mock-Daten - werden später durch API ersetzt
    const [logs] = useState<LogEntry[]>([
        {
            id: '1',
            timestamp: '2025-01-17 14:32:15',
            level: 'info',
            category: 'auth',
            user: 'max.mustermann@example.com',
            action: 'Benutzer angemeldet',
            details: 'Erfolgreiche Anmeldung',
            ip: '192.168.1.100'
        },
        {
            id: '2',
            timestamp: '2025-01-17 14:30:45',
            level: 'warning',
            category: 'security',
            user: 'system',
            action: 'Fehlgeschlagene Anmeldung',
            details: '3 fehlgeschlagene Anmeldeversuche für benutzer@example.com',
            ip: '192.168.1.105'
        },
        {
            id: '3',
            timestamp: '2025-01-17 14:28:10',
            level: 'error',
            category: 'system',
            user: 'system',
            action: 'Datenbankfehler',
            details: 'Verbindung zur Datenbank verloren und wiederhergestellt',
            ip: 'localhost'
        },
        {
            id: '4',
            timestamp: '2025-01-17 14:25:30',
            level: 'info',
            category: 'admin',
            user: 'anna.schmidt@example.com',
            action: 'Benutzer erstellt',
            details: 'Neuer Benutzer: tom.weber@example.com',
            ip: '192.168.1.102'
        },
        {
            id: '5',
            timestamp: '2025-01-17 14:20:00',
            level: 'debug',
            category: 'api',
            user: 'api-client',
            action: 'API-Aufruf',
            details: 'GET /api/v1/einsaetze - 200 OK (125ms)',
            ip: '10.0.0.50'
        }
    ]);

    const levelColors = {
        info: 'blue',
        warning: 'orange',
        error: 'red',
        debug: 'default'
    };

    const categoryLabels = {
        auth: 'Authentifizierung',
        security: 'Sicherheit',
        system: 'System',
        admin: 'Administration',
        api: 'API',
        user: 'Benutzer',
        data: 'Daten'
    };

    const handleExport = () => {
        // TODO: Export-Funktionalität implementieren
        console.log('Exporting logs...');
    };

    const columns: ColumnsType<LogEntry> = [
        {
            title: 'Zeitstempel',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 180,
            sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Level',
            dataIndex: 'level',
            key: 'level',
            width: 100,
            render: (level: string) => (
                <Tag color={levelColors[level as keyof typeof levelColors]}>
                    {level.toUpperCase()}
                </Tag>
            ),
            filters: Object.keys(levelColors).map(level => ({
                text: level.toUpperCase(),
                value: level
            })),
            onFilter: (value, record) => record.level === value,
            filteredValue: levelFilter ? [levelFilter] : null,
        },
        {
            title: 'Kategorie',
            dataIndex: 'category',
            key: 'category',
            width: 150,
            render: (category: string) => categoryLabels[category as keyof typeof categoryLabels] || category,
            filters: Object.entries(categoryLabels).map(([value, text]) => ({ text, value })),
            onFilter: (value, record) => record.category === value,
            filteredValue: categoryFilter ? [categoryFilter] : null,
        },
        {
            title: 'Benutzer',
            dataIndex: 'user',
            key: 'user',
            width: 200,
            filteredValue: searchText ? ['filtered'] : null,
            onFilter: (_, record) => 
                record.user.toLowerCase().includes(searchText.toLowerCase()) ||
                record.action.toLowerCase().includes(searchText.toLowerCase()) ||
                record.details.toLowerCase().includes(searchText.toLowerCase()),
        },
        {
            title: 'Aktion',
            dataIndex: 'action',
            key: 'action',
        },
        {
            title: 'Details',
            dataIndex: 'details',
            key: 'details',
            ellipsis: true,
        },
        {
            title: 'IP-Adresse',
            dataIndex: 'ip',
            key: 'ip',
            width: 130,
        },
    ];

    const logStats = {
        total: logs.length,
        errors: logs.filter(log => log.level === 'error').length,
        warnings: logs.filter(log => log.level === 'warning').length,
        today: logs.filter(log => log.timestamp.startsWith('2025-01-17')).length
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">System-Logs</h1>
                <p className="text-gray-600 mt-2">
                    Überwachen Sie Systemaktivitäten und Ereignisse
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card size="small">
                    <div className="text-2xl font-bold">{logStats.total}</div>
                    <div className="text-gray-500">Einträge gesamt</div>
                </Card>
                <Card size="small">
                    <div className="text-2xl font-bold text-red-600">{logStats.errors}</div>
                    <div className="text-gray-500">Fehler</div>
                </Card>
                <Card size="small">
                    <div className="text-2xl font-bold text-orange-600">{logStats.warnings}</div>
                    <div className="text-gray-500">Warnungen</div>
                </Card>
                <Card size="small">
                    <div className="text-2xl font-bold text-blue-600">{logStats.today}</div>
                    <div className="text-gray-500">Heute</div>
                </Card>
            </div>

            <div className="mb-4 space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                    <Input
                        placeholder="Suche in Logs..."
                        prefix={<PiMagnifyingGlass />}
                        style={{ width: 300 }}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                    <Select
                        placeholder="Level filtern"
                        style={{ width: 150 }}
                        allowClear
                        value={levelFilter}
                        onChange={setLevelFilter}
                    >
                        <Option value="info">INFO</Option>
                        <Option value="warning">WARNING</Option>
                        <Option value="error">ERROR</Option>
                        <Option value="debug">DEBUG</Option>
                    </Select>
                    <Select
                        placeholder="Kategorie filtern"
                        style={{ width: 180 }}
                        allowClear
                        value={categoryFilter}
                        onChange={setCategoryFilter}
                    >
                        {Object.entries(categoryLabels).map(([value, label]) => (
                            <Option key={value} value={value}>{label}</Option>
                        ))}
                    </Select>
                    <RangePicker
                        placeholder={['Von', 'Bis']}
                        onChange={(dates) => setDateRange(dates)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button icon={<PiArrowClockwise />}>
                        Aktualisieren
                    </Button>
                    <Button icon={<PiDownloadSimple />} onClick={handleExport}>
                        Exportieren
                    </Button>
                    <Button 
                        icon={<PiFunnel />}
                        onClick={() => {
                            setSearchText('');
                            setLevelFilter(undefined);
                            setCategoryFilter(undefined);
                            setDateRange(null);
                        }}
                    >
                        Filter zurücksetzen
                    </Button>
                </div>
            </div>

            <Table
                columns={columns}
                dataSource={logs}
                rowKey="id"
                size="small"
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `Gesamt ${total} Einträge`,
                }}
                scroll={{ x: 1200 }}
            />
        </div>
    );
};

export default LogsPage;
