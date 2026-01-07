# Apple Events MCP Server ![Version 1.0.1](https://img.shields.io/badge/version-1.0.1-blue) ![License: MIT](https://img.shields.io/badge/license-MIT-green)

[![Twitter Follow](https://img.shields.io/twitter/follow/FradSer?style=social)](https://twitter.com/FradSer)

[English](README.md) | 简体中文

一个通过 EventKit 操作 Apple Calendar 与 Apple Reminders 的 Model Context Protocol (MCP) 服务器。

## 功能特性

### 核心功能
- **列表管理**：查看所有提醒事项与提醒事项列表，支持高级筛选
- **提醒事项操作**：跨列表的完整 CRUD（创建、读取、更新、删除）能力
- **丰富内容支持**：完整支持标题、备注、截止日期、URL 与完成状态
- **原生 macOS 集成**：使用 EventKit 原生操作 Apple Calendar 与 Apple Reminders

### 高级功能
- **智能组织**：按优先级、截止日期、类别或完成状态自动分类与过滤
- **强大搜索**：支持完成状态、日期范围与全文搜索的多条件筛选
- **批量操作**：通过优化的数据访问模式高效处理多条提醒事项
- **权限管理**：自动校验并请求所需的 macOS 系统权限
- **灵活日期处理**：支持多种日期格式（YYYY-MM-DD、ISO 8601），并具备时区感知
- **Unicode 支持**：完整的国际字符支持与输入校验

### 技术优势
- **Clean Architecture**：遵循 Clean Architecture 的 4 层架构与依赖注入
- **类型安全**：Zod 校验实现运行时类型检查的完整 TypeScript 覆盖
- **高性能**：Swift 编译二进制用于性能敏感的提醒事项与日历操作
- **健壮的错误处理**：一致的错误响应与详细诊断信息
- **Repository Pattern**：标准化 CRUD 操作的数据访问抽象
- **函数式编程**：在适用场景使用纯函数与不可变数据结构

## 系统要求

- **Node.js 18 或更高版本**
- **macOS**（Apple Reminders 集成所需）
- **Xcode Command Line Tools**（编译 Swift 代码所需）
- **pnpm**（推荐用于包管理）

## macOS 权限要求（Sonoma 14+ / Sequoia 15）

Apple 已将提醒事项与日历权限拆分为「仅写入」与「完全访问」范围。Swift 桥接层声明了以下隐私键，确保在你授权后该工具可以读写数据：

- `NSRemindersUsageDescription`
- `NSRemindersFullAccessUsageDescription`
- `NSRemindersWriteOnlyAccessUsageDescription`
- `NSCalendarsUsageDescription`
- `NSCalendarsFullAccessUsageDescription`
- `NSCalendarsWriteOnlyAccessUsageDescription`

当授权状态为 `notDetermined` 时，CLI 会调用 `requestFullAccessToReminders` / `requestFullAccessToEvents`，macOS 会弹出对应授权对话框。如果系统遗失权限记录，可运行 `./check-permissions.sh` 重新触发请求。

EventKit 权限授予给 `EventKitCLI` 二进制（你会在系统设置中看到该名称）。AppleScript 自动化权限授予运行 MCP 服务器的宿主工具（例如终端或 MCP 客户端），因为它是自动化请求的发起方。

若工具调用仍遇到权限错误，Node.js 层会自动执行一段最小化的 AppleScript（`osascript -e 'tell application "Reminders" …'`）以唤起系统弹窗，并重试 Swift CLI 一次。若仍失败，请按提示让工具生成并运行 AppleScript 申请日历/提醒权限。

**验证命令**

```bash
pnpm test -- src/swift/Info.plist.test.ts
```

测试会确保所有必须的 usage-description 字段在发布前就绪。

## 快速开始

通过 npm 全局安装：

```bash
npm install -g mcp-server-apple-events
```

## 配置说明

### 配置 Cursor

1. 打开 Cursor
2. 打开 Cursor 设置
3. 点击侧边栏中的 "MCP"
4. 点击 "Add new global MCP server"
5. 使用以下设置配置服务器：
    ```json
    {
      "mcpServers": {
        "apple-reminders": {
          "command": "mcp-server-apple-events",
          "args": []
        }
      }
    }
    ```

### 配置 ChatWise

1. 打开 ChatWise
2. 进入设置
3. 导航至工具部分
4. 点击 "+" 按钮
5. 使用以下设置配置工具：
   - 类型：`stdio`
   - ID：`apple-reminders`
   - 命令：`mcp-server-apple-events`
   - 参数：（留空）

### 配置 Claude Desktop

你需要配置 Claude Desktop 以识别 Apple Events MCP 服务器。可通过以下方式访问配置：

#### 方式 1：通过 Claude Desktop 界面

1. 打开 Claude Desktop 应用
2. 从左上角菜单栏启用开发者模式
3. 打开设置并导航至 Developer Option
4. 点击 Edit Config 打开 `claude_desktop_config.json`

#### 方式 2：直接访问文件

macOS：
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Windows：
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

### 2. 添加服务器配置

将以下配置添加到你的 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "apple-reminders": {
      "command": "mcp-server-apple-events",
      "args": []
    }
  }
}
```

### 3. 重启 Claude Desktop

要使更改生效：

1. 完全退出 Claude Desktop（不仅仅是关闭窗口）
2. 重新启动 Claude Desktop
3. 查看工具图标以确认 Apple Events 服务器已连接

## 使用示例

配置完成后，你可以让 Claude 与你的 Apple Reminders 进行交互。以下是一些示例提示：

### 创建提醒事项
```
创建一个明天下午 5 点的“买杂货”提醒。
添加一个“打电话给妈妈”的提醒，备注“询问周末计划”。
在“工作”列表中创建一个下周五到期的“提交报告”提醒。
创建一个带 URL 的提醒：“查看这个网站：https://google.com”。
```

### 更新提醒事项
```
将“买杂货”提醒的标题更新为“买有机杂货”。
将“打电话给妈妈”提醒更新为今天下午 6 点到期。
更新“提交报告”提醒并标记为已完成。
将“买杂货”的备注更改为“别忘了牛奶和鸡蛋”。
```

### 管理提醒事项
```
显示我的所有提醒事项。
列出“购物”列表中的所有提醒事项。
显示我已完成的提醒事项。
```

### 处理列表
```
显示所有提醒事项列表。
显示“工作”列表中的提醒事项。
```

服务器将：
- 处理你的自然语言请求
- 与 Apple 原生提醒事项应用交互
- 向 Claude 返回格式化结果
- 维护与 macOS 的原生集成

## 结构化提示库

服务器提供统一的提示注册表，可通过 MCP 的 `ListPrompts` 与 `GetPrompt` 端点访问。每个模板共享使命、上下文输入、编号流程、约束、输出格式与质量标准，使下游助手获得稳定可预测的结构，而不是脆弱的自由格式示例。

- **daily-task-organizer** —— 可选 `today_focus`（你今天最想完成的重点）生成当日执行蓝图，在优先级工作与恢复时间之间保持平衡。支持智能任务聚类、专注时间段安排、自动提醒列表组织，并会在大量今日到期提醒需要固定时段时，按到期时间自动创建日历时间块。快速完成类任务簇会转换为以提醒到期时间结束的 15 分钟 “Focus Sprint — [Outcome]” 日历占位，而标准任务则对应 30、45 或 60 分钟事件，并以同一到期时间窗口为锚点。
- **smart-reminder-creator** —— 可选 `task_idea`（你想做的一句话描述），生成优化调度的提醒结构。
- **reminder-review-assistant** —— 可选 `review_focus`（如“逾期”或某个清单名）用于审计与优化现有提醒。
- **weekly-planning-workflow** —— 可选 `user_ideas`（你本周想完成的想法与目标）指导周一到周日的重置，并将时间区块绑定到现有列表。

### 设计约束与验证

- 提示严格限制在 Apple Reminders 原生能力范围内（无第三方自动化），并在执行不可逆操作前补齐缺失上下文。
- 共享格式使输出可渲染为 Markdown 片段或表格，无需客户端应用额外解析。
- 每次修改提示文案后运行 `pnpm test -- src/server/prompts.test.ts` 以断言元数据、模式兼容性与叙述组装。

## 可用的 MCP 工具

服务器按服务域暴露 MCP 工具，对应提醒事项与日历的不同资源：

### 提醒事项任务工具

**工具名称**：`reminders_tasks`

用于管理单个提醒事项任务，支持完整 CRUD 操作。

**操作**：`read`、`create`、`update`、`delete`

**主要处理函数**：
- `handleReadReminders()` - 带筛选选项读取提醒事项
- `handleCreateReminder()` - 创建新的提醒事项
- `handleUpdateReminder()` - 更新现有提醒事项
- `handleDeleteReminder()` - 删除提醒事项

#### 按操作的参数

**读取操作**（`action: "read"`）：
- `id` *(可选)*：要读取的特定提醒事项唯一标识符
- `filterList` *(可选)*：要展示的提醒事项列表名称
- `showCompleted` *(可选)*：是否包含已完成提醒事项（默认：false）
- `search` *(可选)*：按标题或内容筛选的搜索词
- `dueWithin` *(可选)*：按到期范围筛选（"today"、"tomorrow"、"this-week"、"overdue"、"no-date"）

**创建操作**（`action: "create"`）：
- `title` *(必填)*：提醒事项标题
- `dueDate` *(可选)*：到期时间，格式 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm:ss`
- `targetList` *(可选)*：要添加到的提醒事项列表名称
- `note` *(可选)*：提醒事项备注内容
- `url` *(可选)*：与提醒事项关联的 URL

