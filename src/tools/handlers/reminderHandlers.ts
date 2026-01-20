/**
 * handlers/reminderHandlers.ts
 * Handlers for reminder task operations
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  type LocationTrigger,
  PRIORITY_LABELS,
  type RecurrenceRule,
  type RemindersToolArgs,
} from '../../types/index.js';
import { handleAsyncOperation } from '../../utils/errorHandling.js';
import { formatMultilineNotes } from '../../utils/helpers.js';
import { reminderRepository } from '../../utils/reminderRepository.js';
import {
  CreateReminderSchema,
  DeleteReminderSchema,
  ReadRemindersSchema,
  UpdateReminderSchema,
} from '../../validation/schemas.js';
import {
  extractAndValidateArgs,
  formatDeleteMessage,
  formatListMarkdown,
  formatSuccessMessage,
} from './shared.js';

/**
 * Formats a recurrence rule for display
 */
const formatRecurrence = (recurrence: RecurrenceRule): string => {
  const parts: string[] = [];
  const interval = recurrence.interval > 1 ? `every ${recurrence.interval} ` : '';

  switch (recurrence.frequency) {
    case 'daily':
      parts.push(`${interval}day${recurrence.interval > 1 ? 's' : ''}`);
      break;
    case 'weekly':
      parts.push(`${interval}week${recurrence.interval > 1 ? 's' : ''}`);
      if (recurrence.daysOfWeek?.length) {
        const dayNames = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const days = recurrence.daysOfWeek.map((d) => dayNames[d]).join(', ');
        parts.push(`on ${days}`);
      }
      break;
    case 'monthly':
      parts.push(`${interval}month${recurrence.interval > 1 ? 's' : ''}`);
      if (recurrence.daysOfMonth?.length) {
        parts.push(`on day${recurrence.daysOfMonth.length > 1 ? 's' : ''} ${recurrence.daysOfMonth.join(', ')}`);
      }
      break;
    case 'yearly':
      parts.push(`${interval}year${recurrence.interval > 1 ? 's' : ''}`);
      if (recurrence.monthsOfYear?.length) {
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const months = recurrence.monthsOfYear.map((m) => monthNames[m]).join(', ');
        parts.push(`in ${months}`);
      }
      break;
  }

  if (recurrence.endDate) {
    parts.push(`until ${recurrence.endDate}`);
  } else if (recurrence.occurrenceCount) {
    parts.push(`(${recurrence.occurrenceCount} times)`);
  }

  return parts.join(' ');
};

/**
 * Formats a location trigger for display
 */
const formatLocationTrigger = (location: LocationTrigger): string => {
  const proximityText = location.proximity === 'enter' ? 'Arriving at' : 'Leaving';
  const radiusText = location.radius ? ` (${location.radius}m radius)` : '';
  return `${proximityText} "${location.title}"${radiusText}`;
};

const formatReminderMarkdown = (reminder: {
  title: string;
  isCompleted: boolean;
  list?: string;
  id?: string;
  notes?: string;
  dueDate?: string;
  url?: string;
  priority?: number;
  isFlagged?: boolean;
  recurrence?: RecurrenceRule;
  locationTrigger?: LocationTrigger;
}): string[] => {
  const lines: string[] = [];
  const checkbox = reminder.isCompleted ? '[x]' : '[ ]';
  const flagIcon = reminder.isFlagged ? ' 🚩' : '';
  const repeatIcon = reminder.recurrence ? ' 🔄' : '';
  const locationIcon = reminder.locationTrigger ? ' 📍' : '';
  lines.push(`- ${checkbox} ${reminder.title}${flagIcon}${repeatIcon}${locationIcon}`);
  if (reminder.list) lines.push(`  - List: ${reminder.list}`);
  if (reminder.id) lines.push(`  - ID: ${reminder.id}`);
  if (reminder.priority !== undefined && reminder.priority > 0) {
    const priorityLabel = PRIORITY_LABELS[reminder.priority] || 'unknown';
    lines.push(`  - Priority: ${priorityLabel}`);
  }
  if (reminder.recurrence) {
    lines.push(`  - Repeats: ${formatRecurrence(reminder.recurrence)}`);
  }
  if (reminder.locationTrigger) {
    lines.push(`  - Location: ${formatLocationTrigger(reminder.locationTrigger)}`);
  }
  if (reminder.notes)
    lines.push(`  - Notes: ${formatMultilineNotes(reminder.notes)}`);
  if (reminder.dueDate) lines.push(`  - Due: ${reminder.dueDate}`);
  if (reminder.url) lines.push(`  - URL: ${reminder.url}`);
  return lines;
};

export const handleCreateReminder = async (
  args: RemindersToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(args, CreateReminderSchema);
    const reminder = await reminderRepository.createReminder({
      title: validatedArgs.title,
      notes: validatedArgs.note,
      url: validatedArgs.url,
      list: validatedArgs.targetList,
      dueDate: validatedArgs.dueDate,
      priority: validatedArgs.priority,
      isFlagged: validatedArgs.flagged,
      recurrence: validatedArgs.recurrence,
      locationTrigger: validatedArgs.locationTrigger,
    });
    return formatSuccessMessage(
      'created',
      'reminder',
      reminder.title,
      reminder.id,
    );
  }, 'create reminder');
};

export const handleUpdateReminder = async (
  args: RemindersToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(args, UpdateReminderSchema);
    const reminder = await reminderRepository.updateReminder({
      id: validatedArgs.id,
      newTitle: validatedArgs.title,
      notes: validatedArgs.note,
      url: validatedArgs.url,
      isCompleted: validatedArgs.completed,
      list: validatedArgs.targetList,
      dueDate: validatedArgs.dueDate,
      priority: validatedArgs.priority,
      isFlagged: validatedArgs.flagged,
      recurrence: validatedArgs.recurrence,
      clearRecurrence: validatedArgs.clearRecurrence,
      locationTrigger: validatedArgs.locationTrigger,
      clearLocationTrigger: validatedArgs.clearLocationTrigger,
    });
    return formatSuccessMessage(
      'updated',
      'reminder',
      reminder.title,
      reminder.id,
    );
  }, 'update reminder');
};

export const handleDeleteReminder = async (
  args: RemindersToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(args, DeleteReminderSchema);
    await reminderRepository.deleteReminder(validatedArgs.id);
    return formatDeleteMessage('reminder', validatedArgs.id, {
      useQuotes: false,
      useIdPrefix: true,
      usePeriod: false,
    });
  }, 'delete reminder');
};

export const handleReadReminders = async (
  args: RemindersToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(args, ReadRemindersSchema);

    // Check if id is provided in args (before validation)
    // because id might be filtered out by schema validation if it's optional
    if (args.id) {
      const reminder = await reminderRepository.findReminderById(args.id);
      const markdownLines: string[] = [
        '### Reminder',
        '',
        ...formatReminderMarkdown(reminder),
      ];
      return markdownLines.join('\n');
    }

    // Otherwise, return all matching reminders
    const reminders = await reminderRepository.findReminders({
      list: validatedArgs.filterList,
      showCompleted: validatedArgs.showCompleted,
      search: validatedArgs.search,
      dueWithin: validatedArgs.dueWithin,
      priority: validatedArgs.filterPriority,
      flagged: validatedArgs.filterFlagged,
      recurring: validatedArgs.filterRecurring,
      locationBased: validatedArgs.filterLocationBased,
    });

    return formatListMarkdown(
      'Reminders',
      reminders,
      formatReminderMarkdown,
      'No reminders found matching the criteria.',
    );
  }, 'read reminders');
};
