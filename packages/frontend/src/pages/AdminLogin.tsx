import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { authActions } from '@/stores/authStore';
import { toaster } from '@/utils/toaster';

export function AdminLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  const [password, setPassword] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Clear API error when password changes
  useEffect(() => {
    if (apiError) {
      setApiError(null);
    }
  }, [password, apiError]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: '/login' });
    }
  }, [user, isLoading, navigate]);

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      return await api.auth().authControllerAdminLogin({
        adminPasswordDto: {
          password,
        },
      });
    },
    onSuccess: async (response) => {
      console.log('Admin-Anmeldung erfolgreich:', response);

      // Speichere den User im Auth Store
      authActions.loginSuccess(response.user); // todo: falscher typ

      // Setze Admin-Authentifizierungsstatus
      authActions.setAdminAuth(true);

      // Invalidiere relevante Queries
      await queryClient.invalidateQueries({ queryKey: ['me'] });

      // Zeige Erfolgs-Toast
      toaster.create({
        title: 'Anmeldung erfolgreich',
        description: 'Sie wurden erfolgreich als Administrator angemeldet.',
        type: 'success',
      });

      // Navigiere zum Admin-Dashboard
      await navigate({ to: '/admin/dashboard' });
    },
    onError: (error: unknown) => {
      // todo: types / unknown?
      console.error('Admin-Anmeldefehler:', error);

      // 401 Unauthorized - Falsche Anmeldedaten
      if (error?.status === 401 || error?.message?.includes('401')) {
        setApiError('Ungültiges Passwort.');
        toaster.create({
          title: 'Login fehlgeschlagen',
          description: 'Ungültiges Passwort.',
          type: 'error',
        });
      }
      // 403 Forbidden - Kein Admin
      else if (error?.status === 403 || error?.message?.includes('403')) {
        setApiError('Sie haben keine Administratorrechte.');
        toaster.create({
          title: 'Zugriff verweigert',
          description: 'Sie haben keine Administratorrechte.',
          type: 'error',
        });
      }
      // Andere Fehler
      else {
        setApiError('Ein unerwarteter Fehler ist aufgetreten.');
        toaster.create({
          title: 'Fehler',
          description: 'Ein unerwarteter Fehler ist aufgetreten.',
          type: 'error',
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loginMutation.mutate(password);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return <div>Laden...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Administrator-Anmeldung</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Geben Sie Ihr Administrator-Passwort ein, um Zugriff auf den Admin-Bereich zu erhalten.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="sr-only">
              Administrator-Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Administrator-Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loginMutation.isPending}
            />
          </div>

          {apiError && <div className="text-red-600 text-sm text-center">{apiError}</div>}

          <div>
            <button
              type="submit"
              disabled={loginMutation.isPending || !password.trim()}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? 'Anmeldung...' : 'Als Administrator anmelden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