**更新操作**（`action: "update"`）：
- `id` *(必填)*：要更新的提醒事项唯一标识符
- `title` *(可选)*：提醒事项新标题
- `dueDate` *(可选)*：新的到期时间，格式 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm:ss`
- `note` *(可选)*：新的备注内容
- `url` *(可选)*：新的 URL
- `completed` *(可选)*：设置提醒事项完成/未完成状态
- `targetList` *(可选)*：提醒事项所在列表

**删除操作**（`action: "delete"`）：
- `id` *(必填)*：要删除的提醒事项唯一标识符

#### 使用示例

```json
{
  "action": "create",
  "title": "购买食材",
  "dueDate": "2024-03-25 18:00:00",
  "targetList": "购物",
  "note": "别忘了牛奶和鸡蛋",
  "url": "https://example.com/shopping-list"
}
```

```json
{
  "action": "read",
  "filterList": "工作",
  "showCompleted": false,
  "dueWithin": "today"
}
```

```json
{
  "action": "delete",
  "id": "reminder-123"
}
```

### 提醒事项列表工具

**工具名称**：`reminders_lists`

用于管理提醒事项列表 —— 查看现有列表或创建新的列表来组织提醒事项。

**操作**：`read`、`create`、`update`、`delete`

**主要处理函数**：
- `handleReadReminderLists()` - 读取所有提醒事项列表
- `handleCreateReminderList()` - 创建新的提醒事项列表
- `handleUpdateReminderList()` - 更新现有提醒事项列表
- `handleDeleteReminderList()` - 删除提醒事项列表

#### 按操作的参数

**读取操作**（`action: "read"`）：
- 无需额外参数

**创建操作**（`action: "create"`）：
- `name` *(必填)*：新列表名称

**更新操作**（`action: "update"`）：
- `name` *(必填)*：要更新的列表当前名称
- `newName` *(必填)*：列表的新名称

**删除操作**（`action: "delete"`）：
- `name` *(必填)*：要删除的列表名称

#### 使用示例

```json
{
  "action": "create",
  "name": "项目 Alpha"
}
```

### 日历事件工具

**工具名称**：`calendar_events`

用于处理 EventKit 日历事件（时间块），提供 CRUD 能力。

**操作**：`read`、`create`、`update`、`delete`

**主要处理函数**：
- `handleReadCalendarEvents()` - 带可选筛选读取事件
- `handleCreateCalendarEvent()` - 创建日历事件
- `handleUpdateCalendarEvent()` - 更新现有事件
- `handleDeleteCalendarEvent()` - 删除日历事件

#### 按操作的参数

**读取操作**（`action: "read"`）：
- `id` *(可选)*：要读取的事件唯一标识符
- `filterCalendar` *(可选)*：按日历名称筛选
- `search` *(可选)*：在标题、备注或地点中匹配关键字
- `startDate` *(可选)*：筛选在该日期之后开始的事件
- `endDate` *(可选)*：筛选在该日期之前结束的事件

**创建操作**（`action: "create"`）：
- `title` *(必填)*：事件标题
- `startDate` *(必填)*：开始时间
- `endDate` *(必填)*：结束时间
- `targetCalendar` *(可选)*：要创建到的日历名称
- `note`、`location`、`url`、`isAllDay` *(可选)*：附加元数据

**更新操作**（`action: "update"`）：
- `id` *(必填)*：事件标识符
- 其余字段与创建参数一致，用于选择性更新

**删除操作**（`action: "delete"`）：
- `id` *(必填)*：要删除的事件标识符

### 日历集合工具

**工具名称**：`calendar_calendars`

用于返回 EventKit 中可用的日历集合。创建或更新事件前可先确认日历标识。

**操作**：`read`

**主要处理函数**：
- `handleReadCalendars()` - 列出所有日历 ID 与名称

**使用示例**

```json
{
  "action": "read"
}
```

**示例响应**

```json
{
  "content": [
    {
      "type": "text",
      "text": "### Calendars (Total: 3)\n- Work (ID: cal-1)\n- Personal (ID: cal-2)\n- Shared (ID: cal-3)"
    }
  ],
  "isError": false
}
```

#### 返回格式

**成功响应**：
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully created reminder: Buy groceries"
    }
  ],
  "isError": false
}
```

