import { Badge } from '@/shared/ui/atoms/badge.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Label } from '@/shared/ui/atoms/label.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { ManagedUserResponseDtoRoleEnum } from '@/shared';
import { useState } from 'react';
import { PiLockKey, PiShieldWarning, PiUserMinus } from 'react-icons/pi';
export type UserActionType = 'delete' | 'downgrade' | 'lock';
interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: UserActionType, lockReason?: string) => void;
  userName: string;
  userRole: ManagedUserResponseDtoRoleEnum;
  isDeleting: boolean;
} /** * Bestimmt die Badge-Variante basierend auf der Benutzerrolle. * @param role - Die Benutzerrolle als ManagedUserResponseDtoRoleEnum * @returns Die entsprechende Badge-Variante für die visuelle Darstellung */
const getRoleBadgeVariant = (role: ManagedUserResponseDtoRoleEnum): 'error' | 'warning' | 'info' | 'default' => {
  switch (role) {
    case ManagedUserResponseDtoRoleEnum.SuperAdmin:
      return 'error';
    case ManagedUserResponseDtoRoleEnum.Admin:
      return 'warning';
    case ManagedUserResponseDtoRoleEnum.User:
      return 'info';
    default:
      return 'default';
  }
};
export const ConfirmDeleteDialog = ({ isOpen, onClose, onConfirm, userName, userRole, isDeleting }: ConfirmDeleteDialogProps) => {
  const [selectedAction, setSelectedAction] = useState<UserActionType>('delete');
  const [lockReason, setLockReason] = useState('');
  const isAdmin = userRole === ManagedUserResponseDtoRoleEnum.Admin || userRole === ManagedUserResponseDtoRoleEnum.SuperAdmin;
  const handleClose = () => {
    setSelectedAction('delete');
    setLockReason('');
    onClose();
  };
  const handleConfirm = () => {
    onConfirm(selectedAction, selectedAction === 'lock' ? lockReason : undefined);
  };
  const getActionButtonText = () => {
    switch (selectedAction) {
      case 'delete':
        return 'Löschen';
      case 'downgrade':
        return 'Zu User herabstufen';
      case 'lock':
        return 'Sperren';
    }
  };
  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      {' '}
      <div className="relative">
        {' '}
        <Dialog.Title>Benutzer-Aktion wählen</Dialog.Title>{' '}
        <Dialog.Body>
          {' '}
          <div className="flex flex-col space-y-4">
            {' '}
            <div className="flex flex-col items-center space-y-2 text-center">
              {' '}
              <PiShieldWarning className="h-12 w-12 text-status-warning-text" /> <p className="text-lg font-semibold text-text-primary">{userName}</p>{' '}
              <Badge variant={getRoleBadgeVariant(userRole)}>{userRole}</Badge>{' '}
            </div>{' '}
            <div className="space-y-3">
              {' '}
              <Label>Aktion auswählen:</Label>{' '}
              <div className="space-y-2">
                {' '}
                <label className="flex cursor-pointer items-center space-x-3 rounded-lg border border-border-subtle p-3 transition hover:bg-surface-raised">
                  {' '}
                  <input
                    type="radio"
                    name="action"
                    value="delete"
                    checked={selectedAction === 'delete'}
                    onChange={(e) => setSelectedAction(e.target.value as UserActionType)}
                    className="h-4 w-4 text-status-danger-text"
                  />{' '}
                  <div className="flex flex-1 items-center space-x-2">
                    {' '}
                    <PiUserMinus className="h-5 w-5 text-status-danger-text" />{' '}
                    <div>
                      {' '}
                      <p className="text-sm font-medium">Löschen (Soft Delete)</p>{' '}
                      <p className="text-xs text-text-muted">{isAdmin ? 'Deaktivieren + zu User herabstufen (reaktivierbar)' : 'Benutzer deaktivieren (reaktivierbar)'}</p>{' '}
                    </div>{' '}
                  </div>{' '}
                </label>{' '}
                {isAdmin && (
                  <label className="flex cursor-pointer items-center space-x-3 rounded-lg border border-border-subtle p-3 transition hover:bg-surface-raised">
                    {' '}
                    <input
                      type="radio"
                      name="action"
                      value="downgrade"
                      checked={selectedAction === 'downgrade'}
                      onChange={(e) => setSelectedAction(e.target.value as UserActionType)}
                      className="h-4 w-4 text-status-warning-text"
                    />{' '}
                    <div className="flex flex-1 items-center space-x-2">
                      {' '}
                      <PiShieldWarning className="h-5 w-5 text-status-warning-text" />{' '}
                      <div>
                        {' '}
                        <p className="text-sm font-medium">Zu User herabstufen (aktiv)</p> <p className="text-xs text-text-muted">Admin-Rechte entfernen, als User aktiv bleiben</p>{' '}
                      </div>{' '}
                    </div>{' '}
                  </label>
                )}{' '}
                <label className="flex cursor-pointer items-center space-x-3 rounded-lg border border-border-subtle p-3 transition hover:bg-surface-raised">
                  {' '}
                  <input
                    type="radio"
                    name="action"
                    value="lock"
                    checked={selectedAction === 'lock'}
                    onChange={(e) => setSelectedAction(e.target.value as UserActionType)}
                    className="h-4 w-4 text-status-warning-text"
                  />{' '}
                  <div className="flex flex-1 items-center space-x-2">
                    {' '}
                    <PiLockKey className="h-5 w-5 text-status-warning-text" />{' '}
                    <div>
                      {' '}
                      <p className="text-sm font-medium">Sperren</p> <p className="text-xs text-text-muted">Temporär sperren (reversibel)</p>{' '}
                    </div>{' '}
                  </div>{' '}
                </label>{' '}
              </div>{' '}
              {selectedAction === 'lock' && (
                <div className="mt-3">
                  {' '}
                  <Label htmlFor="lockReason">Sperrgrund (optional)</Label>{' '}
                  <Input id="lockReason" value={lockReason} onChange={(e) => setLockReason(e.target.value)} placeholder="z.B. Verstoß gegen Nutzungsbedingungen" className="mt-1" />{' '}
                </div>
              )}{' '}
            </div>{' '}
          </div>{' '}
        </Dialog.Body>{' '}
        <Dialog.Footer>
          {' '}
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isDeleting}>
            {' '}
            Abbrechen{' '}
          </Button>{' '}
          <Button intent={selectedAction === 'delete' ? 'danger' : selectedAction === 'lock' ? 'warning' : 'primary'} onClick={handleConfirm} loading={isDeleting} disabled={isDeleting}>
            {' '}
            {getActionButtonText()}{' '}
          </Button>{' '}
        </Dialog.Footer>{' '}
      </div>{' '}
    </Dialog>
  );
};
