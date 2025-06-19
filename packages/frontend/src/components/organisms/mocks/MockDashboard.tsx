import { useEinsatztagebuch } from '@/hooks/etb/useEinsatztagebuch';
import { formatNatoDateTime } from '@/utils/date';
import { EtbEntryDto, EtbEntryDtoStatusEnum } from '@bluelight-hub/shared/client';
import { Badge, Card, Descriptions, Input, List, Progress, Space, Statistic, Tag, Typography } from 'antd';
import { useMemo } from 'react';

import {
  PiBookOpenTextBold,
  PiCheckSquareBold,
  PiClockClockwiseBold,
  PiCloudSunBold,
  PiCubeFocusBold,
  PiMapPinBold,
  PiNotePencilBold,
  PiRadioBold,
  PiSpeakerHighBold,
  PiUsersBold,
  PiUsersThreeBold,
} from 'react-icons/pi';
import { Link } from 'react-router';

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
    el: 2, // Einsatzleiter
    gf: 4, // Gruppenführer
    h: 24, // Helfer
    gesamt: 30,
  },
  betroffene: {
    gesamt: 12,
    versorgt: 8,
    transport: 3,
    abgeschlossen: 1,
  },
  funkkanaele: [
    { kanal: 'Kanal 1', status: 'in Benutzung' },
    { kanal: 'Kanal 2', status: 'angefragt' },
    { kanal: 'Kanal 3', status: 'frei' },
  ],
  // Neue Mock-Daten für zusätzliche Kacheln
  wetter: {
    aktuell: { temperatur: '22°C', beschreibung: 'Leicht bewölkt', wind: '10 km/h' },
    prognose: [
      { zeit: '10:00', temperatur: '24°C', beschreibung: 'Sonnig' },
      { zeit: '14:00', temperatur: '26°C', beschreibung: 'Wolkig' },
    ],
  },
  einsatzBasis: {
    stichwort: 'H2 WASSER',
    adresse: 'Hauptstraße 123, 12345 Musterstadt',
    meldung: 'Wasserschaden im Keller, ca. 30cm Wasserstand',
    gemeldetVon: 'Anwohner',
    beginn: '02.09.2023 08:00',
  },
  funknamen: [
    { rufname: 'Florian Musterstadt 11/1', kennung: '11/1', status: 'vor Ort' },
    { rufname: 'Florian Musterstadt 40/1', kennung: '40/1', status: 'vor Ort' },
    { rufname: 'Florian Musterstadt 1', kennung: 'ELW', status: 'angefordert' },
  ],
  notizen: 'Wichtige Kontakte:\n- Wasserwerk: 0123-456789\n- Bürgermeister: 9876-543210',
};

const { Text, Title } = Typography;
const { TextArea } = Input;

