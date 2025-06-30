import { Button, Card, Form, Input, Modal, Tree, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import React, { useState } from 'react';
import { PiPlus } from 'react-icons/pi';

/**
 * Typen für Node-Typen im Baum
 */
type NodeType = 'role' | 'person';

/**
 * Struktur eines Baum-Knotens
 */
interface RollenBaumNode extends DataNode {
  key: string; // Eindeutige ID
  title: string; // Anzeigename
  nodeType: NodeType; // Ob es sich um eine Rolle oder eine Person handelt
  children?: RollenBaumNode[]; // Kinderknoten
  // Optionale Felder (z.B. Beschreibung einer Rolle oder Kontaktdaten einer Person)
  beschreibung?: string; // Für Rollen
  phone?: string; // Für Personen
}

/**
 * MOCK-DATEN: Beispielhafter Hierarchiebaum
 * - 2 Rollen auf oberster Ebene
 * - Darunter jeweils Personen
 */
const initialTreeData: RollenBaumNode[] = [
  {
    key: 'role-1',
    title: 'Einsatzleiter',
    nodeType: 'role',
    beschreibung: 'Gesamtverantwortung für den Einsatz',
    children: [
      {
        key: 'person-101',
        title: 'Max Mustermann',
        nodeType: 'person',
        phone: '0151-2345678',
      },
      {
        key: 'person-102',
        title: 'Julia Beispiel',
        nodeType: 'person',
      },
    ],
  },
  {
    key: 'role-2',
    title: 'Gruppenführer',
    nodeType: 'role',
    beschreibung: 'Leitung einer Gruppe (bis zu 9 Helfer)',
    children: [
      {
        key: 'person-201',
        title: 'Lukas Maier',
        nodeType: 'person',
        phone: '0157-1112223',
      },
    ],
  },
];

const RollenStrukturBaum: React.FC = () => {
  const [treeData, setTreeData] = useState<RollenBaumNode[]>(initialTreeData);

  // Aktuell ausgewählter Knoten (für Kontext: Zuweisung neuer Personen / Bearbeiten)
  const [selectedNode, setSelectedNode] = useState<RollenBaumNode | null>(null);

  // Modal-States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<RollenBaumNode | null>(null);

  const [form] = Form.useForm();

  /**
   * Handler, wenn ein Knoten im Baum selektiert wird.
   * - Info enthält u.a. die Node-Properties in info.node
   */
  const handleSelect = (_selectedKeys: React.Key[], info: { node: RollenBaumNode }) => {
    const node: RollenBaumNode = info.node;
    setSelectedNode(node);
  };

  /**
   * Öffnet ein Modal, um entweder
   * - eine neue Rolle (nodeType='role') oder
   * - eine neue Person (nodeType='person')
   * zu erstellen (falls editingNode=null),
   * ODER einen existierenden Knoten zu bearbeiten (falls editingNode != null).
   */
  const openModal = (nodeType: NodeType) => {
    if (nodeType === 'role') {
      // Neue Rolle anlegen
      setEditingNode(null);
      form.resetFields();
      form.setFieldsValue({ nodeType: 'role' });
    } else if (nodeType === 'person') {
      // Neue Person anlegen
      setEditingNode(null);
      form.resetFields();
      form.setFieldsValue({ nodeType: 'person' });
    }
    setIsModalOpen(true);
  };

  /**
   * Bearbeiten eines existierenden Knotens
   */
  const handleEdit = (node: RollenBaumNode) => {
    setEditingNode(node);
    // Node-Felder in Form laden
    form.setFieldsValue({
      nodeType: node.nodeType,
      title: node.title,
      beschreibung: node.beschreibung,
      phone: node.phone,
    });
    setIsModalOpen(true);
  };

  /**
   * Speichert neue/aktualisierte Daten
   */
  const handleSave = (values: RollenBaumNode) => {
    if (editingNode) {
      // UPDATE existierenden Knoten
      const updatedTree = updateNodeInTree(treeData, editingNode.key, {
        ...editingNode,
        title: values.title || editingNode.title,
        beschreibung: values.beschreibung || editingNode.beschreibung,
        phone: values.phone || editingNode.phone,
      });
      setTreeData(updatedTree);
      message.success('Knoten aktualisiert');
    } else {
      // CREATE neuer Knoten
      if (values.nodeType === 'role') {
        // Neue Rolle als Wurzel oder als Unterknoten?
        // Hier legen wir eine neue Rolle auf oberster Ebene an.
        // (Falls du Unterrollen willst, könntest du sie dem aktuellen "selectedNode" hinzufügen,
        //  wenn "selectedNode" selbst eine Rolle ist.)
        const newKey = `role-${Date.now()}`;
        const newRole: RollenBaumNode = {
          key: newKey,
          title: values.title,
          nodeType: 'role',
          beschreibung: values.beschreibung || '',
          children: [],
        };
        setTreeData([...treeData, newRole]);
        message.success('Neue Rolle angelegt');
      } else {
        // Neue Person
        if (!selectedNode || selectedNode.nodeType !== 'role') {
          message.warning('Bitte zunächst eine Rolle wählen, in der die Person angelegt werden soll.');
          return;
        }
        const newKey = `person-${Date.now()}`;
        const newPerson: RollenBaumNode = {
          key: newKey,
          title: values.title,
          nodeType: 'person',
          phone: values.phone,
        };
        // Neue Person als Kind zur ausgewählten Rolle hinzufügen
        const updatedTree = updateNodeInTree(treeData, selectedNode.key, {
          ...selectedNode,
          children: [...(selectedNode.children || []), newPerson],
        });
        setTreeData(updatedTree);
        message.success('Neue Person in die Rolle hinzugefügt');
      }
    }

    setIsModalOpen(false);
    form.resetFields();
    setEditingNode(null);
  };

  /**
   * Löschen eines Knotens (Rolle oder Person)
   */
  const handleDelete = (nodeKey: string) => {
    const updatedTree = deleteNodeFromTree(treeData, nodeKey);
    setTreeData(updatedTree);
    message.success('Knoten gelöscht');
  };

  return (
    <Card
      title="Rollen-Struktur"
      className="shadow-md max-w-5xl mx-auto"
      extra={
        <div className="flex gap-2">
          {/* Button: Neue Rolle anlegen */}
          <Button type="primary" icon={<PiPlus />} onClick={() => openModal('role')}>
            Neue Rolle
          </Button>
          {/* Button: Neue Person anlegen (benötigt Rolle als "parent") */}
          <Button onClick={() => openModal('person')}>Neue Person</Button>
        </div>
      }
    >
      <Tree
        // Zeigt den Titel an
        treeData={treeData}
        // Erlaubt Selektion
        onSelect={handleSelect}
        // Wir geben die Möglichkeit, per Rechtsklick ein Kontextmenü zu öffnen
        // oder direkt doppelklicken. Hier nur ein Beispiel:
        onRightClick={(info) => {
          // Kontextmenü-Handling, oder:
          const node = info.node as RollenBaumNode;
          // Beispiel: Bearbeiten
          handleEdit(node);
        }}
        // Expand automatisch, damit man alles sieht:
        defaultExpandAll
        // Anpassen, wie jedes Knoten-Label gerendert wird (um Lösch-Button einzubauen)
        titleRender={(nodeData) => {
          const isRole = nodeData.nodeType === 'role';
          return (
            <div className="flex items-center gap-2">
              <span className={isRole ? 'font-semibold' : ''}>{nodeData.title}</span>
              <Button
                size="small"
                type="text"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(nodeData);
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
                  handleDelete(nodeData.key);
                }}
              >
                Löschen
              </Button>
            </div>
          );
        }}
      />

      <Modal
        title={editingNode ? 'Knoten bearbeiten' : 'Neuer Knoten'}
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
          <Form.Item name="nodeType" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            label="Name"
            name="title"
            rules={[{ required: true, message: 'Bitte Name / Bezeichnung eingeben' }]}
          >
            <Input placeholder="z.B. 'Einsatzleiter' oder 'Max Mustermann'" />
          </Form.Item>

          {/* Nur anzeigen, wenn nodeType='role' */}
          {form.getFieldValue('nodeType') === 'role' && (
            <Form.Item label="Beschreibung" name="beschreibung">
              <Input.TextArea rows={3} placeholder="z.B. Aufgaben / Zuständigkeiten der Rolle" />
            </Form.Item>
          )}

          {/* Nur anzeigen, wenn nodeType='person' */}
          {form.getFieldValue('nodeType') === 'person' && (
            <Form.Item label="Telefon" name="phone">
              <Input placeholder="z.B. 0151-XXXXXXX" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
};

/**
 * Hilfsfunktion: Aktualisiert einen bestimmten Knoten im Baum.
 * - Sucht den Knoten via key
 * - Ersetzt ihn durch updatedNode
 */
function updateNodeInTree(
  treeData: RollenBaumNode[],
  keyToUpdate: string,
  updatedNode: RollenBaumNode,
): RollenBaumNode[] {
  return treeData.map((node) => {
    if (node.key === keyToUpdate) {
      // Diesen Knoten ersetzen
      return { ...updatedNode };
    } else if (node.children) {
      // Rekursiv in Kindern suchen
      return {
        ...node,
        children: updateNodeInTree(node.children, keyToUpdate, updatedNode),
      };
    }
    return node;
  });
}

/**
 * Hilfsfunktion: Löscht einen bestimmten Knoten aus dem Baum.
 */
function deleteNodeFromTree(treeData: RollenBaumNode[], keyToDelete: string): RollenBaumNode[] {
  return treeData
    .map((node) => {
      // Falls dieser Knoten der zu löschende ist, wird er später ausgefiltert
      if (node.children) {
        // Kinder rekursiv updaten
        node = {
          ...node,
          children: deleteNodeFromTree(node.children, keyToDelete),
        };
      }
      return node;
    })
    .filter((node) => node.key !== keyToDelete);
}

export default RollenStrukturBaum;
