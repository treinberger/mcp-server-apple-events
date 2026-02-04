/**
 * calendarRepository.ts
 * Repository pattern implementation for calendar event data access operations using EventKitCLI.
 */

import type { Calendar, CalendarEvent } from '../types/index.js';
import type {
  CalendarJSON,
  CreateEventData,
  EventJSON,
  EventsReadResult,
  UpdateEventData,
} from '../types/repository.js';
import { executeCli } from './cliExecutor.js';
import {
  addOptionalArg,
  addOptionalBooleanArg,
  addOptionalJsonArg,
  nullToUndefined,
} from './helpers.js';

class CalendarRepository {
  private async readEvents(
    startDate?: string,
    endDate?: string,
    calendarName?: string,
    search?: string,
  ): Promise<EventsReadResult> {
    const args = ['--action', 'read-events'];
    addOptionalArg(args, '--startDate', startDate);
    addOptionalArg(args, '--endDate', endDate);
    addOptionalArg(args, '--filterCalendar', calendarName);
    addOptionalArg(args, '--search', search);

    return executeCli<EventsReadResult>(args);
  }

  async findEventById(id: string): Promise<CalendarEvent> {
    const { events } = await this.readEvents();
    const event = events.find((e) => e.id === id);
    if (!event) {
      throw new Error(`Event with ID '${id}' not found.`);
    }
    return nullToUndefined(event, [
      'notes',
      'location',
      'structuredLocation',
      'url',
      'availability',
      'alarms',
      'recurrenceRules',
      'organizer',
      'attendees',
      'status',
      'isDetached',
      'occurrenceDate',
      'creationDate',
      'lastModifiedDate',
      'externalId',
    ]) as CalendarEvent;
  }

  async findEvents(
    filters: {
      startDate?: string;
      endDate?: string;
      calendarName?: string;
      search?: string;
      availability?: string;
    } = {},
  ): Promise<CalendarEvent[]> {
    const { events } = await this.readEvents(
      filters.startDate,
      filters.endDate,
      filters.calendarName,
      filters.search,
    );
    const normalized = events.map((e) =>
      nullToUndefined(e, [
        'notes',
        'location',
        'structuredLocation',
        'url',
        'availability',
        'alarms',
        'recurrenceRules',
        'organizer',
        'attendees',
        'status',
        'isDetached',
        'occurrenceDate',
        'creationDate',
        'lastModifiedDate',
        'externalId',
      ]),
    ) as CalendarEvent[];

    if (filters.availability) {
      return normalized.filter(
        (event) => event.availability === filters.availability,
      );
    }

    return normalized;
  }

  async findAllCalendars(): Promise<Calendar[]> {
    return executeCli<CalendarJSON[]>(['--action', 'read-calendars']);
  }

  async createEvent(data: CreateEventData): Promise<EventJSON> {
    const args = [
      '--action',
      'create-event',
      '--title',
      data.title,
      '--startDate',
      data.startDate,
      '--endDate',
      data.endDate,
    ];
    addOptionalArg(args, '--targetCalendar', data.calendar);
    addOptionalArg(args, '--note', data.notes);
    addOptionalArg(args, '--location', data.location);
    addOptionalJsonArg(args, '--structuredLocation', data.structuredLocation);
    addOptionalArg(args, '--url', data.url);
    addOptionalBooleanArg(args, '--isAllDay', data.isAllDay);
    addOptionalArg(args, '--availability', data.availability);
    addOptionalJsonArg(args, '--alarms', data.alarms);
    addOptionalJsonArg(args, '--recurrenceRules', data.recurrenceRules);

    return executeCli<EventJSON>(args);
  }

  async updateEvent(data: UpdateEventData): Promise<EventJSON> {
    const args = ['--action', 'update-event', '--id', data.id];
    addOptionalArg(args, '--title', data.title);
    addOptionalArg(args, '--targetCalendar', data.calendar);
    addOptionalArg(args, '--startDate', data.startDate);
    addOptionalArg(args, '--endDate', data.endDate);
    addOptionalArg(args, '--note', data.notes);
    addOptionalArg(args, '--location', data.location);
    if (data.structuredLocation === null) {
      args.push('--structuredLocation', '');
    } else {
      addOptionalJsonArg(args, '--structuredLocation', data.structuredLocation);
    }
    addOptionalArg(args, '--url', data.url);
    addOptionalBooleanArg(args, '--isAllDay', data.isAllDay);
    addOptionalArg(args, '--availability', data.availability);
    addOptionalJsonArg(args, '--alarms', data.alarms);
    addOptionalBooleanArg(args, '--clearAlarms', data.clearAlarms);
    addOptionalJsonArg(args, '--recurrenceRules', data.recurrenceRules);
    addOptionalBooleanArg(args, '--clearRecurrence', data.clearRecurrence);
    addOptionalArg(args, '--span', data.span);

    return executeCli<EventJSON>(args);
  }

  async deleteEvent(id: string, span?: string): Promise<void> {
    const args = ['--action', 'delete-event', '--id', id];
    addOptionalArg(args, '--span', span);
    await executeCli<unknown>(args);
  }
}

export const calendarRepository = new CalendarRepository();
