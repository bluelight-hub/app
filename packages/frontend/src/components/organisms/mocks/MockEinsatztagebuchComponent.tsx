import { formatNatoDateTime, natoDateTime } from '@/utils/date';
import {
  Input as AntInput,
  Button,
  Drawer,
  Empty,
  Input,
  InputRef,
  Space,
  Table,
  TableColumnsType,
  TableColumnType,
  Tooltip,
} from 'antd';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PiAmbulance,
  PiEmpty,
  PiMagnifyingGlass,
  PiPencil,
  PiPictureInPicture,
  PiPlus,
  PiSwap,
  PiTextStrikethrough,
  PiUser,
} from 'react-icons/pi';

// Mocks für fehlende Module

// Mock für JournalEntryDto
interface JournalEntryDto {
  id: string;
  nummer: number;
  type: 'USER' | 'LAGEMELDUNG' | 'RESSOURCEN' | 'BETROFFENE_PATIENTEN' | 'KORREKTUR';
  timestamp: Date;
  sender: string;
  receiver: string;
  content: string;
  archived: boolean;
}

// Mock für InputWrapper
const InputWrapper: React.FC<{
  label: string;
  name: string;
  rules?: { required: boolean; message: string }[];
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="mb-4">
    <div className="block mb-1 font-medium text-gray-700">{label}</div>
    {children}
  </div>
);

// Mock für EinsatztagebuchFormWrapperComponent
const EinsatztagebuchFormWrapperComponent: React.FC<{
  inputVisible: boolean;
  closeForm: () => void;
}> = ({ inputVisible }) => {
  if (!inputVisible) return null;
  return (
    <div className="mt-4 p-4 border border-gray-200 rounded-md shadow-sm">
      <h3 className="text-lg font-medium text-gray-900">Neuer Einsatztagebucheintrag</h3>
      <p className="text-sm text-gray-500">Bitte füllen Sie alle Felder aus</p>
    </div>
  );
};

// Mock für EinsatztagebuchHeaderComponent
const EinsatztagebuchHeaderComponent: React.FC<{
  inputVisible: boolean;
  setInputVisible: (visible: boolean) => void;
}> = ({ inputVisible, setInputVisible }) => (
  <div className="flex items-center justify-between pb-5 border-b border-gray-200">
    <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">Einsatztagebuch</h1>
    <div className="mt-3 sm:mt-0 sm:ml-4">
      <Button type="primary" onClick={() => setInputVisible(!inputVisible)} icon={<PiPlus />}>
        Neuer Eintrag
      </Button>
    </div>
  </div>
);

// Mock für FormLayout
const FormLayout = <T extends object>({
  form,
  buttons,
  children,
}: {
  form: {
    initialValues?: Partial<T>;
    onFinish: (values: T) => Promise<void> | void;
  };
  buttons: {
    submit: {
      children: React.ReactNode;
      icon?: React.ReactNode;
    };
  };
  children: React.ReactNode;
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.onFinish(form.initialValues as T);
  };

  return (
    <form onSubmit={handleSubmit}>
      {children}
      <div className="mt-5">
        <Button type="primary" htmlType="submit" icon={buttons.submit.icon}>
          {buttons.submit.children}
        </Button>
      </div>
    </form>
  );
};

// Mock für useFahrzeuge
const useFahrzeuge = () => {
  return {
    fahrzeuge: {
      data: {
        data: {
          fahrzeugeImEinsatz: [
            { optaFunktion: 'RTW', fullOpta: 'RTW-1', id: '1' },
            { optaFunktion: 'RTW', fullOpta: 'RTW-2', id: '2' },
            { optaFunktion: 'NEF', fullOpta: 'NEF-1', id: '3' },
            { optaFunktion: 'KTW', fullOpta: 'KTW-1', id: '4' },
          ],
        },
      },
    },
  };
};

// Mock-Interface für Fahrzeug-Objekte
interface FahrzeugMock {
  optaFunktion: string;
  fullOpta: string;
  id: string;
}

// Mock für useFahrzeugeItems