**URL 字段说明**：EventKit API 完整支持 `url` 字段。当你在创建或更新提醒事项时提供 URL，该 URL 会被存储在两个位置以保证最大兼容性：

1. **EventKit URL 字段**：URL 存储在原生 `url` 属性中（在提醒事项详情的 “i” 图标里可见）
2. **备注字段**：URL 也会以结构化格式附加到 notes 中，便于解析

**双重存储策略**：
- **URL 字段**：用于 Reminders 原生界面展示单个 URL
- **备注字段**：以结构化格式存储多个 URL，便于解析

```
Reminder note content here...

URLs:
- https://example.com
- https://another-url.com
```

该策略保证 URL 同时可在 Reminders 界面与 API/notes 解析流程中访问。

**URL 提取**：可通过正则从备注中提取 URL：
```typescript
// Extract URLs from notes using regex
const urlsRegex = reminder.notes?.match(/https?:\/\/[^\s]+/g) || [];
```

**结构化格式的好处**：
- **一致解析**：URL 始终位于可预测的位置
- **多 URL 支持**：可稳定处理同一提醒事项中的多个 URL
- **清晰分隔**：备注正文与 URL 清晰分离
- **向后兼容**：未结构化的 URL 仍可作为回退被识别

**列表响应**：
```json
{
  "reminders": [
    {
      "title": "Buy groceries", 
      "list": "Shopping",
      "isCompleted": false,
      "dueDate": "2024-03-25 18:00:00",
      "notes": "Don't forget milk\n\nURLs:\n- https://grocery-store.com\n- https://shopping-list.com",
      "url": null
    }
  ],
  "total": 1,
  "filter": {
    "list": "Shopping",
    "showCompleted": false
  }
}
```

