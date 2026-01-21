# Feature Comparison & Adaptation Plan

## Executive Summary

After analyzing Krishna-Desiraju's `apple-reminders-swift-mcp-server`, we've found it has **significant feature advantages** that we can adapt to leapfrog our implementation. This document outlines what we can borrow, what we need to adapt, and a revised implementation timeline.

---

## Feature Comparison Matrix

| Feature                 | Our Fork (FradSer)       | Krishna-Desiraju            | Winner | Notes                                  |
| ----------------------- | ------------------------ | --------------------------- | ------ | -------------------------------------- |
| **Priority**            | ❌ Not implemented       | ✅ Full support (0-9 scale) | KD     | Direct port                            |
| **Recurring Reminders** | ❌ Not implemented       | ✅ Full support             | KD     | Daily/weekly/monthly/yearly with rules |
| **Location Triggers**   | ❌ Not implemented       | ✅ Geofencing               | KD     | Arrive/depart triggers                 |
| **Multiple Alarms**     | ❌ Not implemented       | ✅ Absolute & relative      | KD     | Full alarm support                     |
| **Tags**                | ❌ Not implemented       | ✅ Notes-based workaround   | KD     | `[#tag]` format in notes               |
| **Subtasks**            | ❌ Not implemented       | ❌ Not implemented          | Tie    | Both need notes-based solution         |
| **Flagged Status**      | ❌ Not implemented       | ✅ Supported                | KD     | Flag icon in Reminders                 |
| **Calendar Events**     | ✅ Full support          | ❌ Reminders only           | Ours   | Major advantage                        |
| **Timezone Handling**   | ✅ Robust implementation | ⚠️ Basic                    | Ours   | Better edge cases                      |
| **Date Parsing**        | ✅ Extensive formats     | ⚠️ ISO 8601 only            | Ours   | More flexible                          |
| **MCP SDK Version**     | 1.22.0                   | 1.0.4                       | Ours   | More current                           |
| **Architecture**        | Single Swift file        | Swift Package (modular)     | KD     | Cleaner separation                     |

---

## UV Permissions Issue Analysis

### The Problem

