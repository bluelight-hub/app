import { useQuery } from '@tanstack/react-query';
import { BackendApi } from '@/api/api.ts';
import { useMemo } from 'react';
import { ModeToggle } from '@/components/mode-toggle.tsx';

export function Greeting() {
  const healthApi = useMemo(() => {
    return new BackendApi().health();
  }, []);

  const query = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.healthControllerCheck(),
  });

  return (
    <>
      <div>Hey Bluelight hub! -- {JSON.stringify(query.data)}</div>
      <ModeToggle />
    </>
  );
}
