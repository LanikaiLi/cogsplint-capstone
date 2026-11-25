import { useQuery } from '@tanstack/react-query';

import type { TimeBlock } from '@/features/discipline/shared/time-blocks';
import { useAuth } from '@/features/auth/auth-context';
import { supabase } from '@/lib/supabase';

// A "discipline" is a daily task. Manage and Today read from the same list.
export type Discipline = {
  id: string;
  title: string;
  points: number;
  time_block: TimeBlock;
  created_at: string;
};

const COLUMNS = 'id, title, points, time_block, created_at';

// Everything that changes tasks refreshes this key, so Manage and Today stay in sync.
export const DISCIPLINES_KEY = ['disciplines'];

// All tasks the user still has (deleted tasks are hidden, but their history stays).
export function useDisciplines() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    // The user id is part of the key so one user never sees another user's cached list.
    queryKey: [...DISCIPLINES_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<Discipline[]> => {
      const { data, error } = await supabase
        .from('disciplines')
        .select(COLUMNS)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? []) as Discipline[];
    },
  });
}
