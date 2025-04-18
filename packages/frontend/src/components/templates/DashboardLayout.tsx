import React from 'react';
import { Outlet } from 'react-router';

/**
 * DashboardLayout-Template für Dashboards ohne Navigation
 * Wird für Fenster verwendet, die im Vollbildmodus oder als separates Fenster geöffnet werden
 * Nutzt die volle Fensterhöhe und macht den Inhalt bei Bedarf scrollbar
 */
const DashboardLayout: React.FC = () => {
    return (
        <div className="h-screen flex flex-col bg-white dark:bg-gray-900 text-black dark:text-white overflow-hidden">
            <main className="flex-1 overflow-auto py-4">
                <div className="px-4 h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout; 