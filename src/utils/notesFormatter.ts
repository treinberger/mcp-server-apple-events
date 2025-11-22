/**
 * notesFormatter.ts
 * Standardized formatting utilities for reminder notes to ensure consistency
 * and correct format for related reminder references.
 */

import { escapeRegex } from './helpers.js';
import {
  formatRelatedReminders,
  type RelatedReminder,
} from './reminderLinks.js';

/**
 * Standardized note structure components
 */
export interface NoteComponents {
  /** Critical information that blocks task completion */
  criticalInfo?: {
    reason: string;
    details: string;
  };
  /** Original note content */
  originalContent?: string;
  /** Related reminders with relationship context */
  relatedReminders?: RelatedReminder[];
}

/**
 * Format a standardized reminder note with proper structure:
 * 1. CRITICAL information (if any) at the beginning
 * 2. Original content in the middle
 * 3. Related reminders section at the end
 */
export function formatStandardizedNotes(components: NoteComponents): string {
  const parts: string[] = [];

  // Add CRITICAL information first
  if (components.criticalInfo) {
    const { reason, details } = components.criticalInfo;
    parts.push(`CRITICAL: ${reason} - ${details}`);
  }

  // Add original content
  if (components.originalContent) {
    if (parts.length > 0) {
      parts.push(''); // Add separator after CRITICAL
    }
    parts.push(components.originalContent);
  }

  // Add related reminders at the end
  if (components.relatedReminders && components.relatedReminders.length > 0) {
    const relatedSection = formatRelatedReminders(components.relatedReminders);
    parts.push(relatedSection);
  }

  return parts.join('\n').trim();
}

/**
 * Parse existing notes to extract structured components
 */
export function parseNoteComponents(notes?: string): NoteComponents {
  if (!notes) {
    return {};
  }

  const components: NoteComponents = {};
  const criticalMatch = notes.match(
    /^CRITICAL:\s*(.+?)\s*-\s*(.+?)(?:\n\n|\nRelated reminders:|$)/s,
  );

  if (criticalMatch) {
    components.criticalInfo = {
      reason: criticalMatch[1].trim(),
      details: criticalMatch[2].trim(),
    };
  }

  const relatedMatch = notes.match(/Related reminders:([\s\S]*)$/);
  let originalContent = notes;

  if (relatedMatch) {
    components.relatedReminders = parseRelatedRemindersFromText(
      relatedMatch[1],
    );
    originalContent = notes.replace(/Related reminders:[\s\S]*$/, '');
  }

  if (criticalMatch) {
    const criticalLine = `CRITICAL: ${criticalMatch[1].trim()} - ${criticalMatch[2].trim()}`;
    originalContent = originalContent.replace(
      new RegExp(
        `^${escapeRegex(criticalLine)}(?:\\n\\n|\\n(?=\\n)|\\nRelated reminders:|$)`,
        's',
      ),
      '',
    );
  }

  originalContent = originalContent.trim();
  if (originalContent) {
    components.originalContent = originalContent;
  }

  return components;
}

const RELATIONSHIP_LABELS: Record<string, RelatedReminder['relationship']> = {
  'Dependencies:': 'dependency',
  'Follow-up tasks:': 'follow-up',
  'Related reminders:': 'related',
  'Blocked by:': 'blocked-by',
  'Prerequisites:': 'prerequisite',
};

/**
 * Parse related reminders from formatted text
 * Extracts reminder IDs and titles from reference format: [Title] (ID: {id}) (List)
 */
function parseRelatedRemindersFromText(text: string): RelatedReminder[] {
  const reminders: RelatedReminder[] = [];
  const lines = text.split('\n');
  let currentRelationship: RelatedReminder['relationship'] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    for (const [label, relationship] of Object.entries(RELATIONSHIP_LABELS)) {
      if (trimmed.startsWith(label)) {
        currentRelationship = relationship;
        break;
      }
    }

    if (!currentRelationship) continue;

    const referenceMatch = trimmed.match(
      /^-\s*\[(.+?)\]\s*\(ID:\s*([^)]+)\)(?:\s*\((.+?)\))?$/,
    );
    if (referenceMatch) {
      reminders.push({
        id: referenceMatch[2].trim(),
        title: referenceMatch[1],
        list: referenceMatch[3],
        relationship: currentRelationship,
      });
    }
  }

  return reminders;
}

/**
 * Merge note components intelligently
 * Preserves existing structure while adding new components
 */
export function mergeNoteComponents(
  existing: NoteComponents,
  updates: Partial<NoteComponents>,
): NoteComponents {
  const merged: NoteComponents = {
    criticalInfo: updates.criticalInfo || existing.criticalInfo,
  };

  if (updates.originalContent && existing.originalContent) {
    merged.originalContent = `${existing.originalContent}\n\n${updates.originalContent}`;
  } else {
    merged.originalContent =
      updates.originalContent || existing.originalContent;
  }

  const allRelated = [
    ...(existing.relatedReminders || []),
    ...(updates.relatedReminders || []),
  ];

  if (allRelated.length > 0) {
    const seen = new Set<string>();
    merged.relatedReminders = allRelated.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }

  return merged;
}
