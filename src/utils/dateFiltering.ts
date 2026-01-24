/**
 * dateFiltering.ts
 * Reusable utilities for filtering reminders by date criteria
 */

import type { Reminder } from '../types/index.js';
import { getTodayStart, getTomorrowStart, getWeekEnd } from './dateUtils.js';
import { parseReminderDueDate } from './reminderDateParser.js';
import { hasAllTags } from './tagUtils.js';

/**
 * Date range filters for reminders
 */
export type DateFilter =
  | 'today'
  | 'tomorrow'
  | 'this-week'
  | 'overdue'
  | 'no-date';

/**
 * Date range boundaries
 */
interface DateBoundaries {
  today: Date;
  tomorrow: Date;
  dayAfterTomorrow: Date;
  weekEnd: Date;
}

/**
 * Creates standardized date boundaries for filtering operations
 */
function createDateBoundaries(): DateBoundaries {
  const today = getTodayStart();
  const tomorrow = getTomorrowStart();
  const dayAfterTomorrow = getTomorrowStart();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  const weekEnd = getWeekEnd();

  return { today, tomorrow, dayAfterTomorrow, weekEnd };
}

/**
 * Filters reminders based on due date criteria
 */
function filterRemindersByDate(
  reminders: Reminder[],
  filter: DateFilter,
): Reminder[] {
  if (filter === 'no-date') {
    return reminders.filter((reminder) => !reminder.dueDate);
  }

  const { today, tomorrow, dayAfterTomorrow, weekEnd } = createDateBoundaries();

  return reminders.filter((reminder) => {
    if (!reminder.dueDate) return false;

    const dueDate = parseReminderDueDate(reminder.dueDate);
    if (!dueDate) return false;

    switch (filter) {
      case 'overdue':
        return dueDate < today;

      case 'today':
        return dueDate >= today && dueDate < tomorrow;

      case 'tomorrow':
        return dueDate >= tomorrow && dueDate < dayAfterTomorrow;

      case 'this-week':
        return dueDate >= today && dueDate <= weekEnd;

      default:
        return true;
    }
  });
}

/**
 * Priority filter values (string names that map to EventKit integers)
 */
export type PriorityFilter = 'high' | 'medium' | 'low' | 'none';

/**
 * Maps priority filter strings to EventKit integer values
 */
const PRIORITY_FILTER_MAP: Record<PriorityFilter, number> = {
  none: 0,
  high: 1,
  medium: 5,
  low: 9,
};

/**
 * Filters for reminder search operations
 */
export interface ReminderFilters {
  showCompleted?: boolean;
  search?: string;
  dueWithin?: DateFilter;
  list?: string;
  priority?: PriorityFilter;
  flagged?: boolean;
  recurring?: boolean;
  locationBased?: boolean;
  tags?: string[];
}

/**
 * Applies multiple filters to a list of reminders
 */
export function applyReminderFilters(
  reminders: Reminder[],
  filters: ReminderFilters,
): Reminder[] {
  let filteredReminders = [...reminders];

  // Filter by completion status
  if (filters.showCompleted !== undefined) {
    filteredReminders = filteredReminders.filter(
      (reminder) => filters.showCompleted || !reminder.isCompleted,
    );
  }

  // Filter by list
  if (filters.list) {
    filteredReminders = filteredReminders.filter(
      (reminder) => reminder.list === filters.list,
    );
  }

  // Filter by search term
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredReminders = filteredReminders.filter(
      (reminder) =>
        reminder.title.toLowerCase().includes(searchLower) ||
        reminder.notes?.toLowerCase().includes(searchLower),
    );
  }

  // Filter by due date
  if (filters.dueWithin) {
    filteredReminders = filterRemindersByDate(
      filteredReminders,
      filters.dueWithin,
    );
  }

  // Filter by priority
  if (filters.priority) {
    const priorityValue = PRIORITY_FILTER_MAP[filters.priority];
    filteredReminders = filteredReminders.filter(
      (reminder) => reminder.priority === priorityValue,
    );
  }

  // Filter by flagged status
  if (filters.flagged !== undefined && filters.flagged) {
    filteredReminders = filteredReminders.filter(
      (reminder) => reminder.isFlagged === true,
    );
  }

  // Filter by recurring status
  if (filters.recurring !== undefined && filters.recurring) {
    filteredReminders = filteredReminders.filter(
      (reminder) => reminder.recurrence !== undefined,
    );
  }

  // Filter by location-based status
  if (filters.locationBased !== undefined && filters.locationBased) {
    filteredReminders = filteredReminders.filter(
      (reminder) => reminder.locationTrigger !== undefined,
    );
  }

  // Filter by tags (must have ALL specified tags)
  if (filters.tags && filters.tags.length > 0) {
    const { tags } = filters;
    filteredReminders = filteredReminders.filter((reminder) =>
      hasAllTags(reminder.tags, tags),
    );
  }

  return filteredReminders;
}