// Mock für useEinsatztagebuch
const useEinsatztagebuch = () => {
  const [einsatztagebuchData, setEinsatztagebuchData] = useState<{
    data: { items: JournalEntryDto[] };
  }>({
    data: {
      items: [
        {
          id: '1',
          nummer: 1,
          type: 'USER',
          timestamp: new Date(),
          sender: 'ELRD',
          receiver: 'RTW-1',
          content: 'Fahren Sie zum Einsatzort',
          archived: false,
        },
        {
          id: '2',
          nummer: 2,
          type: 'LAGEMELDUNG',
          timestamp: new Date(),
          sender: 'RTW-1',
          receiver: 'ELRD',
          content: 'Am Einsatzort eingetroffen',
          archived: false,
        },
        {
          id: '3',
          nummer: 3,
          type: 'RESSOURCEN',
          timestamp: new Date(),
          sender: 'ELRD',
          receiver: 'NEF-1',
          content: 'Nachforderung eines NEF',
          archived: false,
        },
      ],
    },
  });

  const archiveEinsatztagebuchEintrag = {
    mutate: ({ nummer }: { nummer: number }) => {
      setEinsatztagebuchData((prev) => ({
        data: {
          items: prev.data.items.map((item) => (item.nummer === nummer ? { ...item, archived: true } : item)),
        },
      }));
    },
    mutateAsync: ({ nummer }: { nummer: number }) =>
      new Promise<void>((resolve) => {
        setEinsatztagebuchData((prev) => ({
          data: {
            items: prev.data.items.map((item) => (item.nummer === nummer ? { ...item, archived: true } : item)),
          },
        }));
        resolve();
      }),
  };

  const createEinsatztagebuchEintrag = {
    mutate: (newEntry: Partial<JournalEntryDto>) => {
      setEinsatztagebuchData((prev) => ({
        data: {
          items: [
            ...prev.data.items,
            {
              ...newEntry,
              id: Math.random().toString(),
              nummer: prev.data.items.length + 1,
              timestamp: new Date(),
              archived: false,
            } as JournalEntryDto,
          ],
        },
      }));
    },
    mutateAsync: (newEntry: Partial<JournalEntryDto>) =>
      new Promise<void>((resolve) => {
        setEinsatztagebuchData((prev) => ({
          data: {
            items: [
              ...prev.data.items,
              {
                ...newEntry,
                id: Math.random().toString(),
                nummer: prev.data.items.length + 1,
                timestamp: new Date(),
                archived: false,
              } as JournalEntryDto,
            ],
          },
        }));
        resolve();
      }),
  };

  return {
    einsatztagebuch: einsatztagebuchData,
    archiveEinsatztagebuchEintrag,
    createEinsatztagebuchEintrag,
  };
};

// Beispiel: Simplified Mobile-Check
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

