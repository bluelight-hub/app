import React from 'react';
import { Card, Alert } from 'antd';
import { PiDatabase } from 'react-icons/pi';

const AdminDatabasePage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PiDatabase />
          Datenbank-Tools
        </h1>
        <p className="text-gray-600 mt-2">Datenbank-Verwaltung und Wartung</p>
      </div>

      <Alert
        message="Development-Only Feature"
        description="Diese Seite ist nur in der Entwicklungsumgebung verfügbar."
        type="warning"
        showIcon
        className="mb-4"
      />

      <Card title="Datenbank-Operationen">
        <p className="text-gray-600">Datenbank-Tools werden hier angezeigt...</p>
      </Card>
    </div>
  );
};

export default AdminDatabasePage;
