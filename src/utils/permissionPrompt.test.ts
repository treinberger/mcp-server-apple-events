/**
 * permissionPrompt.test.ts
 * Tests for AppleScript-based permission prompting
 */

import type { ChildProcess, ExecFileException } from 'node:child_process';
import { execFile } from 'node:child_process';
import {
  hasBeenPrompted,
  resetPromptedDomains,
  triggerPermissionPrompt,
} from './permissionPrompt.js';

type ExecFileCallback =
  | ((
      error: ExecFileException | null,
      stdout: string | Buffer,
      stderr: string | Buffer,
    ) => void)
  | null
  | undefined;

jest.mock('node:child_process');

const mockExecFile = execFile as jest.MockedFunction<typeof execFile>;

describe('permissionPrompt', () => {
  const REMINDERS_COMMAND =
    'osascript -e \'tell application "Reminders" to get the name of every list\'';
  const CALENDARS_COMMAND =
    'osascript -e \'tell application "Calendar" to get the name of every calendar\'';

  beforeEach(() => {
    jest.clearAllMocks();
    resetPromptedDomains();
  });

  describe('triggerPermissionPrompt', () => {
    it('triggers AppleScript for reminders permission', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        callback?: ExecFileCallback,
      ) => {
        callback?.(null, '', '');
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      const result = await triggerPermissionPrompt('reminders');

      expect(mockExecFile).toHaveBeenCalledWith(
        'osascript',
        [
          '-e',
          'with timeout of 120 seconds\ntell application "Reminders" to get the name of every list\nend timeout',
        ],
        expect.any(Function),
      );
      expect(result).toEqual({
        ok: true,
        domain: 'reminders',
        command: REMINDERS_COMMAND,
      });
    });

    it('triggers AppleScript for calendars permission', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        callback?: ExecFileCallback,
      ) => {
        callback?.(null, '', '');
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      const result = await triggerPermissionPrompt('calendars');

      expect(mockExecFile).toHaveBeenCalledWith(
        'osascript',
        [
          '-e',
          'with timeout of 120 seconds\ntell application "Calendar" to get the name of every calendar\nend timeout',
        ],
        expect.any(Function),
      );
      expect(result).toEqual({
        ok: true,
        domain: 'calendars',
        command: CALENDARS_COMMAND,
      });
    });

    it('skips duplicate prompts for the same domain in a session', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        callback?: ExecFileCallback,
      ) => {
        callback?.(null, '', '');
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      const firstResult = await triggerPermissionPrompt('reminders');
      const secondResult = await triggerPermissionPrompt('reminders');
      const thirdResult = await triggerPermissionPrompt('reminders');

      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(firstResult).toEqual(secondResult);
      expect(secondResult).toEqual(thirdResult);
    });

    it('allows prompts for different domains', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        callback?: ExecFileCallback,
      ) => {
        callback?.(null, '', '');
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      await triggerPermissionPrompt('reminders');
      await triggerPermissionPrompt('calendars');

      expect(mockExecFile).toHaveBeenCalledTimes(2);
    });

    it('marks domain as prompted even on AppleScript failure', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        callback?: ExecFileCallback,
      ) => {
        const error = new Error('Permission denied') as ExecFileException;
        callback?.(error, '', '');
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      const result = await triggerPermissionPrompt('reminders');

      expect(hasBeenPrompted('reminders')).toBe(true);
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      expect(result.command).toBe(REMINDERS_COMMAND);
      expect(result.errorMessage).toContain('Permission denied');

      await triggerPermissionPrompt('reminders');
      expect(mockExecFile).toHaveBeenCalledTimes(1);
    });

    it('forces prompt when force=true even if already prompted', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        callback?: ExecFileCallback,
      ) => {
        callback?.(null, '', '');
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      await triggerPermissionPrompt('reminders');
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(hasBeenPrompted('reminders')).toBe(true);

      await triggerPermissionPrompt('reminders');
      expect(mockExecFile).toHaveBeenCalledTimes(1);

      const result = await triggerPermissionPrompt('reminders', true);
      expect(mockExecFile).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        ok: true,
        domain: 'reminders',
        command: REMINDERS_COMMAND,
      });
    });

    it('prevents race condition with concurrent calls to the same domain', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        callback?: ExecFileCallback,
      ) => {
        setTimeout(() => {
          callback?.(null, '', '');
        }, 10);
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      const promises = [
        triggerPermissionPrompt('reminders'),
        triggerPermissionPrompt('reminders'),
        triggerPermissionPrompt('reminders'),
      ];

      await Promise.all(promises);

      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(hasBeenPrompted('reminders')).toBe(true);
    });
  });

  describe('hasBeenPrompted', () => {
    it('returns false for unprompted domain', () => {
      expect(hasBeenPrompted('reminders')).toBe(false);
      expect(hasBeenPrompted('calendars')).toBe(false);
    });

    it('returns true after domain has been prompted', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        callback?: ExecFileCallback,
      ) => {
        callback?.(null, '', '');
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      await triggerPermissionPrompt('reminders');

      expect(hasBeenPrompted('reminders')).toBe(true);
      expect(hasBeenPrompted('calendars')).toBe(false);
    });
  });

  describe('resetPromptedDomains', () => {
    it('clears the prompted domains cache', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        callback?: ExecFileCallback,
      ) => {
        callback?.(null, '', '');
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      await triggerPermissionPrompt('reminders');
      await triggerPermissionPrompt('calendars');

      expect(hasBeenPrompted('reminders')).toBe(true);
      expect(hasBeenPrompted('calendars')).toBe(true);

      resetPromptedDomains();

      expect(hasBeenPrompted('reminders')).toBe(false);
      expect(hasBeenPrompted('calendars')).toBe(false);
    });
  });
});
