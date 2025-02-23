import { Button, Card, Form, Input, Modal, Select, Tree, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import React, { useState } from 'react';
import { PiPlus } from 'react-icons/pi';

/**
 * Datentypen
 */
interface EinsatzabschnittNode extends DataNode {
    key: string;            // Eindeutige ID
    title: string;          // Anzeigename des Abschnitts
    beschreibung?: string;  // Optional: Beschreibung / Bemerkungen
    personnel?: string[];   // IDs oder Namen zugewiesener Personen
    vehicles?: string[];    // IDs oder Namen zugewiesener Fahrzeuge
    children?: EinsatzabschnittNode[];
}

interface EinsatzabschnittFormValues {
    title: string;
    beschreibung?: string;
    personnel?: string[];
    vehicles?: string[];
    parentKey?: string;
}

/**
 * MOCK-Listen: Personal & Fahrzeuge
 * In der Realität würdest du diese vielleicht über APIs laden,
 * z.B. aus deiner Kräfteübersicht / Fahrzeugübersicht.
 */
const mockPersonalList: string[] = [
    'Max Mustermann',
    'Julia Beispiel',
    'Lukas Maier',
    'Anna Müller',
];

const mockVehicleList: string[] = [
    'RTW 1',
    'RTW 2',
    'NEF 1',
    'MTF 3',
    'KTW 4',
];

/**
 * Beispiel-Hierarchie:
 * - Abschnitt Nord
 *   - Unterabschnitt "Bergungsgruppe"
 * - Abschnitt Süd
 */
const initialAbschnitte: EinsatzabschnittNode[] = [
    {
        key: 'abs-1',
        title: 'Abschnitt Nord',
        beschreibung: 'Nördlicher Einsatzbereich',
        personnel: ['Max Mustermann'],
        vehicles: ['RTW 1'],
        children: [
            {
                key: 'abs-1-1',
                title: 'Bergungsgruppe',
                personnel: ['Julia Beispiel'],
                vehicles: ['MTF 3'],
            },
        ],
    },
    {
        key: 'abs-2',
        title: 'Abschnitt Süd',
        beschreibung: 'Südlicher Einsatzbereich',
        personnel: [],
        vehicles: ['NEF 1'],
    },
];

const Einsatzabschnitte: React.FC = () => {
    const [treeData, setTreeData] = useState<EinsatzabschnittNode[]>(initialAbschnitte);

    // Speichert den ausgewählten Abschnitt (für "Unterabschnitt anlegen" oder Bearbeiten).
    const [selectedNode, setSelectedNode] = useState<EinsatzabschnittNode | null>(null);

    // Modal-States
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Differenzieren: Neuer Abschnitt oder Bearbeitung eines bestehenden.
    const [editingNode, setEditingNode] = useState<EinsatzabschnittNode | null>(null);

    const [form] = Form.useForm();

    /**
     * Wenn im Tree ein Knoten selektiert wird
     */
    const handleSelect = (_selectedKeys: React.Key[], info: { node: EinsatzabschnittNode }) => {
        const node = info.node as EinsatzabschnittNode;
        setSelectedNode(node);
    };

    /**
     * Öffnet Modal, um einen neuen Abschnitt zu erstellen
     * (entweder oberste Ebene oder als Unterabschnitt des gerade ausgewählten)
     */
    const handleNew = (isSub: boolean) => {
        setEditingNode(null);
        form.resetFields();
        // Wenn wir als Unterabschnitt anlegen, könnten wir ein Feld "parentNode" im Form pflegen
        // - hier optional, je nach dem ob du es brauchst.
        form.setFieldsValue({
            parentKey: isSub && selectedNode ? selectedNode.key : '',
        });
        setIsModalOpen(true);
    };

    /**
     * Bearbeiten eines bestehenden Abschnitts
     */
    const handleEdit = (node: EinsatzabschnittNode) => {
        setEditingNode(node);
        form.setFieldsValue({
            title: node.title,
            beschreibung: node.beschreibung,
            personnel: node.personnel || [],
            vehicles: node.vehicles || [],
            parentKey: '', // In diesem Beispiel ändern wir den Parent nicht
        });
        setIsModalOpen(true);
    };

    /**
     * Löschen
     */
    const handleDelete = (keyToDelete: string) => {
        const updated = deleteNode(treeData, keyToDelete);
        setTreeData(updated);
        message.success('Abschnitt gelöscht');
    };

    /**
     * Speichert neue oder aktualisierte Daten
     */
    const handleSave = (values: EinsatzabschnittFormValues) => {
        if (editingNode) {
            // Update existierender Abschnitt
            const updatedNode: EinsatzabschnittNode = {
                ...editingNode,
                title: values.title,
                beschreibung: values.beschreibung,
                personnel: values.personnel || [],
                vehicles: values.vehicles || [],
            };
            const updatedTree = updateNode(treeData, editingNode.key, updatedNode);
            setTreeData(updatedTree);
            message.success('Einsatzabschnitt aktualisiert');
        } else {
            // Neuer Abschnitt
            const newKey = `abs-${Date.now()}`;
            const newNode: EinsatzabschnittNode = {
                key: newKey,
                title: values.title,
                beschreibung: values.beschreibung,
                personnel: values.personnel || [],
                vehicles: values.vehicles || [],
            };

            // Prüfen, ob wir einen Unterabschnitt für selectedNode anlegen
            if (values.parentKey) {
                const parentKey = values.parentKey;
                const parentNode = findNode(treeData, parentKey);
                if (!parentNode) {
                    // Falls parentNode nicht existiert, legen wir ihn oben an
                    setTreeData([...treeData, newNode]);
                } else {
                    // Füge den neuen Abschnitt als Kind hinzu
                    const updatedParent = {
                        ...parentNode,
                        children: [...(parentNode.children || []), newNode],
                    };
                    const updatedTree = updateNode(treeData, parentKey, updatedParent);
                    setTreeData(updatedTree);
                }
            } else {
                // Top-Level-Abschnitt
                setTreeData([...treeData, newNode]);
            }
            message.success('Neuer Einsatzabschnitt erstellt');
        }

        setIsModalOpen(false);
        setEditingNode(null);
        form.resetFields();
    };

    /**
     * titleRender: Wir bauen eigene Aktionen in den Tree-Knoten ein (Bearbeiten, Löschen).
     */
    const titleRender = (node: EinsatzabschnittNode) => {
        return (
            <div className="flex items-center gap-2">
                <span className="font-semibold">{node.title}</span>
                <Button
                    size="small"
                    type="text"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(node);
                    }}
                >
                    Bearbeiten
                </Button>
                <Button
                    size="small"
                    danger
                    type="text"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(node.key);
                    }}
                >
                    Löschen
                </Button>
            </div>
        );
    };

    return (
        <Card title="Einsatzabschnitte">
            <div className="flex gap-2 mb-4">
                {/* Neuer Abschnitt (Top-Level) */}
                <Button type="primary" icon={<PiPlus />} onClick={() => handleNew(false)}>
                    Neuer Abschnitt
                </Button>
                {/* Neuer Unterabschnitt (erfordert eine Auswahl im Tree) */}
                <Button
                    onClick={() => handleNew(true)}
                    disabled={!selectedNode} // Nur aktiv, wenn ein Abschnitt ausgewählt ist
                >
                    Unterabschnitt anlegen
                </Button>
            </div>

            <Tree
                treeData={treeData}
                defaultExpandAll
                onSelect={handleSelect}
                titleRender={titleRender}
            />

            {/* Info über ausgewählten Knoten */}
            {selectedNode && (
                <div className="mt-4 p-2 border rounded">
                    <h4 className="font-semibold mb-1">Ausgewählter Abschnitt: {selectedNode.title}</h4>
                    <p className="text-sm mb-1">
                        {selectedNode.beschreibung || 'Keine Beschreibung'}
                    </p>
                    <p className="text-sm mb-1">
                        <strong>Personal:</strong>{' '}
                        {selectedNode.personnel?.length
                            ? selectedNode.personnel.join(', ')
                            : 'Keine Personen'}
                    </p>
                    <p className="text-sm mb-1">
                        <strong>Fahrzeuge:</strong>{' '}
                        {selectedNode.vehicles?.length
                            ? selectedNode.vehicles.join(', ')
                            : 'Keine Fahrzeuge'}
                    </p>
                </div>
            )}

            <Modal
                title={editingNode ? 'Abschnitt bearbeiten' : 'Neuer Einsatzabschnitt'}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => {
                    setIsModalOpen(false);
                    setEditingNode(null);
                    form.resetFields();
                }}
                okText="Speichern"
                cancelText="Abbrechen"
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    {/* Parent kann man hier optional als hidden-Feld oder Info anzeigen */}
                    <Form.Item name="parentKey" hidden>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Name des Abschnitts"
                        name="title"
                        rules={[{ required: true, message: 'Bitte einen Abschnittsnamen eingeben' }]}
                    >
                        <Input placeholder="z.B. Abschnitt Nord" />
                    </Form.Item>
                    <Form.Item label="Beschreibung" name="beschreibung">
                        <Input.TextArea rows={2} placeholder="Optional" />
                    </Form.Item>
                    <Form.Item label="Personal" name="personnel">
                        <Select
                            mode="multiple"
                            options={mockPersonalList.map((p) => ({ label: p, value: p }))}
                            placeholder="Wähle Personen"
                        />
                    </Form.Item>
                    <Form.Item label="Fahrzeuge" name="vehicles">
                        <Select
                            mode="multiple"
                            options={mockVehicleList.map((v) => ({ label: v, value: v }))}
                            placeholder="Wähle Fahrzeuge"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

