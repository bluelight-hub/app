import React from 'react';
import { Card } from 'antd';
import { PiSliders } from 'react-icons/pi';

const AdminSettingsPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PiSliders />
          Einstellungen
        </h1>
        <p className="text-gray-600 mt-2">Systemkonfiguration und Einstellungen</p>
      </div>

      <Card title="System-Einstellungen">
        <p className="text-gray-600">Einstellungen werden hier angezeigt...</p>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;
