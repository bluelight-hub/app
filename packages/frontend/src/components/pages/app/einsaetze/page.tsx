import type { Einsatz } from '@bluelight-hub/shared/client/models';
import { Alert, Button, Card, Input, Space, Table, Typography } from 'antd';
import React, { useState } from 'react';
import { PiMagnifyingGlass, PiPlus, PiSignOut, PiSiren } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { useEinsatzContext } from '../../../../contexts/EinsatzContext';
import { useEinsaetzeUebersicht, useEinsatzSearch } from '../../../../hooks/einsatz/useEinsaetzeUebersicht';
import { logout } from '../../../../utils/auth';
import { formatDate } from '../../../../utils/einsaetze';
import { logger } from '../../../../utils/logger';
import { NewEinsatzModal } from '../../../organisms/einsaetze/NewEinsatzModal';

const { Title } = Typography;
const { Search } = Input;

/**
 * Einsätze-Übersicht Page - Zentrale Übersicht aller Einsätze
 * 
 * Diese Komponente dient als Haupteinstiegspunkt nach dem Login und zeigt
 * eine Liste aller vorhandenen Einsätze mit der Möglichkeit neue zu erstellen.
 */
export const EinsaetzeUebersichtPage: React.FC = () => {
    const navigate = useNavigate();
    const { selectEinsatz, clearSelectedEinsatz } = useEinsatzContext();
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [newEinsatzModalOpen, setNewEinsatzModalOpen] = useState(false);
    
    const {
        einsaetze,
        isLoading,
        isError,
        error,
        totalEinsaetze,
        filteredEinsaetze,
        currentPage,
        pageSize,
        goToPage,
        updateFilters,
        clearFilters
    } = useEinsaetzeUebersicht();

    const {
        searchText,
        debouncedSearchText,
        updateSearch,
        clearSearch
    } = useEinsatzSearch();

    // Search effect
    React.useEffect(() => {
        updateFilters({ searchText: debouncedSearchText || undefined });
    }, [debouncedSearchText, updateFilters]);

    // Table columns
    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 100,
            render: (id: string) => (
                <code className="text-xs">{id.slice(0, 8)}...</code>
            )
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: true
        },
        {
            title: 'Beschreibung',
            dataIndex: 'beschreibung',
            key: 'beschreibung',
            render: (text: string) => text || '-'
        },
        {
            title: 'Erstellt',
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: true,
            render: (date: Date) => formatDate(date)
        },
        {
            title: 'Aktualisiert',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            sorter: true,
            render: (date: Date) => formatDate(date)
        }
    ];

    const handleSearch = (value: string) => {
        logger.debug('Search input changed', { value });
        updateSearch(value);
    };

    const handleClearFilters = () => {
        clearFilters();
        clearSearch();
    };

    const handleRowClick = (record: Einsatz) => {
        logger.debug('Einsatz row clicked', { einsatzId: record.id });
        // Wähle den Einsatz aus
        selectEinsatz(record);
        // Navigiere zum Dashboard
        navigate('/app');
    };

    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            await logout(clearSelectedEinsatz);
        } catch (_error) {
            // Fehler wird bereits in der logout-Funktion behandelt
        } finally {
            setLogoutLoading(false);
        }
    };

    const handleOpenNewEinsatzModal = () => {
        logger.debug('Opening new Einsatz modal');
        setNewEinsatzModalOpen(true);
    };

    const handleCloseNewEinsatzModal = () => {
        logger.debug('Closing new Einsatz modal');
        setNewEinsatzModalOpen(false);
    };

    const handleNewEinsatzSuccess = () => {
        logger.debug('New Einsatz created successfully');
        // Modal wird automatisch geschlossen, Liste wird durch React Query aktualisiert
    };

    logger.debug('EinsaetzeUebersichtPage render', {
        einsaetzeCount: einsaetze.length,
        isLoading,
        isError
    });

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <PiSiren className="text-2xl text-blue-600" />
                        <Title level={1} className="mb-0">
                            Einsätze-Übersicht
                        </Title>
                    </div>

                    <Space>
                        <Button
                            type="primary"
                            icon={<PiPlus />}
                            size="large"
                            onClick={handleOpenNewEinsatzModal}
                        >
                            Neuer Einsatz
                        </Button>
                        
                        <Button
                            icon={<PiSignOut />}
                            size="large"
                            onClick={handleLogout}
                            loading={logoutLoading}
                            danger
                        >
                            Ausloggen
                        </Button>
                    </Space>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <Space direction="vertical" className="w-full">
                        <div className="flex gap-4 items-center flex-wrap">
                            <Search
                                placeholder="Einsätze durchsuchen..."
                                value={searchText}
                                onChange={(e) => handleSearch(e.target.value)}
                                onSearch={handleSearch}
                                prefix={<PiMagnifyingGlass />}
                                className="flex-1 max-w-md"
                                allowClear
                            />

                            <Button onClick={handleClearFilters}>
                                Filter zurücksetzen
                            </Button>
                        </div>

                        {/* Stats */}
                        <div className="text-sm text-gray-600">
                            {filteredEinsaetze !== totalEinsaetze ? (
                                <>Zeige {filteredEinsaetze} von {totalEinsaetze} Einsätzen</>
                            ) : (
                                <>{totalEinsaetze} Einsätze insgesamt</>
                            )}
                        </div>
                    </Space>
                </Card>

                {/* Error State */}
                {isError && (
                    <Alert
                        type="error"
                        message="Fehler beim Laden der Einsätze"
                        description={error?.message}
                        className="mb-6"
                        showIcon
                    />
                )}

                {/* Table */}
                <Card>
                    <Table<Einsatz>
                        columns={columns}
                        dataSource={einsaetze}
                        loading={isLoading}
                        rowKey="id"
                        pagination={{
                            current: currentPage,
                            total: filteredEinsaetze,
                            pageSize: pageSize,
                            onChange: goToPage,
                            showSizeChanger: false,
                            showQuickJumper: true,
                            showTotal: (total, range) =>
                                `${range[0]}-${range[1]} von ${total} Einsätzen`
                        }}
                        locale={{
                            emptyText: searchText
                                ? 'Keine Einsätze entsprechen den Suchkriterien'
                                : 'Keine Einsätze vorhanden'
                        }}
                        onRow={(record) => ({
                            onClick: () => handleRowClick(record),
                            style: { cursor: 'pointer' }
                        })}
                    />
                </Card>

                {/* New Einsatz Modal */}
                <NewEinsatzModal
                    open={newEinsatzModalOpen}
                    onClose={handleCloseNewEinsatzModal}
                    onSuccess={handleNewEinsatzSuccess}
                />
            </div>
        </div>
    );
};

export default EinsaetzeUebersichtPage; 