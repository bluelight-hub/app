import React, { useEffect } from 'react';

export const RemindersPage: React.FC = () => {
  useEffect(() => {
    console.log('RemindersPage');
  }, []);
  return (
    <div>
      <h1>Reminders</h1>
    </div>
  );
};

export default RemindersPage;
