import { Button, Form, Input, Modal, Select, Table } from "antd";
import React, { useState } from "react";

interface Patient {
    id: number;
    name: string;
    status: string;
    priority: string;
}

const dummyData: Patient[] = [
    { id: 1, name: "Max Mustermann", status: "angemeldet", priority: "grün" },
    { id: 2, name: "Erika Mustermann", status: "in Behandlung", priority: "gelb" },
];

const PatientsManage: React.FC = () => {
    const [data, setData] = useState<Patient[]>(dummyData);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form] = Form.useForm();

    const onEdit = (record: Patient) => {
        setSelectedPatient(record);
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleSave = (values: Patient) => {
        if (!selectedPatient) return;
        const updated = data.map((p) => (p.id === selectedPatient.id ? { ...p, ...values } : p));
        setData(updated);
        setSelectedPatient(null);
        setIsModalOpen(false);
    };

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
        },
        {
            title: "Priorität",
            dataIndex: "priority",
            key: "priority",
        },
        {
            title: "Aktionen",
            key: "actions",
            render: (_text: unknown, record: Patient) => (
                <Button type="link" onClick={() => onEdit(record)}>
                    Bearbeiten
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: "1rem" }}>
            <h1>Betroffene verwalten</h1>
            <Table columns={columns} dataSource={data} rowKey="id" />

            <Modal
                title="Betroffenen bearbeiten"
                visible={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[{ required: true, message: "Name darf nicht leer sein." }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label="Status" name="status">
                        <Select>
                            <Select.Option value="angemeldet">Angemeldet</Select.Option>
                            <Select.Option value="in Behandlung">In Behandlung</Select.Option>
                            <Select.Option value="entlassen">Entlassen</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="Priorität" name="priority">
                        <Select>
                            <Select.Option value="rot">Rot</Select.Option>
                            <Select.Option value="gelb">Gelb</Select.Option>
                            <Select.Option value="grün">Grün</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Speichern
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default PatientsManage;
