import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-context';
import { buildPhotoPath, calculateBalance, earnedByMonth, monthKeyOf } from '@/features/discipline/jar/jar-logic';
import { supabase } from '@/lib/supabase';

export const BALANCE_KEY = ['points-balance'];

// Points balance = points earned from check-ins (in discipline logs table) - points spent on rewards (in rewards table).
// It is never stored: it is added up every time, so it can never get out of step with the records.
export function usePointsBalance() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...BALANCE_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      const [earned, spent] = await Promise.all([
        supabase.from('discipline_logs').select('points_earned'),
        supabase.from('rewards').select('points_spent'),
      ]);
      if (earned.error) {
        throw earned.error;
      }
      if (spent.error) {
        throw spent.error;
      }
      return calculateBalance(earned.data ?? [], spent.data ?? []);
    },
  });
}

// Settings: how many points equal 1 dollar. One row per user, created automatically at sign-up.
const SETTINGS_KEY = ['user-settings'];

export function useExchangeRate() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...SETTINGS_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.from('user_settings').select('exchange_rate').single();
      if (error) {
        throw error;
      }
      return Number(data.exchange_rate);
    },
  });
}

export function useSaveExchangeRate() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (rate: number) => {
      const { error } = await supabase
        .from('user_settings')
        .update({ exchange_rate: rate })
        .eq('user_id', session?.user.id ?? '');
      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

// A reward the user gave themselves.
export type Reward = {
  id: string;
  description: string;
  points_spent: number;
  reflection: string | null;
  // Path of the photo in the private bucket, and a short-lived link to show it.
  photo_path: string | null;
  photo_url: string | null;
  created_at: string;
};

const REWARDS_KEY = ['rewards'];
const PHOTO_BUCKET = 'reward-photos';
const PHOTO_LINK_SECONDS = 60 * 60;

// All rewards, newest first. Photos are private, so each one gets a link that works for an hour.
export function useRewards() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...REWARDS_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<Reward[]> => {
      const { data, error } = await supabase
        .from('rewards')
        .select('id, description, points_spent, reflection, photo_path, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      const rows = data ?? [];

      const paths = rows.map((row) => row.photo_path).filter((path): path is string => !!path);
      const urlByPath = new Map<string, string>();
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, PHOTO_LINK_SECONDS);
        for (const item of signed ?? []) {
          if (item.path && item.signedUrl) {
            urlByPath.set(item.path, item.signedUrl);
          }
        }
      }
      // A missing link only means no thumbnail. The reward itself still shows.
      return rows.map((row) => ({ ...row, photo_url: row.photo_path ? (urlByPath.get(row.photo_path) ?? null) : null }));
    },
  });
}

export type RewardInput = {
  description: string;
  points_spent: number;
  reflection: string | null;
  // Local file picked from the photo library, if the user added one.
  photoUri: string | null;
};

// Spend points on a reward. The balance is added up from the records, so it drops by itself.
// With a photo: upload it first, then save the reward. If saving fails, the photo is removed again.
export function useCreateReward() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: RewardInput) => {
      let photoPath: string | null = null;
      if (input.photoUri) {
        const userId = session?.user.id ?? '';
        photoPath = buildPhotoPath(userId, Date.now(), Math.random().toString(36).slice(2, 8));
        const response = await fetch(input.photoUri);
        const bytes = await response.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(photoPath, bytes, { contentType: 'image/jpeg' });
        if (uploadError) {
          throw uploadError;
        }
      }

      const { error } = await supabase.from('rewards').insert({
        description: input.description,
        points_spent: input.points_spent,
        reflection: input.reflection,
        photo_path: photoPath,
      });
      if (error) {
        if (photoPath) {
          await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REWARDS_KEY });
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
    },
  });
}

// Delete a reward for good, with its photo. The points come back by themselves,
// because the balance is added up from the records.
export function useDeleteReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, photoPath }: { id: string; photoPath: string | null }) => {
      const { error } = await supabase.from('rewards').delete().eq('id', id);
      if (error) {
        throw error;
      }
      if (photoPath) {
        // The reward is already gone. If removing the photo fails, nothing the user sees is wrong.
        await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REWARDS_KEY });
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
    },
  });
}

// Points earned in each month. Used by the chart on Jar.
export const EARNED_KEY = ['points-earned-by-month'];

export function useEarnedByMonth() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...EARNED_KEY, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('discipline_logs').select('completed_date, points_earned');
      if (error) {
        throw error;
      }
      return earnedByMonth(data ?? [], monthKeyOf(new Date().toISOString()));
    },
  });
}