## 组织策略

服务器通过四个内置策略提供智能提醒事项组织能力：

### 优先级策略
基于优先级关键词自动分类提醒事项：
- **高优先级**：包含 “urgent”、“important”、“critical”、“asap” 等词
- **中优先级**：标准提醒事项的默认类别
- **低优先级**：包含 “later”、“someday”、“eventually”、“maybe” 等词

### 截止日期策略
按提醒事项的到期时间组织：
- **已过期**：已过期的提醒事项
- **今天**：今天到期
- **明天**：明天到期
- **本周**：本周内到期
- **下周**：下周到期
- **未来**：下周之后到期
- **无日期**：没有到期时间

### 类别策略
通过内容分析智能分类：
- **工作**：商务、会议、项目、办公室、客户相关
- **个人**：家庭、朋友、自我护理相关
- **购物**：购买、商店、采购、杂货相关
- **健康**：医生、运动、医疗、健身、锻炼相关
- **财务**：账单、付款、金融、银行、预算相关
- **旅行**：旅行、假期、航班、酒店相关
- **教育**：学习、课程、学校、书籍、研究相关
- **未分类**：不匹配任何特定类别

### 完成状态策略
简单的二元组织：
- **活跃**：未完成
- **已完成**：已完成

### 使用示例

按优先级组织所有提醒事项：
```
按优先级组织我的提醒事项
```

