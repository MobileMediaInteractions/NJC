import { useEffect } from 'react';
import { AppState } from 'react-native';
import { reportAudiencePresence } from '@/lib/audience';

type GetToken = () => Promise<string | null>;

export function useAudiencePresence(getToken?: GetToken) {
  useEffect(() => {
    let active = true;
    const report = () => { if (active) void reportAudiencePresence(getToken); };
    report();
    const interval = setInterval(report, 15 * 60 * 1000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') report(); });
    return () => {
      active = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [getToken]);
}
