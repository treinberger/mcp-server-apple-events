/**
 * permissionPrompt.ts
 * Triggers macOS permission prompts via AppleScript fallbacks.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type PermissionDomain = 'reminders' | 'calendars';

const TIMEOUT_SECONDS = 120;

const APPLESCRIPT_SNIPPETS: Record<PermissionDomain, string> = {
  reminders: `with timeout of ${TIMEOUT_SECONDS} seconds\ntell application "Reminders" to get the name of every list\nend timeout`,
  calendars: `with timeout of ${TIMEOUT_SECONDS} seconds\ntell application "Calendar" to get the name of every calendar\nend timeout`,
};

const promptPromises = new Map<PermissionDomain, Promise<void>>();

/**
 * Triggers AppleScript to surface macOS permission dialogs with promise-based memoization
 */
export async function triggerPermissionPrompt(
  domain: PermissionDomain,
  force = false,
): Promise<void> {
  if (!force) {
    const existing = promptPromises.get(domain);
    if (existing) {
      return existing;
    }
  }

  const promise = (async () => {
    const script = APPLESCRIPT_SNIPPETS[domain];
    try {
      await execFileAsync('osascript', ['-e', script]);
    } catch {
      // Ignore errors - the goal is to trigger the prompt
    }
  })();

  if (!force) {
    promptPromises.set(domain, promise);
  }

  return promise;
}

export function hasBeenPrompted(domain: PermissionDomain): boolean {
  return promptPromises.has(domain);
}

export function resetPromptedDomains(): void {
  promptPromises.clear();
}
