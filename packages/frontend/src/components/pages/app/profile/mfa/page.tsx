import React from 'react';
import MfaSettingsPage from '../../../admin/MfaSettingsPage';

/**
 * MFA-Einstellungsseite für normale Benutzer
 *
 * Wiederverwendet die Admin-MFA-Einstellungsseite, da die Funktionalität identisch ist.
 */
const UserMfaSettingsPage: React.FC = () => {
  return <MfaSettingsPage />;
};

export default UserMfaSettingsPage;