From [hald/things-mcp#25](https://github.com/hald/things-mcp/issues/25):

> "Claude desktop for Mac throws a dialogue // 'uv' would like to access data from other apps // on every launch."

### Root Cause

When Claude Desktop launches MCPs via `uv run`, macOS treats `uv` as the requesting application. Since `uv` is a CLI tool that changes frequently (updates, cache locations), macOS doesn't persist the permission grant.

### Solutions

#### Solution 1: Use Direct Node Execution (Our Current Approach ✅)

Our fork already uses direct node execution:

```json
{
  "mcpServers": {
    "apple-reminders": {
      "command": "node",
      "args": ["/path/to/dist/index.js"]
    }
  }
}
```

This **avoids the `uv` issue entirely** because `node` is a stable binary with persistent permissions.

#### Solution 2: Install Globally via pipx (For Python MCPs)

```bash
pipx install things-mcp
```

Then reference the direct binary:

```json
{
  "mcpServers": {
    "things": {
      "command": "/Users/[username]/.local/bin/things-mcp"
    }
  }
}
```

#### Solution 3: Pre-Sign the uv Binary (Complex)

Requires code signing the `uv` binary, not recommended for most users.

### Our Status

**We're already safe** - our MCP uses Node.js directly, not `uv`. No changes needed.

---

## Adaptation Strategy

### What to Port from Krishna-Desiraju

#### 1. Swift Models (High Value)

Port these files to our `src/swift/` directory:

| Source File                     | Target                           | Adaptation Needed         |
| ------------------------------- | -------------------------------- | ------------------------- |
| `Models/RecurrenceRule.swift`   | Integrate into EventKitCLI.swift | Minimal - well-structured |
| `Models/Location.swift`         | Integrate into EventKitCLI.swift | Minimal                   |
| `Models/Alarm.swift`            | Integrate into EventKitCLI.swift | Minimal                   |
| Tag handling in ReminderManager | Adapt to our format              | Modify delimiter style    |

#### 2. TypeScript Tool Handlers

Adapt these patterns:

| KD Feature                                  | Our Implementation       |
| ------------------------------------------- | ------------------------ |
| `create_reminder` with recurrence           | Add to `reminders_tasks` |
| `search_reminders`                          | Already have, enhance    |
| `complete_reminder` / `uncomplete_reminder` | Add to `reminders_tasks` |

#### 3. Their Tag Format vs Our Proposed Format

**Krishna-Desiraju format:**

```
[#work] [#urgent]
User notes here...
```

**Our proposed format:**

```
---TAGS---
#work #urgent
---END TAGS---

User notes here...
```

**Decision:** Adopt KD's simpler format `[#tag]` as it's:

- More compact
- Already tested
- Easier to parse with regex
- Works well with search

### What to Keep from Our Fork

1. **Calendar Events** - KD doesn't have this; it's valuable
2. **Timezone Handling** - Our implementation is more robust
3. **Date Parsing** - Supports more formats
4. **MCP SDK Version** - Stay current with 1.22.0+
5. **Biome/Jest Setup** - Keep our tooling

---

## Revised Implementation Plan

### Phase 1: Priority & Flagged Status (1-2 days)

**Effort reduced from 3 days** - direct port from KD

Tasks:

1. Add `priority` field to ReminderJSON struct
2. Add `flagged` field to ReminderJSON struct
3. Update Swift CLI to accept/return these fields
4. Update TypeScript handlers
5. Add validation schemas

### Phase 2: Recurring Reminders (2-3 days)

**New feature** - port from KD

Tasks:

1. Port `RecurrenceRule.swift` model
2. Add recurrence to create/update CLI commands
3. Extend TypeScript types
4. Add recurrence to tool definitions
5. Write tests

### Phase 3: Location-Based Reminders (2 days)

**New feature** - port from KD

Tasks:

1. Port `Location.swift` model
2. Add location triggers to CLI
3. Extend TypeScript types
4. Add location to tool definitions
5. Write tests

### Phase 4: Multiple Alarms (1-2 days)

**New feature** - port from KD

Tasks:

1. Port `Alarm.swift` model
2. Add alarms to CLI commands
3. Extend TypeScript types
4. Add alarms to tool definitions
5. Write tests

### Phase 5: Tags (1-2 days)

**Effort reduced** - adopt KD's `[#tag]` format

Tasks:

1. Add tag parsing to Swift (or TypeScript layer)
2. Add `tags` parameter to create/update
3. Add tag filtering to read operations
4. Add `reminders_tags` tool for tag management
5. Write tests

### Phase 6: Subtasks (3-4 days)

**Original scope** - KD doesn't have this

Tasks:

1. Design notes-based format (or reuse their pattern)
2. Implement subtask parser
3. Add `reminders_subtasks` tool
4. Add subtask support to create/update
5. Write tests

### Phase 7: Integration & Polish (2 days)

Tasks:

1. Update all prompts
2. Update documentation
3. Performance optimization
4. End-to-end testing

---

## Revised Timeline

| Phase | Feature             | Days | Cumulative |
| ----- | ------------------- | ---- | ---------- |
| 1     | Priority & Flagged  | 1-2  | 2          |
| 2     | Recurring Reminders | 2-3  | 5          |
| 3     | Location Triggers   | 2    | 7          |
| 4     | Multiple Alarms     | 1-2  | 9          |
| 5     | Tags                | 1-2  | 11         |
| 6     | Subtasks            | 3-4  | 15         |
| 7     | Polish              | 2    | 17         |

**Total: ~17 days** (vs original 15 days, but with significantly more features)

### Features Gained from Adaptation

| Feature   | Original Plan        | Revised Plan              |
| --------- | -------------------- | ------------------------- |
| Priority  | ✅ Planned           | ✅ Faster with KD port    |
| Tags      | ✅ Planned (complex) | ✅ Simpler with KD format |
| Subtasks  | ✅ Planned           | ✅ Same                   |
| Recurring | ❌ Not planned       | ✅ **Bonus feature**      |
| Location  | ❌ Not planned       | ✅ **Bonus feature**      |
| Alarms    | ❌ Not planned       | ✅ **Bonus feature**      |
| Flagged   | ❌ Not planned       | ✅ **Bonus feature**      |

---

## Implementation Approach

### Option A: Merge Codebases (Recommended)

Cherry-pick the best parts of KD's implementation into our fork:

- Keep our calendar events support
- Keep our timezone handling
- Adopt their reminder models
- Adopt their tag format

**Pros:** Best of both worlds, maintains our architecture
**Cons:** Some integration work

### Option B: Fork KD and Add Calendar

Start from KD's codebase and add our calendar features.

**Pros:** Faster for reminder features
**Cons:** Lose our calendar work, different architecture

### Option C: Independent Implementation

Implement everything from scratch using KD as reference only.

**Pros:** Clean design
**Cons:** Slower, reinventing tested code

**Recommendation:** Option A - selective merge into our fork.

---

## Files to Reference

From `apple-reminders-swift-mcp-server`:

```
swift-cli/Sources/RemindersKit/
├── Models/
│   ├── RecurrenceRule.swift   ← Port this
│   ├── Location.swift         ← Port this
│   ├── Alarm.swift            ← Port this
│   └── Reminder.swift         ← Reference for fields
├── ReminderManager.swift      ← Reference for patterns
└── EventKitBridge.swift       ← Reference only
```

---

## Next Steps

1. **Confirm approach** - Merge strategy (Option A)?
2. **Start Phase 1** - Priority is simplest, good first integration
3. **Create feature branch** - `feature/enhanced-reminders`
4. **Iterative PRs** - One phase per PR for review

---

_Document Version: 1.0_
_Created: January 2026_
_Based on analysis of: [Krishna-Desiraju/apple-reminders-swift-mcp-server](https://github.com/Krishna-Desiraju/apple-reminders-swift-mcp-server)_
