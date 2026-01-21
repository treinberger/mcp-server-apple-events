# Apple EventKit MCP - Feature Implementation Plan

## Executive Summary

This document outlines a phased approach to adding **Priority Support**, **Subtasks/Checklists**, and **Tags/Labels** to the Apple EventKit MCP server. Based on research into Apple's EventKit API, some features have native support while others require workarounds.

### API Capability Matrix

| Feature      | Native EventKit Support                   | Implementation Approach        |
| ------------ | ----------------------------------------- | ------------------------------ |
| **Priority** | ✅ Full support via `EKReminder.priority` | Direct API integration         |
| **Subtasks** | ❌ Not exposed in public API              | Notes-based structured storage |
| **Tags**     | ❌ Not exposed in public API              | Notes-based structured storage |

---

## Phase 1: Priority Support (Native API)

**Estimated Effort: 2-3 days**

### Overview

Apple's EventKit provides native priority support through the `EKReminderPriority` enum with values:

- `none` (0) - No priority
- `high` (1) - High priority
- `medium` (5) - Medium priority
- `low` (9) - Low priority

### Implementation Tasks

#### 1.1 Swift CLI Updates (`src/swift/EventKitCLI.swift`)

```swift
// Add to ReminderJSON struct
struct ReminderJSON: Codable {
    let id: String
    let title: String
    let isCompleted: Bool
    let list: String
    let notes: String?
    let url: String?
    let dueDate: String?
    let priority: Int  // NEW: 0=none, 1=high, 5=medium, 9=low
}

// Update createReminder to accept priority
func createReminder(title: String, listName: String?, notes: String?,
                    urlString: String?, dueDateString: String?,
                    priority: Int?) throws -> ReminderJSON {
    let reminder = EKReminder(eventStore: eventStore)
    // ... existing code ...
    if let p = priority {
        reminder.priority = p
    }
    // ...
}

// Update updateReminder similarly
func updateReminder(id: String, ..., priority: Int?) throws -> ReminderJSON
```

#### 1.2 TypeScript Tool Definitions (`src/tools/definitions.ts`)

```typescript
// Add to reminders_tasks inputSchema.properties
priority: {
  type: 'integer',
  enum: [0, 1, 5, 9],
  description: 'Priority level: 0=none, 1=high, 5=medium, 9=low'
}

// Add filtering capability
filterPriority: {
  type: 'string',
  enum: ['high', 'medium', 'low', 'none'],
  description: 'Filter reminders by priority level'
}
```

#### 1.3 Handler Updates (`src/tools/handlers/reminderHandlers.ts`)

- Pass `priority` parameter to CLI for create/update
- Add priority filtering logic for read operations
- Map string priority names to integer values

#### 1.4 Repository Updates (`src/utils/reminderRepository.ts`)

- Update `createReminder()` signature
- Update `updateReminder()` signature
- Add priority to `ReminderFilters` interface

#### 1.5 Validation Schema Updates (`src/validation/schemas.ts`)

```typescript
export const reminderCreateSchema = z.object({
  // ... existing fields ...
  priority: z
    .number()
    .int()
    .refine(
      (val) => [0, 1, 5, 9].includes(val),
      "Priority must be 0, 1, 5, or 9",
    )
    .optional(),
});
```

### Testing Requirements

- Unit tests for priority CRUD operations
- Integration tests verifying native Reminders app shows correct priority
- Edge cases: invalid priority values, priority updates

---

## Phase 2: Subtasks/Checklists (Notes-Based Storage)

**Estimated Effort: 4-5 days**

### Overview

Since Apple's EventKit does not expose subtasks to third-party developers, we implement a structured storage format within the notes field that:

- Preserves human readability in native Reminders app
- Allows programmatic parsing and manipulation
- Maintains backward compatibility with existing reminders

### Storage Format Design

```
Original note content here...

---SUBTASKS---
[ ] First subtask
[x] Completed subtask
[ ] Third subtask
---END SUBTASKS---

URLs:
- https://example.com
```

