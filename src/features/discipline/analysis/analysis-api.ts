import { useQuery } from '@tanstack/react-query';

import type { LogRecord, TaskRecord } from '@/features/discipline/analysis/analysis-logic';
import { useAuth } from '@/features/auth/auth-context';
import { supabase } from '@/lib/supabase';

// Check-ins and task changes refresh this key, so Analysis is never out of date.
export const ANALYSIS_KEY = ['analysis'];

// Newest check-ins first, so the recent days are always complete even for a long history.
const MAX_LOGS = 2000;

// Everything Analysis needs: all tasks (including deleted ones, whose history still counts) and all check-ins.
export function useAnalysisData() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...ANALYSIS_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<{ tasks: TaskRecord[]; logs: LogRecord[] }> => {
      const [tasks, logs] = await Promise.all([
        supabase.from('disciplines').select('id, title, is_active, created_at, archived_at'),
        supabase
          .from('discipline_logs')
          .select('discipline_id, completed_date')
          .order('completed_date', { ascending: false })
          .limit(MAX_LOGS),
      ]);
      if (tasks.error) {
        throw tasks.error;
      }
      if (logs.error) {
        throw logs.error;
      }
      return { tasks: (tasks.data ?? []) as TaskRecord[], logs: (logs.data ?? []) as LogRecord[] };
    },
  });
}