const DashboardContent = () => {
  const { einsatztagebuch } = useEinsatztagebuch();

  const etbItems = useMemo(() => {
    return einsatztagebuch.data.items
      .filter((eintrag: EtbEntryDto) => eintrag.status === EtbEntryDtoStatusEnum.Aktiv)
      .slice(0, 5);
  }, [einsatztagebuch.data.items]);

  return (
    <div className="p-4 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Einsatzbasisdaten */}
        <div className="grid gap-4 xl:col-span-2">
          <Card
            title={
              <Space>
                <PiMapPinBold />
                <span>Einsatzbasisdaten</span>
              </Space>
            }
            className="shadow-sm"
          >
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Stichwort">
                <Badge status="processing" text={mockData.einsatzBasis.stichwort} />
              </Descriptions.Item>
              <Descriptions.Item label="Adresse">{mockData.einsatzBasis.adresse}</Descriptions.Item>
              <Descriptions.Item label="Meldung">{mockData.einsatzBasis.meldung}</Descriptions.Item>
              <Descriptions.Item label="Gemeldet von">{mockData.einsatzBasis.gemeldetVon}</Descriptions.Item>
              <Descriptions.Item label="Einsatzbeginn">{mockData.einsatzBasis.beginn}</Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        {/* Wetter */}
        <div className="grid gap-4">
          <Card
            title={
              <Space>
                <PiCloudSunBold />
                <span>Wetter</span>
              </Space>
            }
            className="shadow-sm"
          >
            <div className="mb-3">
              <Title level={5}>Aktuell</Title>
              <p className="text-xl">
                {mockData.wetter.aktuell.temperatur} | {mockData.wetter.aktuell.beschreibung}
              </p>
              <Text type="secondary">Wind: {mockData.wetter.aktuell.wind}</Text>
            </div>
            <div>
              <Title level={5}>Prognose</Title>
              <List
                size="small"
                dataSource={mockData.wetter.prognose}
                renderItem={(item) => (
                  <List.Item>
                    <Text>
                      {item.zeit}: {item.temperatur}, {item.beschreibung}
                    </Text>
                  </List.Item>
                )}
              />
            </div>
          </Card>
        </div>

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
                    strokeColor={percent === 100 ? '#52c41a' : undefined}
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
              <p className="text-2xl">
                {mockData.stärke.el} / {mockData.stärke.gf} / {mockData.stärke.h} / {mockData.stärke.gesamt}
              </p>
            </div>
          </Card>
        </div>

        {/* ETB Schnelleintrag */}
        <div className="grid gap-4">
          <Card
            title={
              <Space>
                <PiNotePencilBold />
                <span>ETB-Schnelleintrag</span>
              </Space>
            }
            className="shadow-sm"
          >
            <TextArea
              placeholder="Neuen ETB-Eintrag verfassen..."
              autoSize={{ minRows: 2, maxRows: 3 }}
              className="mb-2"
            />
            <div className="text-right">
              <Tag color="blue" className="cursor-pointer mr-0">
                Eintrag speichern
              </Tag>
            </div>
          </Card>
        </div>

        {/* ETB letzte Einträge */}
        <div className="grid gap-4">
          <Card
            title={
              <Space>
                <PiBookOpenTextBold />
                <span>ETB - Letzte Einträge</span>
              </Space>
            }
            extra={<Link to="/app/etb">Alle anzeigen</Link>}
            className="shadow-sm"
          >
            <List
              dataSource={etbItems}
              renderItem={(eintrag: EtbEntryDto) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Badge color="blue" />
                        <span>{eintrag.beschreibung}</span>
                      </Space>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                        {formatNatoDateTime(eintrag.timestampEreignis)} | {eintrag.titel} |{' '}
                        <Tag bordered={false} color="blue">
                          {eintrag.kategorie}
                        </Tag>{' '}
                        | {eintrag.autorName}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
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
                  description={<Statistic value={mockData.betroffene.gesamt} precision={0} />}
                />
              </List.Item>
              <List.Item>
                <List.Item.Meta
                  title="Erstversorgung"
                  description={<Statistic value={mockData.betroffene.versorgt} precision={0} />}
                />
              </List.Item>
              <List.Item>
                <List.Item.Meta
                  title="Transport angefordert"
                  description={<Statistic value={mockData.betroffene.transport} precision={0} />}
                />
              </List.Item>
              <List.Item>
                <List.Item.Meta
                  title="Abgeschlossen"
                  description={<Statistic value={mockData.betroffene.abgeschlossen} precision={0} />}
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
                          kanal.status === 'in Benutzung' ? 'blue' : kanal.status === 'angefragt' ? 'orange' : 'green'
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

        {/* Relevante Funknamen */}
        <div className="grid gap-4">
          <Card
            title={
              <Space>
                <PiRadioBold />
                <span>Relevante Funknamen</span>
              </Space>
            }
            className="shadow-sm"
          >
            <List
              dataSource={mockData.funknamen}
              renderItem={(funk) => (
                <List.Item>
                  <List.Item.Meta
                    title={funk.rufname}
                    description={
                      <Tag
                        color={funk.status === 'vor Ort' ? 'green' : funk.status === 'angefordert' ? 'orange' : 'blue'}
                      >
                        {funk.status}
                      </Tag>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </div>

        {/* Notizen */}
        <div className="grid gap-4">
          <Card
            title={
              <Space>
                <PiNotePencilBold />
                <span>Notizen</span>
              </Space>
            }
            className="shadow-sm"
          >
            <TextArea
              defaultValue={mockData.notizen}
              autoSize={{ minRows: 4, maxRows: 8 }}
              placeholder="Wichtige Informationen notieren..."
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