### Implementation Tasks

#### 2.1 New Types (`src/types/index.ts`)

```typescript
export interface Subtask {
  id: string; // Generated UUID
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface ReminderWithSubtasks extends Reminder {
  subtasks: Subtask[];
}
```

#### 2.2 Subtask Parser Utility (`src/utils/subtaskParser.ts`)

```typescript
export function parseSubtasks(notes: string | null): Subtask[];
export function serializeSubtasks(
  subtasks: Subtask[],
  existingNotes: string | null,
): string;
export function addSubtask(
  notes: string | null,
  subtask: Omit<Subtask, "id">,
): string;
export function updateSubtask(
  notes: string | null,
  subtaskId: string,
  updates: Partial<Subtask>,
): string;
export function removeSubtask(notes: string | null, subtaskId: string): string;
export function toggleSubtask(notes: string | null, subtaskId: string): string;
```

#### 2.3 Swift CLI Updates

Subtask manipulation happens in TypeScript layer (notes are just strings to Swift).
Only change needed: ensure notes field properly preserved during updates.

#### 2.4 New MCP Tool: `reminders_subtasks`

```typescript
{
  name: 'reminders_subtasks',
  description: 'Manages subtasks within reminders. Subtasks are stored in the notes field.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['read', 'create', 'update', 'delete', 'toggle', 'reorder'],
      },
      reminderId: {
        type: 'string',
        description: 'The parent reminder ID (REQUIRED)'
      },
      subtaskId: {
        type: 'string',
        description: 'The subtask ID (for update, delete, toggle)'
      },
      title: {
        type: 'string',
        description: 'Subtask title (for create, update)'
      },
      completed: {
        type: 'boolean',
        description: 'Completion status (for update)'
      },
      order: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of subtask IDs in desired order (for reorder)'
      }
    },
    required: ['action', 'reminderId']
  }
}
```

#### 2.5 Handler Implementation (`src/tools/handlers/subtaskHandlers.ts`)

```typescript
export async function handleSubtaskAction(
  args: SubtaskArgs,
): Promise<CallToolResult> {
  switch (args.action) {
    case "read":
      return handleReadSubtasks(args.reminderId);
    case "create":
      return handleCreateSubtask(args.reminderId, args.title!);
    case "update":
      return handleUpdateSubtask(args.reminderId, args.subtaskId!, args);
    case "delete":
      return handleDeleteSubtask(args.reminderId, args.subtaskId!);
    case "toggle":
      return handleToggleSubtask(args.reminderId, args.subtaskId!);
    case "reorder":
      return handleReorderSubtasks(args.reminderId, args.order!);
  }
}
```

#### 2.6 Inline Subtask Creation

Also support creating reminder with subtasks in one call:

```typescript
// In reminders_tasks create action
{
  action: 'create',
  title: 'Grocery Shopping',
  subtasks: ['Milk', 'Eggs', 'Bread']  // Creates with initial subtasks
}
```

### Testing Requirements

- Parser unit tests with various edge cases
- Round-trip tests (parse → serialize → parse)
- Integration tests with actual reminders
- Backward compatibility tests with existing notes formats

---

## Phase 3: Tags/Labels (Notes-Based Storage)

**Estimated Effort: 3-4 days**

### Overview

Tags provide cross-list categorization. Since EventKit doesn't expose Apple's native tags, we implement a notes-based tagging system similar to subtasks.

### Storage Format Design

```
Original note content here...

---TAGS---
#work #urgent #q1-2025
---END TAGS---

---SUBTASKS---
...
---END SUBTASKS---

URLs:
- https://example.com
```

### Implementation Tasks

#### 3.1 New Types (`src/types/index.ts`)

```typescript
export interface Tag {
  name: string; // Without # prefix
  color?: string; // Optional hex color for UI
}

export interface ReminderWithTags extends Reminder {
  tags: string[]; // Array of tag names
}
```

