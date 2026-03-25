import { useState, useEffect } from 'react';
import { Navigate } from '@tanstack/react-router';
import { PiPlus, PiWarning, PiEye, PiEyeSlash } from 'react-icons/pi';
import { useAdminAuth } from '@/features/auth/api';
import { useAdminStammPersonenManagement, useAdminQualifikationenManagement, type StammPersonDto, type CreateStammPersonDto, type UpdateStammPersonDto } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { ErrorBoundary } from '@/shared/ui/organisms/ErrorBoundary';
import { StammPersonenTable } from '../organisms/StammPersonenTable';
import { CreateStammPersonDialog } from '../organisms/CreateStammPersonDialog';
import { EditStammPersonDialog } from '../organisms/EditStammPersonDialog';
import { ArchiveStammPersonDialog } from '../organisms/ArchiveStammPersonDialog'; /** * Admin Stamm-Personen Page. * * Zeigt Tabelle aller Stamm-Personen mit CRUD-Operationen. * Nur für authentifizierte Admins zugänglich. * * Keyboard Shortcuts: * - Ctrl+N / Cmd+N: Neue Person erstellen */
export function AdminStammPersonen() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const [showArchived, setShowArchived] = useState(false);
  const {
    stammPersonen,
    isLoading: isPersonenLoading,
    error,
    refetch,
    createStammPerson,
    updateStammPerson,
    archiveStammPerson,
    restoreStammPerson,
    isCreating,
    isUpdating,
    isArchiving,
    updatingId,
    archivingId,
    restoringId,
  } = useAdminStammPersonenManagement({ includeArchived: showArchived });
  const { qualifikationen, isLoading: qualifikationenLoading } = useAdminQualifikationenManagement(); // Dialog States const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false); const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); const [editTarget, setEditTarget] = useState<StammPersonDto | null>(null); const [archiveTarget, setArchiveTarget] = useState<StammPersonDto | null>(null); // Keyboard Shortcuts: Ctrl+N / Cmd+N öffnet Create Dialog useEffect(() => { const handleKeyDown = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key === 'n') { event.preventDefault(); setIsCreateDialogOpen(true); } }; window.addEventListener('keydown', handleKeyDown); return () => { window.removeEventListener('keydown', handleKeyDown); }; }, []); // Auth Guard if (!isAuthLoading && !isAdmin) { return <Navigate to="/admin-login" />; } // Handlers const handleCreatePerson = (data: CreateStammPersonDto) => { createStammPerson(data, { onSuccess: () => { setIsCreateDialogOpen(false); }, }); }; const handleEditPerson = (person: StammPersonDto) => { setEditTarget(person); setIsEditDialogOpen(true); }; const handleUpdatePerson = (data: UpdateStammPersonDto) => { if (!editTarget) return; updateStammPerson( { id: editTarget.id, data }, { onSuccess: () => { setIsEditDialogOpen(false); setEditTarget(null); }, }, ); }; const handleArchivePerson = (person: StammPersonDto) => { setArchiveTarget(person); }; const confirmArchive = () => { if (!archiveTarget) return; archiveStammPerson(archiveTarget.id, { onSuccess: () => { setArchiveTarget(null); }, }); }; const handleRestorePerson = (person: StammPersonDto) => { restoreStammPerson(person.id); }; // Loading State if (isAuthLoading || isPersonenLoading) { return ( <Container maxWidth="6xl" className="py-8"> <div className="flex flex-col gap-6"> {/* Header Skeleton */} <div className="flex items-center justify-between"> <div className="flex flex-col gap-2"> <Skeleton className="h-8 w-48" /> <Skeleton className="h-4 w-96" /> </div> <Skeleton className="h-10 w-48" /> </div> {/* Table Skeleton */} <Card padding="none"> <div className="p-6"> <div className="space-y-4"> {[...Array(5)].map((_, index) => ( // eslint-disable-next-line react/no-array-index-key -- Static skeleton elements <div key={`skeleton-${index}`} className="flex items-center gap-4"> <Skeleton className="h-6 w-24" /> <Skeleton className="h-6 w-32" /> <Skeleton className="h-6 w-48" /> <Skeleton className="h-6 w-20" /> <Skeleton className="h-6 w-16" /> </div> ))} </div> </div> </Card> </div> </Container> ); } // Error State if (error) { return ( <Container maxWidth="6xl" className="py-8"> <Card padding="lg" className="text-center"> <div className="flex flex-col items-center gap-4"> <PiWarning className="h-12 w-12 text-status-danger-text" /> <Heading size="md">Fehler beim Laden</Heading> <Text className="text-text-secondary">Die Personen konnten nicht geladen werden.</Text> <Text className="text-text-muted text-sm">{error.message}</Text> <Button onClick={() => void refetch()} intent="primary" loading={isPersonenLoading} disabled={isPersonenLoading}> Erneut versuchen </Button> </div> </Card> </Container> ); } return ( <ErrorBoundary> <Container maxWidth="6xl" className="py-8"> <div className="flex flex-col gap-6"> {/* Header */} <div className="flex items-center justify-between"> <div> <Heading size="lg" as="h1"> Stamm-Personen </Heading> <Text className="text-text-secondary">Verwalten Sie die Mitglieder Ihrer Organisation.</Text> </div> <div className="flex items-center gap-3"> <Button onClick={() => setShowArchived(!showArchived)} intent="secondary" appearance="ghost" size="sm"> {showArchived ? <PiEyeSlash className="mr-2" /> : <PiEye className="mr-2" />} {showArchived ? 'Archivierte ausblenden' : 'Archivierte anzeigen'} </Button> <Button onClick={() => setIsCreateDialogOpen(true)} intent="primary" appearance="outline"> <PiPlus className="mr-2" /> Person hinzufügen </Button> </div> </div> {/* Table */} <Card padding="none"> <StammPersonenTable stammPersonen={stammPersonen || []} isLoading={isPersonenLoading} onEdit={handleEditPerson} onArchive={handleArchivePerson} onRestore={handleRestorePerson} updatingId={updatingId} archivingId={archivingId} restoringId={restoringId} /> </Card> </div> {/* Dialogs */} <CreateStammPersonDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} onSubmit={handleCreatePerson} isSubmitting={isCreating} qualifikationen={qualifikationen || []} qualifikationenLoading={qualifikationenLoading} /> <EditStammPersonDialog isOpen={isEditDialogOpen} onClose={() => { setIsEditDialogOpen(false); setEditTarget(null); }} onSubmit={handleUpdatePerson} isSubmitting={isUpdating} person={editTarget} qualifikationen={qualifikationen || []} qualifikationenLoading={qualifikationenLoading} /> <ArchiveStammPersonDialog isOpen={!!archiveTarget} onClose={() => setArchiveTarget(null)} onConfirm={confirmArchive} person={archiveTarget} isArchiving={isArchiving} /> </Container> </ErrorBoundary> );
}
