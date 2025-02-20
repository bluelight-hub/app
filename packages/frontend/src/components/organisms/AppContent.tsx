import { Breadcrumb, Empty, Layout, theme } from "antd";
import { Content } from "antd/es/layout/layout";
import React from "react";
import { PiPicnicTable } from "react-icons/pi";
import { WorkspaceTab } from "../../stores/useWorkspaceStore";


interface AppContentProps {
    activeTabId: string | null;
    tabs: WorkspaceTab[];
}

/**
 * Main content area of the application
 */
const AppContent: React.FC<AppContentProps> = ({ activeTabId, tabs }) => {
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    return (
        <Layout className="p-0 px-6 pb-6">
            <Breadcrumb
                items={[{ title: 'Home' }, { title: 'List' }, { title: 'App' }]}
                className="my-4"
            />
            <Content
                className="p-6 m-0 min-h-[280px]"
                style={{
                    background: colorBgContainer,
                    borderRadius: borderRadiusLG,
                }}
            >
                {activeTabId ? (
                    <div>Content for tab: {tabs.find(tab => tab.id === activeTabId)?.title}</div>
                ) : (
                    <Empty
                        image={<PiPicnicTable size={48} className="text-gray-200 dark:text-gray-800" />}
                        className="text-center text-gray-500"
                        description="Kein Arbeitsbereich geöffnet. Klicken Sie auf die Schaltfläche +, um einen zu erstellen."
                    />
                )}
            </Content>
        </Layout>
    );
};

export default AppContent; 