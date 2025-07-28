import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import SecurityDashboard from './dashboard/page';
import SessionsTable from './sessions/page';
import IPWhitelistManager from './ip-whitelist/page';
import AlertsView from './alerts/page';
import ThreatRulesEditor from './threat-rules/page';
import SecurityReports from './reports/page';

/**
 * Security-Hauptseite mit Routing zu Unterseiten
 */
const SecurityPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SecurityDashboard />} />
      <Route path="/sessions" element={<SessionsTable />} />
      <Route path="/ip-whitelist" element={<IPWhitelistManager />} />
      <Route path="/alerts" element={<AlertsView />} />
      <Route path="/threat-rules" element={<ThreatRulesEditor />} />
      <Route path="/reports" element={<SecurityReports />} />
      <Route path="*" element={<Navigate to="/admin/security" replace />} />
    </Routes>
  );
};

export default SecurityPage;
