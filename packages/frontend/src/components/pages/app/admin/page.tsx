import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { PiChartLine, PiFileText, PiGear, PiUser, PiUsersThree } from 'react-icons/pi';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  // TODO: Diese Daten werden später von der API geladen
  const stats = {
    users: 42,
    organizations: 8,
    activeEinsaetze: 3,
    systemHealth: 'OK',
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PiChartLine />
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Systemverwaltung und Übersicht</p>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Link to="/admin/users">
              <Statistic title="Benutzer" value={stats.users} prefix={<PiUser />} valueStyle={{ color: '#1890ff' }} />
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Link to="/admin/organizations">
              <Statistic
                title="Organisationen"
                value={stats.organizations}
                prefix={<PiUsersThree />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Link to="/admin/logs">
              <Statistic
                title="Aktive Einsätze"
                value={stats.activeEinsaetze}
                prefix={<PiFileText />}
                valueStyle={{ color: '#faad14' }}
              />
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Link to="/admin/system">
              <Statistic
                title="System Status"
                value={stats.systemHealth}
                prefix={<PiGear />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Link>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Schnellzugriff" className="h-full">
            <div className="space-y-3">
              <Link to="/admin/users" className="block p-3 border rounded hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <PiUser className="text-lg text-blue-500" />
                  <div>
                    <div className="font-medium">Benutzerverwaltung</div>
                    <div className="text-sm text-gray-500">Benutzer verwalten, Rollen zuweisen</div>
                  </div>
                </div>
              </Link>
              <Link to="/admin/organizations" className="block p-3 border rounded hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <PiUsersThree className="text-lg text-green-500" />
                  <div>
                    <div className="font-medium">Organisationsverwaltung</div>
                    <div className="text-sm text-gray-500">Organisationen und Strukturen verwalten</div>
                  </div>
                </div>
              </Link>
              <Link to="/admin/system" className="block p-3 border rounded hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <PiGear className="text-lg text-orange-500" />
                  <div>
                    <div className="font-medium">Systemeinstellungen</div>
                    <div className="text-sm text-gray-500">Konfiguration und Systemparameter</div>
                  </div>
                </div>
              </Link>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Letzte Aktivitäten" className="h-full">
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Aktivitäts-Log wird hier angezeigt...</div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
