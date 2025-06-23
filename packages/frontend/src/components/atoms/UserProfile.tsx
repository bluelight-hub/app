import { Dropdown, MenuProps, Badge } from 'antd';
import { PiSignOut, PiUser, PiShieldCheck } from 'react-icons/pi';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
  const { user } = useAuth();
  const navigate = useNavigate();
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
      key: 'mfa',
      icon: <PiShieldCheck />,
      label: (
        <span className="flex items-center justify-between">
          <span>Zwei-Faktor-Authentifizierung</span>
          {user?.isMfaEnabled && <Badge status="success" text="Aktiv" className="ml-2" />}
        </span>
      ),
      onClick: () => {
        navigate('/app/profile/mfa');
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
    <Dropdown menu={{ items }} trigger={['click']} placement="topRight">
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        data-testid={dataTestId}
        className="flex w-full h-12 items-center gap-x-4 px-6 py-2 text-sm/6 font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
      >
        <img className="size-8 rounded-full bg-gray-50 dark:bg-gray-800" src={profile.imageUrl} alt={profile.name} />
        <span className="sr-only">Dein Profil</span>
        {!hideText && <span aria-hidden="true">{profile.name}</span>}
      </a>
    </Dropdown>
  );
};

export default UserProfile;
