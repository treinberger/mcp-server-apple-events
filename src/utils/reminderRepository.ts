/**
 * reminderRepository.ts
 * Repository pattern implementation for reminder data access operations using EventKitCLI.
 */

import type { Reminder, ReminderList } from '../types/index.js';
import type {
  CreateReminderData,
  ListJSON,
  ReminderJSON,
  ReminderReadResult,
  UpdateReminderData,
} from '../types/repository.js';
import { executeCli } from './cliExecutor.js';
import type { ReminderFilters } from './dateFiltering.js';
import { applyReminderFilters } from './dateFiltering.js';
import {
  addOptionalArg,
  addOptionalBooleanArg,
  nullToUndefined,
} from './helpers.js';

class ReminderRepository {
  private mapReminder(reminder: ReminderJSON): Reminder {
    const normalizedReminder = nullToUndefined(reminder, [
      'notes',
      'url',
      'dueDate',
    ]) as Reminder;

    // Pass dueDate as-is from Swift CLI to avoid double timezone conversion
    if (reminder.dueDate) {
      normalizedReminder.dueDate = reminder.dueDate;
    } else {
      delete normalizedReminder.dueDate;
    }

    // Map recurrence from JSON (convert nulls to undefined)
    if (reminder.recurrence) {
      normalizedReminder.recurrence = {
        frequency: reminder.recurrence.frequency,
        interval: reminder.recurrence.interval,
        endDate: reminder.recurrence.endDate ?? undefined,
        occurrenceCount: reminder.recurrence.occurrenceCount ?? undefined,
        daysOfWeek: reminder.recurrence.daysOfWeek ?? undefined,
        daysOfMonth: reminder.recurrence.daysOfMonth ?? undefined,
        monthsOfYear: reminder.recurrence.monthsOfYear ?? undefined,
      };
    }

    // Map location trigger from JSON
    if (reminder.locationTrigger) {
      normalizedReminder.locationTrigger = {
        title: reminder.locationTrigger.title,
        latitude: reminder.locationTrigger.latitude,
        longitude: reminder.locationTrigger.longitude,
        radius: reminder.locationTrigger.radius,
        proximity: reminder.locationTrigger.proximity === 'leave' ? 'leave' : 'enter',
      };
    }

    return normalizedReminder;
  }

  private mapReminders(reminders: ReminderJSON[]): Reminder[] {
    return reminders.map((reminder) => this.mapReminder(reminder));
  }

  private async readAll(): Promise<ReminderReadResult> {
    return executeCli<ReminderReadResult>([
      '--action',
      'read',
      '--showCompleted',
      'true',
    ]);
  }

  async findReminderById(id: string): Promise<Reminder> {
    const { reminders } = await this.readAll();
    const reminder = this.mapReminders(reminders).find((r) => r.id === id);
    if (!reminder) {
      throw new Error(`Reminder with ID '${id}' not found.`);
    }
    return reminder;
  }

  async findReminders(filters: ReminderFilters = {}): Promise<Reminder[]> {
    const { reminders } = await this.readAll();
    const normalizedReminders = this.mapReminders(reminders);
    return applyReminderFilters(normalizedReminders, filters);
  }

  async findAllLists(): Promise<ReminderList[]> {
    const { lists } = await this.readAll();
    return lists;
  }

  async createReminder(data: CreateReminderData): Promise<ReminderJSON> {
    const args = ['--action', 'create', '--title', data.title];
    addOptionalArg(args, '--targetList', data.list);
    addOptionalArg(args, '--note', data.notes);
    addOptionalArg(args, '--url', data.url);
    addOptionalArg(args, '--dueDate', data.dueDate);
    if (data.priority !== undefined) {
      args.push('--priority', String(data.priority));
    }
    addOptionalBooleanArg(args, '--isFlagged', data.isFlagged);
    if (data.recurrence) {
      args.push('--recurrence', JSON.stringify(data.recurrence));
    }
    if (data.locationTrigger) {
      args.push('--locationTrigger', JSON.stringify(data.locationTrigger));
    }

    return executeCli<ReminderJSON>(args);
  }

  async updateReminder(data: UpdateReminderData): Promise<ReminderJSON> {
    const args = ['--action', 'update', '--id', data.id];
    addOptionalArg(args, '--title', data.newTitle);
    addOptionalArg(args, '--targetList', data.list);
    addOptionalArg(args, '--note', data.notes);
    addOptionalArg(args, '--url', data.url);
    addOptionalArg(args, '--dueDate', data.dueDate);
    addOptionalBooleanArg(args, '--isCompleted', data.isCompleted);
    if (data.priority !== undefined) {
      args.push('--priority', String(data.priority));
    }
    addOptionalBooleanArg(args, '--isFlagged', data.isFlagged);
    if (data.recurrence) {
      args.push('--recurrence', JSON.stringify(data.recurrence));
    }
    addOptionalBooleanArg(args, '--clearRecurrence', data.clearRecurrence);
    if (data.locationTrigger) {
      args.push('--locationTrigger', JSON.stringify(data.locationTrigger));
    }
    addOptionalBooleanArg(args, '--clearLocationTrigger', data.clearLocationTrigger);

    return executeCli<ReminderJSON>(args);
  }

  async deleteReminder(id: string): Promise<void> {
    await executeCli<unknown>(['--action', 'delete', '--id', id]);
  }

  async createReminderList(name: string): Promise<ListJSON> {
    return executeCli<ListJSON>(['--action', 'create-list', '--name', name]);
  }

  async updateReminderList(
    currentName: string,
    newName: string,
  ): Promise<ListJSON> {
    return executeCli<ListJSON>([
      '--action',
      'update-list',
      '--name',
      currentName,
      '--newName',
      newName,
    ]);
  }

  async deleteReminderList(name: string): Promise<void> {
    await executeCli<unknown>(['--action', 'delete-list', '--name', name]);
  }
}

export const reminderRepository = new ReminderRepository();
