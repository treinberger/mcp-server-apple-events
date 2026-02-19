/**
 * applescriptList.test.ts
 * Tests for AppleScript utility functions for reminder list emblem operations
 */

import {
  formatListDisplay,
  getListEmblem,
  getListEmblems,
  setListEmblem,
} from './applescriptList.js';

jest.mock('./cliExecutor.js');

import { escapeAppleScriptString, runAppleScript } from './cliExecutor.js';

const mockRunAppleScript = runAppleScript as jest.MockedFunction<
  typeof runAppleScript
>;
const mockEscapeAppleScriptString =
  escapeAppleScriptString as jest.MockedFunction<
    typeof escapeAppleScriptString
  >;
const RECORD_SEPARATOR = String.fromCharCode(30);
const FIELD_SEPARATOR = String.fromCharCode(31);

describe('applescriptList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEscapeAppleScriptString.mockImplementation((value: string) => value);
  });

  describe('formatListDisplay', () => {
    it('formats title only', () => {
      expect(formatListDisplay('Shopping')).toBe('Shopping');
    });

    it('formats title with emblem', () => {
      expect(formatListDisplay('Shopping', '🛒')).toBe('🛒 Shopping');
    });

    it('formats title with color', () => {
      expect(formatListDisplay('Shopping', undefined, '#007AFF')).toBe(
        'Shopping [#007AFF]',
      );
    });

    it('formats title with both emblem and color', () => {
      expect(formatListDisplay('Shopping', '🛒', '#007AFF')).toBe(
        '🛒 Shopping [#007AFF]',
      );
    });
  });

  describe('getListEmblem', () => {
    it('returns emblem when found', async () => {
      mockRunAppleScript.mockResolvedValueOnce('🛒');

      const result = await getListEmblem('Shopping');

      expect(result).toBe('🛒');
      expect(mockRunAppleScript).toHaveBeenCalledTimes(1);
    });

    it('returns undefined for empty result', async () => {
      mockRunAppleScript.mockResolvedValueOnce('');

      const result = await getListEmblem('No Emblem List');

      expect(result).toBeUndefined();
    });

    it('trims whitespace from result', async () => {
      mockRunAppleScript.mockResolvedValueOnce('  🛒  ');

      const result = await getListEmblem('Shopping');

      expect(result).toBe('🛒');
    });

    it('returns undefined when script throws error', async () => {
      mockRunAppleScript.mockRejectedValueOnce(new Error('List not found'));

      const result = await getListEmblem('Non-existent List');

      expect(result).toBeUndefined();
    });

    it('escapes list title before interpolation', async () => {
      mockRunAppleScript.mockResolvedValueOnce('🛒');
      mockEscapeAppleScriptString.mockImplementation((value) =>
        value.replace(/\\/g, '\\\\').replace(/"/g, '\\"'),
      );

      await getListEmblem('List with "quotes"');

      expect(mockEscapeAppleScriptString).toHaveBeenCalledWith(
        'List with "quotes"',
      );
    });
  });

  describe('setListEmblem', () => {
    it('sets emblem successfully', async () => {
      mockRunAppleScript.mockResolvedValue('');

      await setListEmblem('Shopping', '🛒');

      expect(mockRunAppleScript).toHaveBeenCalledTimes(1);
      expect(mockEscapeAppleScriptString).toHaveBeenCalledWith('Shopping');
      expect(mockEscapeAppleScriptString).toHaveBeenCalledWith('🛒');
    });

    it('propagates errors from runAppleScript', async () => {
      mockRunAppleScript.mockRejectedValue(new Error('List not found'));

      await expect(setListEmblem('Non-existent', '🛒')).rejects.toThrow(
        'List not found',
      );
    });

    it('escapes list title and emblem before interpolation', async () => {
      mockRunAppleScript.mockResolvedValue('');
      mockEscapeAppleScriptString.mockImplementation((value) =>
        value.replace(/\\/g, '\\\\').replace(/"/g, '\\"'),
      );

      await setListEmblem('List with "quotes"', 'emoji "test"');

      expect(mockEscapeAppleScriptString).toHaveBeenCalledWith(
        'List with "quotes"',
      );
      expect(mockEscapeAppleScriptString).toHaveBeenCalledWith('emoji "test"');
    });
  });

  describe('getListEmblems', () => {
    it('returns empty map for empty input', async () => {
      mockRunAppleScript.mockResolvedValueOnce('');

      const result = await getListEmblems([]);

      expect(result.size).toBe(0);
      expect(mockRunAppleScript).toHaveBeenCalledTimes(1);
    });

    it('uses batch AppleScript for multiple lists', async () => {
      mockRunAppleScript.mockResolvedValueOnce(
        `Shopping${FIELD_SEPARATOR}🛒${RECORD_SEPARATOR}Tasks${FIELD_SEPARATOR}📝`,
      );

      const result = await getListEmblems(['Shopping', 'Tasks']);

      expect(result.get('Shopping')).toBe('🛒');
      expect(result.get('Tasks')).toBe('📝');
      expect(mockRunAppleScript).toHaveBeenCalledTimes(1);
    });

    it('falls back to per-list lookup on batch error', async () => {
      mockRunAppleScript
        .mockRejectedValueOnce(new Error('Batch query failed'))
        .mockResolvedValueOnce('🛒')
        .mockResolvedValueOnce('📝');

      const result = await getListEmblems(['Shopping', 'Tasks']);

      expect(result.get('Shopping')).toBe('🛒');
      expect(result.get('Tasks')).toBe('📝');
      expect(mockRunAppleScript).toHaveBeenCalledTimes(3);
    });

    it('handles missing emblems in batch response', async () => {
      mockRunAppleScript.mockResolvedValueOnce(
        `Shopping${FIELD_SEPARATOR}🛒${RECORD_SEPARATOR}No Emblem${FIELD_SEPARATOR}${RECORD_SEPARATOR}Tasks${FIELD_SEPARATOR}📝`,
      );

      const result = await getListEmblems(['Shopping', 'No Emblem', 'Tasks']);

      expect(result.get('Shopping')).toBe('🛒');
      expect(result.get('No Emblem')).toBeUndefined();
      expect(result.get('Tasks')).toBe('📝');
    });

    it('handles single list', async () => {
      mockRunAppleScript.mockResolvedValueOnce(`Shopping${FIELD_SEPARATOR}🛒`);

      const result = await getListEmblems(['Shopping']);

      expect(result.get('Shopping')).toBe('🛒');
      expect(mockRunAppleScript).toHaveBeenCalledTimes(1);
    });

    it('parses list names containing newlines and tabs without corrupting mapping', async () => {
      const complexTitle = 'My\nList\tA';
      mockRunAppleScript.mockResolvedValueOnce(
        `${complexTitle}${FIELD_SEPARATOR}🧪${RECORD_SEPARATOR}Tasks${FIELD_SEPARATOR}📝`,
      );

      const result = await getListEmblems([complexTitle, 'Tasks']);

      expect(result.get(complexTitle)).toBe('🧪');
      expect(result.get('Tasks')).toBe('📝');
      expect(mockRunAppleScript).toHaveBeenCalledTimes(1);
    });
  });
});
