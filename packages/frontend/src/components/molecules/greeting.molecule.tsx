import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Button, HStack } from '@chakra-ui/react';
import { ColorModeButton } from '@molecules/color-mode-button.molecule.tsx';
import { api } from '@/api/api.ts';
import { QUERY_KEYS } from '@/queryKeys';

export function Greeting() {
  const healthApi = useMemo(() => {
    return api.health();
  }, []);

  const query = useQuery({
    queryKey: QUERY_KEYS.health.health,
    queryFn: () => healthApi.healthControllerCheck(),
  });

  return (
    <>
      <div>Hey Bluelight hub! -- {JSON.stringify(query.data)}</div>
      <HStack>
        <Button>Hello</Button>
        <Button>World</Button>

        <ColorModeButton />
      </HStack>
    </>
  );
}
