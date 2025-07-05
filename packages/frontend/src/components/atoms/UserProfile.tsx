import { Dropdown, MenuProps, Button } from 'antd';
import { PiSignOut, PiUser } from 'react-icons/pi';
import React, { useState } from 'react';
import { useEinsatzContext } from '../../contexts/EinsatzContext';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { logout } from '../../utils/auth';
import { BaseAtomProps } from '../../utils/types';

interface UserProfileProps extends BaseAtomProps {
  href: string;
  onClick?: () => void;
  hideText?: boolean;
}

/**
 * User profile component for the sidebar
 */
const UserProfile: React.FC<UserProfileProps> = ({
  href: _href,
  onClick,
  hideText = false,
  'data-testid': dataTestId = 'user-profile',
}) => {
  const profile = useUserProfileStore((state) => state.profile);
  const { clearSelectedEinsatz } = useEinsatzContext();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout(clearSelectedEinsatz);
    } catch (_error) {
      // Fehler wird bereits in der logout-Funktion behandelt
    } finally {
      setLoading(false);
    }
  };

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <PiUser />,
      label: 'Profil',
      onClick: () => {
        if (onClick) onClick();
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <PiSignOut />,
      label: 'Ausloggen',
      danger: true,
      onClick: handleLogout,
      disabled: loading,
    },
  ];

  if (!profile) return null;

  return (
    <div className={hideText ? '' : 'px-6 py-2'}>
      <Dropdown menu={{ items }} trigger={['click']} placement="topRight">
        <Button type="default" icon={<PiUser />} className="w-full" size="middle" data-testid={dataTestId}>
          {!hideText && (profile.name || 'Profil')}
        </Button>
      </Dropdown>
    </div>
  );
};

export default UserProfile;
