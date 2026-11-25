// The four parts of the day a task can belong to. Values match the database check constraint.
export const TIME_BLOCKS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'anytime', label: 'Anytime' },
] as const;

export type TimeBlock = (typeof TIME_BLOCKS)[number]['value'];
