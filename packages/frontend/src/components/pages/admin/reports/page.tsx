import React from 'react';
import { Card } from 'antd';
import { PiChartBar } from 'react-icons/pi';

const AdminReportsPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PiChartBar />
          Berichte
        </h1>
        <p className="text-gray-600 mt-2">System- und Nutzungsberichte</p>
      </div>

      <Card title="Verfügbare Berichte">
        <p className="text-gray-600">Berichte werden hier angezeigt...</p>
      </Card>
    </div>
  );
};

export default AdminReportsPage;
