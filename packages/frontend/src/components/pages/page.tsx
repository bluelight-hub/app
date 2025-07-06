import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';

const IndexPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigate('/app');
      } else {
        navigate('/login');
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen">
        <p>Lädt...</p>
      </div>
    );
  }

  // This should not be visible as we redirect immediately
  return null;
};

export default IndexPage;
