import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ANALYSIS_KEY } from '@/features/discipline/analysis/analysis-api';
import { DISCIPLINES_KEY } from '@/features/discipline/shared/task-read-api';
import type { TimeBlock } from '@/features/discipline/shared/time-blocks';
import { supabase } from '@/lib/supabase';

// What the Manage form sends when saving a task.
export type DisciplineInput = {
  title: string;
  points: number;
  time_block: TimeBlock;
};

// Create a task (no id) or update an existing one (with id).
export function useSaveDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: DisciplineInput }) => {
      const { error } = id
        ? await supabase.from('disciplines').update(input).eq('id', id)
        : await supabase.from('disciplines').insert(input);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISCIPLINES_KEY });
      queryClient.invalidateQueries({ queryKey: ANALYSIS_KEY });
    },
  });
}

// "Delete" for the user. The task is hidden (is_active = false), never removed,
// so past check-ins and points stay in the history.
export function useDeleteDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('disciplines').update({ is_active: false }).eq('id', id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISCIPLINES_KEY });
      queryClient.invalidateQueries({ queryKey: ANALYSIS_KEY });
    },
  });
}
