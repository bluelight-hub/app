import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Alert } from 'antd';
import { useAuth } from '@/hooks/useAuth';

const AdminGuard: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Berechtigungen...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6">
        <Alert
          message="Zugriff verweigert"
          description="Sie benötigen Administratorrechte, um auf diesen Bereich zuzugreifen."
          type="error"
          showIcon
          className="max-w-lg mx-auto mt-20"
        />
        <div className="text-center mt-4">
          <Navigate to="/app" replace />
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default AdminGuard;