/**
 * Rekursive Hilfsfunktion: Findet einen Knoten im Tree nach Key
 */
function findNode(treeData: EinsatzabschnittNode[], key: string): EinsatzabschnittNode | null {
    for (const node of treeData) {
        if (node.key === key) {
            return node;
        }
        if (node.children) {
            const found = findNode(node.children, key);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Rekursive Funktion: Updated einen Knoten nach Key
 */
function updateNode(
    treeData: EinsatzabschnittNode[],
    keyToUpdate: string,
    updatedNode: EinsatzabschnittNode
): EinsatzabschnittNode[] {
    return treeData.map((node) => {
        if (node.key === keyToUpdate) {
            return updatedNode;
        }
        if (node.children) {
            return {
                ...node,
                children: updateNode(node.children, keyToUpdate, updatedNode),
            };
        }
        return node;
    });
}

/**
 * Rekursive Funktion: Löscht einen Knoten aus dem Tree nach Key
 */
function deleteNode(
    treeData: EinsatzabschnittNode[],
    keyToDelete: string
): EinsatzabschnittNode[] {
    return treeData
        .map((node) => {
            if (node.children) {
                return {
                    ...node,
                    children: deleteNode(node.children, keyToDelete),
                };
            }
            return node;
        })
        .filter((n) => n.key !== keyToDelete);
}

export default Einsatzabschnitte;