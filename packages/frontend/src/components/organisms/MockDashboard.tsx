import {
    Card,
    List,
    Progress,
    Space,
    Statistic,
    Tag,
    Typography
} from "antd";

import {
    PiCheckSquareBold,
    PiClockClockwiseBold,
    PiCubeFocusBold,
    PiSpeakerHighBold,
    PiUsersBold,
    PiUsersThreeBold
} from "react-icons/pi";
import { Link } from "react-router";

/**
 * MOCK-DATEN: Bitte später durch echte Daten ersetzen!
 */
const mockData = {
    einsatzabschnitte: [
        { id: 'EA-001', name: 'Behandlungsplatz', unterabschnitte: 2, kräfte: 12 },
        { id: 'EA-002', name: 'Bereitstellungsraum', unterabschnitte: 1, kräfte: 8 },
    ],
    checklisten: [
        { id: 'C-101', name: 'Unwetter', erledigt: 3, gesamt: 10 },
        { id: 'C-102', name: 'MANV', erledigt: 2, gesamt: 8 },
    ],
    wecker: [
        { id: 'W-001', text: 'Lagebesprechung', in: '15 Min' },
        { id: 'W-002', text: 'Schichtwechsel', in: '1 Std' },
    ],
    stärke: {
        el: 2,    // Einsatzleiter
        gf: 4,    // Gruppenführer
        h: 24,    // Helfer
        gesamt: 30
    },
    betroffene: {
        gesamt: 12,
        versorgt: 8,
        transport: 3,
        abgeschlossen: 1
    },
    funkkanaele: [
        { kanal: 'Kanal 1', status: 'in Benutzung' },
        { kanal: 'Kanal 2', status: 'angefragt' },
        { kanal: 'Kanal 3', status: 'frei' },
    ],
};

const { Text } = Typography;

const DashboardContent = () => {
    return (
        <div className="p-4 min-h-screen bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Kachel 1: Einsatzabschnitte */}
                <div className="grid gap-4">
                    <Card
                        title={
                            <Space>
                                <PiCubeFocusBold />
                                <span>Einsatzabschnitte</span>
                            </Space>
                        }
                        extra={<Link to="/app/einsatzabschnitte">Details</Link>}
                        className="shadow-sm"
                    >
                        <List
                            dataSource={mockData.einsatzabschnitte}
                            renderItem={(abschnitt) => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={abschnitt.name}
                                        description={
                                            <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                                                Unterabschnitte: {abschnitt.unterabschnitte}, Kräfte: {abschnitt.kräfte}
                                            </Text>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </div>

                {/* Kachel 2a: Checklisten */}
                <div className="grid gap-4">
                    <Card
                        title={
                            <Space>
                                <PiCheckSquareBold />
                                <span>Checklisten</span>
                            </Space>
                        }
                        className="mb-4 shadow-sm"
                    >
                        {mockData.checklisten.map((cl) => {
                            const percent = Math.round((cl.erledigt / cl.gesamt) * 100);
                            return (
                                <div key={cl.id} style={{ marginBottom: '1rem' }}>
                                    <Text strong>{cl.name}</Text>
                                    <Progress
                                        percent={percent}
                                        size="small"
                                        status="active"
                                        strokeColor={percent === 100 ? "#52c41a" : undefined}
                                    />
                                </div>
                            );
                        })}
                    </Card>
                </div>

                {/* Kachel 3: Stärke */}
                <div className="grid gap-4">
                    <Card
                        title={
                            <Space>
                                <PiUsersBold />
                                <span>Stärke</span>
                            </Space>
                        }
                        className="shadow-sm"
                    >
                        <div className="flex justify-around h-full items-center">
                            <p className="text-2xl">{mockData.stärke.el} / {mockData.stärke.gf} / {mockData.stärke.h} / {mockData.stärke.gesamt}</p>
                        </div>
                    </Card>
                </div>

                <div className="grid gap-4">
                    {/* Kachel 2b: Wecker */}
                    <Card
                        title={
                            <Space>
                                <PiClockClockwiseBold />
                                <span>Wecker & Erinnerungen</span>
                            </Space>
                        }
                        className="shadow-sm"
                    >
                        <List
                            dataSource={mockData.wecker}
                            renderItem={(weck) => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={weck.text}
                                        description={
                                            <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                                                Fällig in {weck.in}
                                            </Text>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </div>

                {/* Kachel 4: Betroffene */}
                <div className="grid gap-4">
                    <Card
                        title={
                            <Space>
                                <PiUsersThreeBold />
                                <span>Betroffene</span>
                            </Space>
                        }
                        extra={<Link to="/app/betroffene">Details</Link>}
                        className="shadow-sm"
                    >
                        <List style={{ marginBottom: 0 }}>
                            <List.Item>
                                <List.Item.Meta
                                    title="Gesamt registriert"
                                    description={
                                        <Statistic value={mockData.betroffene.gesamt} precision={0} />
                                    }
                                />
                            </List.Item>
                            <List.Item>
                                <List.Item.Meta
                                    title="Erstversorgung"
                                    description={
                                        <Statistic value={mockData.betroffene.versorgt} precision={0} />
                                    }
                                />
                            </List.Item>
                            <List.Item>
                                <List.Item.Meta
                                    title="Transport angefordert"
                                    description={
                                        <Statistic value={mockData.betroffene.transport} precision={0} />
                                    }
                                />
                            </List.Item>
                            <List.Item>
                                <List.Item.Meta
                                    title="Abgeschlossen"
                                    description={
                                        <Statistic value={mockData.betroffene.abgeschlossen} precision={0} />
                                    }
                                />
                            </List.Item>
                        </List>
                    </Card>
                </div>

                {/* Kachel 5: Funkkanäle */}
                <div className="grid gap-4">
                    <Card
                        title={
                            <Space>
                                <PiSpeakerHighBold />
                                <span>Funkkanäle</span>
                            </Space>
                        }
                        className="shadow-sm"
                    >
                        <List
                            dataSource={mockData.funkkanaele}
                            renderItem={(kanal) => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={kanal.kanal}
                                        description={
                                            <Tag
                                                color={
                                                    kanal.status === 'in Benutzung'
                                                        ? 'blue'
                                                        : kanal.status === 'angefragt'
                                                            ? 'orange'
                                                            : 'green'
                                                }
                                            >
                                                {kanal.status}
                                            </Tag>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </div>
            </div>
        </div >
    );
};

export default DashboardContent;