对工作相关提醒事项进行分类：
```
从工作列表按类别组织提醒事项
```

对逾期项目排序：
```
按截止日期组织逾期提醒事项
```

## 许可证

MIT

## 参与贡献

欢迎贡献！请先阅读贡献指南。

## 开发

1. 使用 pnpm 安装依赖（保持 Swift 桥接与 TypeScript 依赖一致）：
```bash
pnpm install
```

2. 在调用 CLI 前构建项目（TypeScript 与 Swift 二进制）：
```bash
pnpm build
```

3. 运行完整测试套件，验证 TypeScript、Swift 桥接与提示模板：
```bash
pnpm test
```

4. 提交前使用 Biome 进行格式化与检查：
```bash
pnpm exec biome check
```

### 从嵌套目录启动

CLI 入口包含项目根目录回退逻辑，因此你可以从 `dist/` 等子目录或编辑器任务运行器启动服务器而不丢失 Swift 二进制访问。引导程序会向上最多十层查找 `package.json`；如果你自定义目录结构，请确保清单文件仍在该查找深度内以保持这一保障。

### 可用脚本

- `pnpm build` - 构建 Swift 辅助二进制（启动服务器前必需）
- `pnpm build:swift` - 仅构建 Swift 辅助二进制
- `pnpm dev` - 使用 tsx 的 TypeScript 监视开发模式（运行时 TS 执行）
- `pnpm start` - 通过 stdio 启动 MCP 服务器（未构建时自动回退到运行时 TS）
- `pnpm test` - 运行完整 Jest 测试套件
- `pnpm check` - 运行 Biome 格式化与 TypeScript 类型检查

### 依赖

**运行时依赖：**
- `@modelcontextprotocol/sdk ^1.20.2` - MCP 协议实现
- `moment ^2.30.1` - 日期/时间处理实用工具
- `exit-on-epipe ^1.0.1` - 进程优雅终止处理
- `tsx ^4.20.6` - TypeScript 执行与 REPL
- `zod ^4.1.12` - 运行时类型校验

**开发依赖：**
- `typescript ^5.9.3` - TypeScript 编译器
- `@types/node ^24.9.2` - Node.js 类型定义
- `@types/jest ^30.0.0` - Jest 类型定义
- `jest ^30.2.0` - 测试框架
- `babel-jest ^30.2.0` - Babel Jest 转换器
- `babel-plugin-transform-import-meta ^2.3.3` - Babel import meta 转换
- `ts-jest ^29.4.5` - Jest 的 TypeScript 支持
- `@biomejs/biome ^2.3.2` - 代码格式化与静态检查

**构建工具：**
- Swift 二进制用于原生 macOS 集成
- TypeScript 编译用于跨平台兼容
