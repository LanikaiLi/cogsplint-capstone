import { TIME_BLOCKS, type TimeBlock } from '@/features/discipline/shared/time-blocks';

// Pure calculations for the Today tab: no Supabase, no screens. Easy to test.

// Which part of the day it is, from the phone's clock.
export function currentTimeBlock(now: Date): TimeBlock {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// Morning, afternoon and evening follow each other. "Anytime" never runs out.
const DAY_ORDER: TimeBlock[] = ['morning', 'afternoon', 'evening'];

// True when the block is earlier in the day than the current one.
export function isPastBlock(block: TimeBlock, current: TimeBlock): boolean {
  const index = DAY_ORDER.indexOf(block);
  return index !== -1 && index < DAY_ORDER.indexOf(current);
}

// Tasks grouped in display order (Morning, Afternoon, Evening, Anytime). Empty groups are left out.
export function groupByTimeBlock<T extends { time_block: TimeBlock }>(tasks: T[]) {
  return TIME_BLOCKS.map((block) => ({
    value: block.value,
    label: block.label,
    tasks: tasks.filter((task) => task.time_block === block.value),
  })).filter((group) => group.tasks.length > 0);
}

// How many of the given tasks have a check-in.
export function countDone(tasks: { id: string }[], checkIns: { discipline_id: string }[]): number {
  const doneIds = new Set(checkIns.map((log) => log.discipline_id));
  return tasks.filter((task) => doneIds.has(task.id)).length;
}