#### 3.2 Tag Parser Utility (`src/utils/tagParser.ts`)

```typescript
export function parseTags(notes: string | null): string[];
export function serializeTags(
  tags: string[],
  existingNotes: string | null,
): string;
export function addTag(notes: string | null, tag: string): string;
export function removeTag(notes: string | null, tag: string): string;
export function hasTag(notes: string | null, tag: string): boolean;
```

#### 3.3 Tool Definition Updates (`src/tools/definitions.ts`)

```typescript
// Add to reminders_tasks
tags: {
  type: 'array',
  items: { type: 'string' },
  description: 'Tags to assign to the reminder (for create/update)'
}

filterTags: {
  type: 'array',
  items: { type: 'string' },
  description: 'Filter reminders that have ALL specified tags'
}

filterAnyTags: {
  type: 'array',
  items: { type: 'string' },
  description: 'Filter reminders that have ANY of the specified tags'
}
```

#### 3.4 New MCP Tool: `reminders_tags`

```typescript
{
  name: 'reminders_tags',
  description: 'Manages tags across reminders. Lists all tags, adds/removes tags from reminders.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'add', 'remove', 'find'],
      },
      reminderId: {
        type: 'string',
        description: 'Reminder to modify (for add, remove)'
      },
      tag: {
        type: 'string',
        description: 'Tag name without # prefix'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Multiple tags (for bulk add/remove)'
      }
    },
    required: ['action']
  }
}
```

**Actions:**

- `list` - Returns all unique tags used across all reminders
- `add` - Adds tag(s) to a reminder
- `remove` - Removes tag(s) from a reminder
- `find` - Finds all reminders with specified tag(s)

#### 3.5 Handler Implementation (`src/tools/handlers/tagHandlers.ts`)

```typescript
export async function handleTagAction(args: TagArgs): Promise<CallToolResult> {
  switch (args.action) {
    case "list":
      return handleListAllTags();
    case "add":
      return handleAddTags(args.reminderId!, args.tags || [args.tag!]);
    case "remove":
      return handleRemoveTags(args.reminderId!, args.tags || [args.tag!]);
    case "find":
      return handleFindByTags(args.tags || [args.tag!]);
  }
}
```

### Testing Requirements

- Parser unit tests for tag extraction/serialization
- Filter tests (ALL tags, ANY tags)
- Integration with subtasks (both in same notes field)
- Cross-list tag searches

---

## Phase 4: Integration & Polish

**Estimated Effort: 2-3 days**

### 4.1 Prompt Template Updates

Update existing prompts to leverage new features:

#### `daily-task-organizer`

- Group tasks by priority
- Show subtask completion percentages
- Filter by tags

#### `smart-reminder-creator`

- Suggest priority based on keywords
- Auto-tag based on content analysis
- Support checklist items in natural language

#### `reminder-review-assistant`

- Audit priority assignments
- Find untagged reminders
- Identify reminders with incomplete subtasks

### 4.2 New Prompt: `tag-based-workflow`

```typescript
{
  name: 'tag-based-workflow',
  description: 'Manages reminders using a tag-based GTD/productivity workflow',
  inputs: [
    { name: 'workflow_type', description: 'GTD contexts, project tags, or energy levels' }
  ]
}
```

### 4.3 Response Format Enhancements

Update all reminder responses to include new fields:

```json
{
  "id": "reminder-123",
  "title": "Team Meeting Prep",
  "priority": 1,
  "priorityLabel": "high",
  "tags": ["work", "meetings"],
  "subtasks": [
    { "id": "st-1", "title": "Review agenda", "isCompleted": true },
    { "id": "st-2", "title": "Prepare slides", "isCompleted": false }
  ],
  "subtaskProgress": "1/2 completed"
}
```

### 4.4 Documentation Updates

- Update README.md with new features
- Add usage examples for each feature
- Document notes format specification
- Add migration guide for existing users

