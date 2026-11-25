import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-context';
import { ANALYSIS_KEY } from '@/features/discipline/analysis/analysis-api';
import { BALANCE_KEY, EARNED_KEY } from '@/features/discipline/jar/jar-api';
import { supabase } from '@/lib/supabase';

// One check-in: "this task was done on this day".
export type CheckIn = {
  id: string;
  discipline_id: string;
  completed_date: string;
  // Points this check-in earned (copied from the task when it was checked off).
  points_earned: number;
};

const LOGS_KEY = ['discipline-logs'];

// The check-ins for one day. Tomorrow the date changes, so every task shows as not done again.
export function useCheckIns(date: string) {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...LOGS_KEY, userId, date],
    enabled: !!userId,
    queryFn: async (): Promise<CheckIn[]> => {
      const { data, error } = await supabase
        .from('discipline_logs')
        .select('id, discipline_id, completed_date, points_earned')
        .eq('completed_date', date);
      if (error) {
        throw error;
      }
      return (data ?? []) as CheckIn[];
    },
  });
}

// Tap a task: mark it done for the day, or undo if it is already done.
// The screen updates right away; if saving fails, it goes back to the real state.
export function useToggleCheckIn(date: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const key = [...LOGS_KEY, session?.user.id, date];

  return useMutation({
    mutationFn: async ({
      disciplineId,
      existing,
    }: {
      disciplineId: string;
      existing?: CheckIn;
      // Points of the task, only used to fill the screen while saving.
      points: number;
    }) => {
      if (existing) {
        // Undo: delete the check-in row.
        const { error } = await supabase.from('discipline_logs').delete().eq('id', existing.id);
        if (error) {
          throw error;
        }
        return;
      }
      // Done: the database copies the task's title, time block and current points into the row.
      const { error } = await supabase
        .from('discipline_logs')
        .insert({ discipline_id: disciplineId, completed_date: date });
      if (error) {
        throw error;
      }
    },
    onMutate: async ({ disciplineId, existing, points }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CheckIn[]>(key) ?? [];
      const next = existing
        ? previous.filter((log) => log.id !== existing.id)
        : [...previous, { id: `pending-${disciplineId}`, discipline_id: disciplineId, completed_date: date, points_earned: points }];
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
      queryClient.invalidateQueries({ queryKey: EARNED_KEY });
      queryClient.invalidateQueries({ queryKey: ANALYSIS_KEY });
    },
  });
}