export function MockEinsatztagebuchComponent() {
  const { einsatztagebuch, archiveEinsatztagebuchEintrag, createEinsatztagebuchEintrag } = useEinsatztagebuch();

  // States
  const [inputVisible, setInputVisible] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingEintrag, setEditingEintrag] = useState<JournalEntryDto | null>(null);

  const { fahrzeuge } = useFahrzeuge();
  // Wir nutzen _ Präfix für ungenutzte Variablen zur Vermeidung von Linter-Fehlern

  // Schließen des Drawers
  const onDrawerClose = useCallback(() => {
    setEditingEintrag(null);
    setIsOpen(false);
  }, []);

  // Suche in Tabellenspalte
  const searchInput = useRef<InputRef>(null);

  const getColumnSearchProps = (dataIndex: keyof JournalEntryDto): TableColumnType<JournalEntryDto> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <AntInput
          ref={searchInput}
          placeholder="Inhalt suchen"
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<PiMagnifyingGlass />}
            size="small"
            style={{ width: 90 }}
          >
            Filtern
          </Button>
          <Button type="link" size="small" onClick={close}>
            Abbrechen
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => <PiMagnifyingGlass style={{ color: filtered ? '#1677ff' : undefined }} />,
    onFilter: (value, record) =>
      record[dataIndex]
        ?.toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()) ?? false,
  });

  // Bearbeiten
  const modifyEntry = useCallback((entry: JournalEntryDto) => {
    setIsOpen(true);
    setEditingEintrag(entry);
  }, []);

  // Tabellenspalten
  const columns = useMemo<TableColumnsType<JournalEntryDto>>(() => {
    // Beispiel: rufnahmeFilter
    const fahrzeugTypen = (fahrzeuge.data?.data.fahrzeugeImEinsatz ?? []).reduce(
      (acc: Record<string, { text: string; value: string }[]>, e: FahrzeugMock) => {
        if (!e.optaFunktion) return acc;
        if (!acc[e.optaFunktion]) {
          acc[e.optaFunktion] = [];
        }
        acc[e.optaFunktion].push({ text: e.fullOpta, value: e.fullOpta });
        return acc;
      },
      {} as Record<string, { text: string; value: string }[]>,
    );
    const rufnahmeFilter = Object.entries(fahrzeugTypen).map(([key, value]) => ({
      text: key,
      value: key,
      children: value,
    }));

    return [
      {
        title: '#',
        dataIndex: 'nummer',
        key: 'nummer',
        width: 80,
        sorter: (a, b) => a.nummer - b.nummer,
      },
      {
        title: 'Typ',
        dataIndex: 'type',
        key: 'type',
        width: 60,
        filters: [
          { text: 'Meldung', value: 'USER' },
          { text: 'Lagemeldung', value: 'LAGEMELDUNG' },
          { text: 'Ressourcen', value: 'RESSOURCEN' },
          { text: 'Betroffene | Patienten', value: 'BETROFFENE_PATIENTEN' },
          { text: 'Korrektur', value: 'KORREKTUR' },
        ],
        render: (value) => {
          switch (value) {
            case 'USER':
              return (
                <Tooltip title="Meldung">
                  <PiUser size={24} className="text-primary-500" />
                </Tooltip>
              );
            case 'LAGEMELDUNG':
              return (
                <Tooltip title="Lagemeldung">
                  <PiPictureInPicture size={24} className="text-red-500" />
                </Tooltip>
              );
            case 'RESSOURCEN':
              return (
                <Tooltip title="Ressourcen">
                  <PiAmbulance size={24} className="text-primary-500" />
                </Tooltip>
              );
            case 'BETROFFENE_PATIENTEN':
              return (
                <Tooltip title="Betroffene">
                  <PiPlus size={24} className="text-primary-500" />
                </Tooltip>
              );
            case 'KORREKTUR':
              return (
                <Tooltip title="Korrektur">
                  <PiPencil size={24} className="text-orange-500" />
                </Tooltip>
              );
            default:
              return value;
          }
        },
        onFilter: (value, record) => record.type === value,
      },
      {
        title: 'Zeitpunkt',
        key: 'timestamp',
        width: 200,
        // ...
        render: (_, record) => {
          const timestampAsNato = formatNatoDateTime(record.timestamp);
          return <span>{timestampAsNato}</span>;
        },
        sorter: (a, b) => dayjs(a.timestamp).diff(dayjs(b.timestamp)),
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Absender',
        dataIndex: 'sender',
        key: 'sender',
        width: 120,
        // ...
        filters: rufnahmeFilter,
        onFilter: (value, record) => record.sender === value,
      },
      {
        title: 'Empfänger',
        dataIndex: 'receiver',
        key: 'receiver',
        width: 120,
        // ...
        filters: rufnahmeFilter,
        onFilter: (value, record) => record.receiver === value,
      },
      {
        title: 'Inhalt',
        dataIndex: 'content',
        key: 'content',
        width: 500,
        // ...
        ...getColumnSearchProps('content'),
      },
      {
        render: (_, record) => (
          <div className="flex gap-2">
            {!record.archived && (
              <>
                <Tooltip title="Eintrag überschreiben">
                  <Button
                    onClick={() => !isOpen && modifyEntry(record)}
                    type="dashed"
                    shape="circle"
                    icon={<PiSwap />}
                  />
                </Tooltip>
                <Tooltip title="Eintrag streichen">
                  <Button
                    onClick={() => archiveEinsatztagebuchEintrag.mutate({ nummer: record.nummer })}
                    type="default"
                    danger
                    shape="circle"
                    icon={<PiTextStrikethrough />}
                  />
                </Tooltip>
              </>
            )}
          </div>
        ),
        dataIndex: 'id',
        width: 150,
      },
    ];
  }, [fahrzeuge, archiveEinsatztagebuchEintrag, isOpen, modifyEntry]);

  // MOBILE-FALL -> Einfache Card-Ansicht
  if (isMobile) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <EinsatztagebuchHeaderComponent inputVisible={inputVisible} setInputVisible={setInputVisible} />
        <EinsatztagebuchFormWrapperComponent inputVisible={inputVisible} closeForm={() => setInputVisible(false)} />
        <div className="mt-8">
          {!einsatztagebuch?.data?.items?.length ? (
            <Empty image={<PiEmpty size={48} />} description="Keine Einträge verfügbar" />
          ) : (
            <div className="flex flex-col gap-4">
              {einsatztagebuch.data.items.map((item) => {
                const timestampAsNato = formatNatoDateTime(item.timestamp);
                return (
                  <div key={item.id} className="p-3 border rounded shadow-sm">
                    <div className="font-semibold flex justify-between mb-1 text-primary-600 dark:text-primary-400">
                      <span>
                        #{item.nummer} | {item.type}
                      </span>
                      <span>{timestampAsNato}</span>
                    </div>
                    <p className="text-sm">{item.content}</p>
                    <div className="text-xs mt-1 text-gray-500 flex items-center justify-between">
                      <span>Absender: {item.sender}</span>
                      <span>Empfänger: {item.receiver}</span>
                    </div>
                    {!item.archived && (
                      <div className="mt-2 flex gap-2 justify-end">
                        <Tooltip title="Eintrag überschreiben">
                          <Button size="small" onClick={() => modifyEntry(item)} icon={<PiSwap />} />
                        </Tooltip>
                        <Tooltip title="Eintrag streichen">
                          <Button
                            size="small"
                            onClick={() => archiveEinsatztagebuchEintrag.mutate({ nummer: item.nummer })}
                            danger
                            icon={<PiTextStrikethrough />}
                          />
                        </Tooltip>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <Drawer
          open={isOpen}
          onClose={onDrawerClose}
          title={editingEintrag && `Eintrag ${editingEintrag.nummer} bearbeiten`}
        >
          {editingEintrag && (
            <FormLayout<JournalEntryDto>
              form={{
                initialValues: {
                  ...editingEintrag,
                },
                onFinish: async (data) => {
                  await createEinsatztagebuchEintrag.mutateAsync({
                    ...data,
                    type: 'KORREKTUR',
                    timestamp: editingEintrag.timestamp,
                  });
                  await archiveEinsatztagebuchEintrag.mutateAsync({ nummer: editingEintrag?.nummer });
                  setIsOpen(false);
                  setEditingEintrag(null);
                },
              }}
              buttons={{
                submit: {
                  children: 'Eintrag ändern',
                  icon: <PiSwap />,
                },
              }}
            >
              <InputWrapper
                label="Absender"
                name="sender"
                rules={[{ required: true, message: 'Es sollte ein Absender angegeben werden' }]}
              >
                <Input />
              </InputWrapper>
              <InputWrapper
                label="Empfänger"
                name="receiver"
                rules={[{ required: true, message: 'Es sollte ein Empfänger angegeben werden' }]}
              >
                <Input />
              </InputWrapper>
              <InputWrapper label="Notiz" name="content">
                <Input.TextArea rows={5} />
              </InputWrapper>
            </FormLayout>
          )}
        </Drawer>
      </div>
    );
  }

  // DESKTOP-FALL -> Tabelle
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <EinsatztagebuchHeaderComponent inputVisible={inputVisible} setInputVisible={setInputVisible} />
      <EinsatztagebuchFormWrapperComponent inputVisible={inputVisible} closeForm={() => setInputVisible(false)} />
      <div ref={parentRef} className="mt-8">
        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <div className="w-full py-2 align-middle sm:px-6 lg:px-8">
            <Table
              className="mb"
              dataSource={einsatztagebuch?.data.items}
              loading={!einsatztagebuch}
              columns={columns}
              scroll={{ x: 'max-content', y: 1000 }}
              pagination={false}
              locale={{
                emptyText: <Empty image={<PiEmpty size={48} />} description="Keine Einträge verfügbar" />,
              }}
            />
          </div>
        </div>
      </div>

      <Drawer
        open={isOpen}
        onClose={onDrawerClose}
        title={
          editingEintrag &&
          `Eintrag ${editingEintrag.nummer} von 
          ${format(editingEintrag.timestamp, natoDateTime)} bearbeiten`
        }
      >
        {editingEintrag && (
          <FormLayout<JournalEntryDto>
            form={{
              initialValues: { ...editingEintrag },
              onFinish: async (data) => {
                await createEinsatztagebuchEintrag.mutateAsync({
                  ...data,
                  type: 'KORREKTUR',
                  timestamp: editingEintrag.timestamp,
                });
                await archiveEinsatztagebuchEintrag.mutateAsync({ nummer: editingEintrag?.nummer });
                setIsOpen(false);
                setEditingEintrag(null);
              },
            }}
            buttons={{
              submit: {
                children: 'Eintrag ändern',
                icon: <PiSwap />,
              },
            }}
          >
            <InputWrapper
              label="Absender"
              name="sender"
              rules={[{ required: true, message: 'Es sollte ein Absender angegeben werden' }]}
            >
              <Input />
            </InputWrapper>
            <InputWrapper
              label="Empfänger"
              name="receiver"
              rules={[{ required: true, message: 'Es sollte ein Empfänger angegeben werden' }]}
            >
              <Input />
            </InputWrapper>
            <InputWrapper label="Notiz" name="content">
              <Input.TextArea rows={5} />
            </InputWrapper>
          </FormLayout>
        )}
      </Drawer>
    </div>
  );
}
