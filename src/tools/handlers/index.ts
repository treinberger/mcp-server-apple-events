/**
 * handlers/index.ts
 * Unified exports for all tool handlers
 */

export {
  handleCreateCalendarEvent,
  handleDeleteCalendarEvent,
  handleReadCalendarEvents,
  handleReadCalendars,
  handleUpdateCalendarEvent,
} from './calendarHandlers.js';

export {
  handleCreateReminderList,
  handleDeleteReminderList,
  handleReadReminderLists,
  handleUpdateReminderList,
} from './listHandlers.js';
export {
  handleCreateReminder,
  handleDeleteReminder,
  handleReadReminders,
  handleUpdateReminder,
} from './reminderHandlers.js';

export {
  handleCreateSubtask,
  handleDeleteSubtask,
  handleReadSubtasks,
  handleReorderSubtasks,
  handleToggleSubtask,
  handleUpdateSubtask,
} from './subtaskHandlers.js';
