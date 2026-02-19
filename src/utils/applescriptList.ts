/**
 * applescriptList.ts
 * AppleScript utility functions for reminder list emblem operations
 */

import { escapeAppleScriptString, runAppleScript } from './cliExecutor.js';

const RECORD_SEPARATOR = String.fromCharCode(30);
const FIELD_SEPARATOR = String.fromCharCode(31);

/**
 * Gets the emblem (icon) for a reminder list
 * @param listTitle - The title of the reminder list
 * @returns The emblem emoji or undefined if not found
 */
export async function getListEmblem(
  listTitle: string,
): Promise<string | undefined> {
  const escapedTitle = escapeAppleScriptString(listTitle);
  const script = `
    tell application "Reminders"
      try
        set theList to list "${escapedTitle}"
        if emblem of theList is not missing value then
          return emblem of theList
        else
          return ""
        end if
      on error
        return ""
      end try
    end tell
  `;

  try {
    const result = await runAppleScript(script);
    return result.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sets the emblem (icon) for a reminder list
 * @param listTitle - The title of the reminder list
 * @param emblem - The emoji to set as the emblem
 */
export async function setListEmblem(
  listTitle: string,
  emblem: string,
): Promise<void> {
  const escapedTitle = escapeAppleScriptString(listTitle);
  const escapedEmblem = escapeAppleScriptString(emblem);
  const script = `
    tell application "Reminders"
      try
        set theList to list "${escapedTitle}"
        set emblem of theList to "${escapedEmblem}"
      on error errorMessage
        error errorMessage
      end try
    end tell
  `;

  await runAppleScript(script);
}

/**
 * Formats a list display string with emoji and color
 * @param title - The list title
 * @param emblem - The emblem emoji (optional)
 * @param color - The color hex code (optional)
 * @returns Formatted display string
 */
export function formatListDisplay(
  title: string,
  emblem?: string,
  color?: string,
): string {
  let display = '';
  if (emblem) display += `${emblem} `;
  display += title;
  if (color) display += ` [${color}]`;
  return display;
}

/**
 * Gets emblems for multiple lists in parallel
 * @param listTitles - Array of list titles
 * @returns Map of list titles to their emblems
 */
export async function getListEmblems(
  listTitles: string[],
): Promise<Map<string, string | undefined>> {
  // Try batch lookup first - get all emblems in a single AppleScript call
  try {
    const script = `
      tell application "Reminders"
        set allLists to every list
        set resultText to ""
        set fieldSeparator to (ASCII character 31)
        set recordSeparator to (ASCII character 30)
        repeat with i from 1 to count of allLists
          set currentList to item i of allLists
          set listName to name of currentList
          set listEmblem to emblem of currentList
          if listEmblem is missing value then
            set listEmblem to ""
          end if
          if i is 1 then
            set resultText to listName & fieldSeparator & listEmblem
          else
            set resultText to resultText & recordSeparator & listName & fieldSeparator & listEmblem
          end if
        end repeat
        return resultText
      end tell
    `;

    const result = await runAppleScript(script);
    const emblemMap = new Map<string, string | undefined>();
    const records = result
      .split(RECORD_SEPARATOR)
      .map((record) => record.trim())
      .filter((record) => record.length > 0);

    for (const record of records) {
      const separatorIndex = record.indexOf(FIELD_SEPARATOR);
      if (separatorIndex < 0) {
        continue;
      }

      const name = record.slice(0, separatorIndex);
      const emblem = record.slice(separatorIndex + FIELD_SEPARATOR.length);
      if (listTitles.includes(name)) {
        emblemMap.set(name, emblem || undefined);
      }
    }

    // Fallback to per-list lookup for any titles not found in batch result
    for (const title of listTitles) {
      if (!emblemMap.has(title)) {
        const emblem = await getListEmblem(title);
        emblemMap.set(title, emblem);
      }
    }

    return emblemMap;
  } catch {
    // Fallback to per-list lookup on error
    const emblemMap = new Map<string, string | undefined>();

    await Promise.all(
      listTitles.map(async (title) => {
        const emblem = await getListEmblem(title);
        emblemMap.set(title, emblem);
      }),
    );

    return emblemMap;
  }
}
