import { serverStore } from '@/features/server/stores/server.store';
import { useStore } from '@tanstack/react-store';
import { einsatzStore } from '../stores/active-einsatz.store';

export function useResumeEinsatzContext() {
  const currentServerId = useStore(serverStore, (state) => state.activeServerId);

  return useStore(einsatzStore, (state) => {
    const isCurrentServerContext = state.runtimeServerId === currentServerId;

    return {
      activeEinsatz: isCurrentServerContext ? state.activeEinsatz : null,
      resumeStatus: isCurrentServerContext ? state.resumeStatus : 'idle',
      resumeReason: isCurrentServerContext ? state.resumeReason : null,
    };
  });
}