### 4.5 Performance Optimization

- Batch tag queries for efficiency
- Cache parsed subtasks/tags when reading multiple reminders
- Optimize notes parsing with compiled regex

---

## Implementation Schedule

| Phase | Feature              | Duration   | Dependencies                     |
| ----- | -------------------- | ---------- | -------------------------------- |
| 1     | Priority Support     | Days 1-3   | None                             |
| 2     | Subtasks/Checklists  | Days 4-8   | Phase 1 (for testing)            |
| 3     | Tags/Labels          | Days 9-12  | Phase 2 (shared parser patterns) |
| 4     | Integration & Polish | Days 13-15 | Phases 1-3                       |

**Total Estimated Duration: 15 working days**

---

## Risk Assessment

### Technical Risks

| Risk                             | Likelihood | Impact | Mitigation                                                |
| -------------------------------- | ---------- | ------ | --------------------------------------------------------- |
| Notes field character limit      | Low        | High   | Test with max-length notes; implement truncation warnings |
| Format conflicts with user notes | Medium     | Medium | Use unique delimiters; provide escape mechanism           |
| Performance with many subtasks   | Low        | Medium | Lazy parsing; implement limits                            |
| EventKit API changes             | Low        | High   | Abstraction layer; version detection                      |

### Compatibility Risks

| Risk                                       | Mitigation                                      |
| ------------------------------------------ | ----------------------------------------------- |
| Existing reminders with unstructured notes | Parser handles gracefully; no data loss         |
| Other apps modifying notes                 | Delimiters designed to survive reformatting     |
| iCloud sync conflicts                      | Notes are atomic; last-write-wins is acceptable |

---

## Success Criteria

### Phase 1 Complete When:

- [ ] Can create reminder with priority via MCP
- [ ] Can update reminder priority
- [ ] Can filter reminders by priority
- [ ] Priority visible in native Reminders app
- [ ] All tests passing (>90% coverage)

### Phase 2 Complete When:

- [ ] Can add/remove/toggle subtasks
- [ ] Subtasks visible as readable text in Reminders app notes
- [ ] Can create reminder with initial subtasks
- [ ] Subtask reordering works
- [ ] Round-trip parsing maintains data integrity

### Phase 3 Complete When:

- [ ] Can add/remove tags from reminders
- [ ] Can list all unique tags
- [ ] Can filter reminders by tags (ALL/ANY)
- [ ] Tags visible in Reminders app notes
- [ ] Cross-list tag queries work

### Phase 4 Complete When:

- [ ] All prompts updated for new features
- [ ] Documentation complete
- [ ] Performance benchmarks acceptable
- [ ] No regressions in existing functionality

---

## Appendix A: Notes Field Format Specification

```
[User's original notes content - preserved exactly as entered]

---TAGS---
#tag1 #tag2 #multi-word-tag
---END TAGS---

---SUBTASKS---
[x] {uuid-1} Completed subtask title
[ ] {uuid-2} Incomplete subtask title
[ ] {uuid-3} Another incomplete subtask
---END SUBTASKS---

URLs:
- https://example1.com
- https://example2.com
```

### Format Rules

1. **Delimiters** are case-sensitive and must be on their own line
2. **UUIDs** in subtasks are 8-character hex strings for compactness
3. **Tags** use # prefix, alphanumeric + hyphens only
4. **Order** of sections: user notes → tags → subtasks → URLs
5. **Empty sections** are omitted entirely
6. **Whitespace** preserved in user notes, normalized in metadata sections

---

## Appendix B: Migration Path

For users with existing reminders using the MCP:

1. **No migration required** - existing notes are preserved
2. **Graceful degradation** - reminders without structured sections work normally
3. **Opt-in enhancement** - new fields only added when explicitly used
4. **Format detection** - parser identifies structured vs. unstructured notes

---

_Document Version: 1.0_
_Last Updated: January 2026_
_Author: Claude (AI Assistant)_
