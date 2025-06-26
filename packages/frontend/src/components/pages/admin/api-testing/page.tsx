import React from 'react';
import { Card } from 'antd';
import { PiCode } from 'react-icons/pi';

const AdminApiTestingPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PiCode />
          API Testing
        </h1>
        <p className="text-gray-600 mt-2">Test und Debug API-Endpoints</p>
      </div>

      <Card title="API Test Console">
        <p className="text-gray-600">API Test-Tools werden hier angezeigt...</p>
      </Card>
    </div>
  );
};

export default AdminApiTestingPage;
