import React, { useEffect } from 'react';
import MockReminders from '../../organisms/mocks/MockReminders';

export const RemindersPage: React.FC = () => {
  useEffect(() => {
    console.log('RemindersPage');
  }, []);
  return (
    <MockReminders />
  );
};

export default RemindersPage;
