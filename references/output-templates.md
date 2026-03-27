# 输出文件模板

本文件包含 AgentForge 生成蓝图时使用的所有输出文件模板。生成第 10 轮蓝图时，严格按照以下模板格式填充具体内容。

## 目录

1. [README.md 模板](#1-readmemd-模板)
2. [REQUIREMENTS.md 模板](#2-requirementsmd-模板)
3. [ARCHITECTURE.md 模板](#3-architecturemd-模板)
4. [UI_DESIGN_GUIDE.md 模板](#4-ui_design_guidemd-模板)
5. [API_INTEGRATION.md 模板](#5-api_integrationmd-模板)
6. [TODO.md 模板](#6-todomd-模板)
7. [TESTING.md 模板](#7-testingmd-模板)
8. [blueprint.yaml 模板](#8-blueprintyaml-模板)

---

## 1. README.md 模板

```markdown
# {{PROJECT_NAME}}

> {{ONE_LINE_DESCRIPTION}}

## 功能特性

{{#each FEATURES}}
- {{this.icon}} **{{this.name}}**：{{this.description}}
{{/each}}

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | {{LANGUAGE}} |
| 后端框架 | {{BACKEND_FRAMEWORK}} |
| 前端框架 | {{FRONTEND_FRAMEWORK}} |
| AI 框架 | {{AI_FRAMEWORK}} |
| 数据库 | {{DATABASE}} |
| 测试 | {{TEST_FRAMEWORK}} |

## 快速启动

### 环境要求
{{#each PREREQUISITES}}
- {{this}}
{{/each}}

### 安装步骤
\```bash
# 1. 克隆项目
git clone {{REPO_URL}}
cd {{PROJECT_DIR}}

# 2. 安装依赖
{{INSTALL_COMMAND}}

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key

# 4. 启动项目
{{START_COMMAND}}
\```

## 项目结构

\```
{{PROJECT_STRUCTURE}}
\```

## 变更历史

| 版本 | 日期 | 描述 |
|------|------|------|
| v1.0 | {{DATE}} | 初始版本 |
```

---

## 2. REQUIREMENTS.md 模板

```markdown
# 需求规格说明书

## 1. 项目背景
{{PROJECT_BACKGROUND}}

## 2. 目标用户
- **用户画像**：{{USER_PERSONA}}
- **使用场景**：{{USE_SCENARIO}}
- **技术水平**：{{USER_TECH_LEVEL}}

## 3. 核心功能需求

### F-001: {{FEATURE_1_NAME}}
- **描述**：{{FEATURE_1_DESCRIPTION}}
- **优先级**：P0
- **输入**：{{INPUT}}
- **输出**：{{OUTPUT}}
- **验收标准**：
  - [ ] {{ACCEPTANCE_1}}
  - [ ] {{ACCEPTANCE_2}}

### F-002: {{FEATURE_2_NAME}}
...

## 4. 非功能性需求

### 4.1 性能
- 响应时间：{{RESPONSE_TIME}}
- 并发量：{{CONCURRENCY}}

### 4.2 安全
{{SECURITY_REQUIREMENTS}}

### 4.3 可用性
{{USABILITY_REQUIREMENTS}}

## 5. 约束条件
{{CONSTRAINTS}}

## 6. 技术边界
- **能做**：{{CAN_DO}}
- **不能做**：{{CANNOT_DO}}
```

---

## 3. ARCHITECTURE.md 模板

```markdown
# 系统架构设计

## 1. 架构概览

\```mermaid
graph TD
    A[用户界面] --> B[API 层]
    B --> C[Agent 核心]
    C --> D[AI 模型适配层]
    C --> E[工具调用层]
    C --> F[记忆管理层]
    D --> G[{{MODEL_PROVIDER}}]
    E --> H[{{TOOL_1}}]
    E --> I[{{TOOL_2}}]
    F --> J[{{MEMORY_STORAGE}}]
\```

## 2. 模块划分

### 2.1 用户界面层
- **职责**：{{UI_RESPONSIBILITY}}
- **技术**：{{UI_TECH}}

### 2.2 API 层
- **职责**：请求路由、参数校验、身份验证
- **技术**：{{API_TECH}}

### 2.3 Agent 核心层
- **模式**：{{AGENT_PATTERN}} (如 ReAct / Plan-and-Execute)
- **决策流程**：
  \```
  {{DECISION_FLOW}}
  \```

### 2.4 AI 模型适配层
- **设计**：通用适配器模式
- **支持模型**：{{SUPPORTED_MODELS}}
- **切换方式**：环境变量配置，无需改代码

### 2.5 工具调用层
{{#each TOOLS}}
- **{{this.name}}**：{{this.description}}
{{/each}}

### 2.6 记忆管理层
- **类型**：{{MEMORY_TYPE}}
- **存储**：{{MEMORY_STORAGE}}

## 3. 数据流

\```
用户输入 → 界面层 → API 层 → Agent 核心
  → 判断是否需要工具调用
    → 是 → 调用工具 → 获取结果 → 回到 Agent 核心
    → 否 → 直接调用模型
  → 模型生成回复 → 存储到记忆 → 返回给用户
\```

## 4. 目录结构

\```
{{DIRECTORY_STRUCTURE}}
\```

## 5. 开发架构：外部记忆 + 双阶段

### 核心原则：硬盘换内存
- 每轮开发上下文可清零
- 文件系统(Git)保留完整状态
- 通过读取文件恢复上下文

### 外部记忆文件
- `TODO.md` — 任务状态跟踪
- `DEV_LOG.md` — 开发日志
- `FAILURES.md` — 失败记录
- `.git/` — 版本控制与回滚

### Phase 1: 初始化（一次性）
{{PHASE_1_STEPS}}

### Phase 2: 增量开发（循环）
每轮：读取状态 → 写测试 → 写代码 → 跑测试 → 提交 → 清上下文
```

---

## 4. UI_DESIGN_GUIDE.md 模板

仅 GUI 项目需要生成此文件。

```markdown
# UI 设计指南

> 本文件是所有 UI 开发的唯一设计准则。
> Phase 2 每轮开发必须严格遵循本指南，确保全局视觉一致性。

## 1. 设计原则
- {{PRINCIPLE_1}} （如：简洁克制，减少视觉噪音）
- {{PRINCIPLE_2}} （如：信息层级清晰，重要内容突出）
- {{PRINCIPLE_3}} （如：交互反馈即时，状态变化可感知）

## 2. 配色方案

### 亮色模式
| 用途 | 色值 | 示例 |
|------|------|------|
| 主色 (Primary) | {{PRIMARY_COLOR}} | 按钮、链接、高亮 |
| 辅色 (Secondary) | {{SECONDARY_COLOR}} | 次要按钮、标签 |
| 强调色 (Accent) | {{ACCENT_COLOR}} | 通知、徽标、重要提示 |
| 背景色 (Background) | {{BG_COLOR}} | 页面底色 |
| 表面色 (Surface) | {{SURFACE_COLOR}} | 卡片、弹窗底色 |
| 文字色-主 | {{TEXT_PRIMARY}} | 标题、正文 |
| 文字色-次 | {{TEXT_SECONDARY}} | 说明文字、占位符 |
| 边框色 | {{BORDER_COLOR}} | 分割线、输入框边框 |
| 成功色 | {{SUCCESS_COLOR}} | 成功状态 |
| 警告色 | {{WARNING_COLOR}} | 警告状态 |
| 错误色 | {{ERROR_COLOR}} | 错误状态 |

### 暗色模式
| 用途 | 色值 |
|------|------|
| ... | ... |

## 3. 字体规范

| 类型 | 字体 | 字号 | 字重 | 行高 |
|------|------|------|------|------|
| H1 标题 | {{FONT_FAMILY}} | 28px | 700 | 1.3 |
| H2 标题 | {{FONT_FAMILY}} | 22px | 600 | 1.3 |
| H3 标题 | {{FONT_FAMILY}} | 18px | 600 | 1.4 |
| 正文 | {{FONT_FAMILY}} | 15px | 400 | 1.6 |
| 辅助文字 | {{FONT_FAMILY}} | 13px | 400 | 1.5 |
| 代码 | {{MONO_FONT}} | 14px | 400 | 1.5 |

## 4. 间距系统
- 基础单位：4px
- 间距阶梯：4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px
- 组件内间距：通常 12-16px
- 组件间间距：通常 16-24px
- 区块间间距：通常 32-48px

## 5. 圆角规范
| 元素 | 圆角 |
|------|------|
| 按钮 | {{BUTTON_RADIUS}} |
| 输入框 | {{INPUT_RADIUS}} |
| 卡片 | {{CARD_RADIUS}} |
| 对话气泡 | {{BUBBLE_RADIUS}} |
| 头像 | 50% (圆形) |

## 6. 阴影规范
| 层级 | 阴影值 |
|------|--------|
| 低 (卡片) | 0 1px 3px rgba(0,0,0,0.1) |
| 中 (下拉框) | 0 4px 12px rgba(0,0,0,0.12) |
| 高 (弹窗) | 0 8px 24px rgba(0,0,0,0.16) |

## 7. 核心组件规范

### 7.1 按钮
- **主按钮**：背景 {{PRIMARY_COLOR}}，文字白色，hover 加深 10%
- **次按钮**：背景透明，边框 {{PRIMARY_COLOR}}，文字 {{PRIMARY_COLOR}}
- **危险按钮**：背景 {{ERROR_COLOR}}，文字白色
- **禁用态**：opacity 0.5，cursor not-allowed
- **尺寸**：大 (44px高) / 中 (36px高) / 小 (28px高)

### 7.2 输入框
- 高度：40px
- 边框：1px solid {{BORDER_COLOR}}
- 聚焦：边框变为 {{PRIMARY_COLOR}}，外发光 0 0 0 3px rgba(primary, 0.1)
- 错误态：边框变为 {{ERROR_COLOR}}

### 7.3 对话气泡
- **用户消息**：背景 {{PRIMARY_COLOR}}，文字白色，右对齐
- **AI 消息**：背景 {{SURFACE_COLOR}}，文字 {{TEXT_PRIMARY}}，左对齐
- 最大宽度：容器的 75%
- 内间距：12px 16px

### 7.4 导航栏
{{NAV_SPEC}}

### 7.5 侧边栏
{{SIDEBAR_SPEC}}

### 7.6 卡片
{{CARD_SPEC}}

## 8. 响应式断点
| 断点名 | 宽度 | 布局调整 |
|--------|------|----------|
| mobile | < 768px | 单列布局，隐藏侧边栏 |
| tablet | 768-1024px | 可折叠侧边栏 |
| desktop | > 1024px | 完整布局 |

## 9. 动画与过渡
- 默认过渡：all 0.2s ease
- 页面切换：fade 0.3s
- 弹窗出现：scale(0.95→1) + fade，0.2s ease-out
- 加载动画：{{LOADING_ANIMATION}}

## 10. 图标规范
- 风格：{{ICON_STYLE}}（如 outlined / filled / duotone）
- 图标库：{{ICON_LIBRARY}}（如 Lucide / Heroicons / Material Icons）
- 尺寸：16px (内联) / 20px (按钮) / 24px (导航)
```

---

## 5. API_INTEGRATION.md 模板

```markdown
# API 集成规范

## 1. AI 模型适配层设计

### 通用接口
所有模型调用通过统一适配器，支持零代码切换模型。

\```
interface AIProvider {
  chat(messages: Message[], options?: ModelOptions): AsyncStream<string>
  embed(text: string): Promise<number[]>  // 如需向量化
}
\```

### 已配置模型
| 提供商 | 模型 | 环境变量 | 用途 |
|--------|------|----------|------|
| {{PROVIDER}} | {{MODEL}} | {{ENV_VAR}} | 主模型 |

### 配置方式
\```
# .env 文件
{{ENV_VAR}}=your-api-key-here
AI_MODEL={{MODEL}}
AI_BASE_URL={{BASE_URL}}  # 可选，自定义端点
AI_TEMPERATURE={{TEMPERATURE}}
AI_MAX_TOKENS={{MAX_TOKENS}}
\```

## 2. 请求规范
{{REQUEST_SPEC}}

## 3. 错误处理
| 错误码 | 含义 | 处理方式 |
|--------|------|----------|
| 401 | API Key 无效 | 提示用户检查配置 |
| 429 | 速率限制 | 指数退避重试，最多 3 次 |
| 500 | 服务端错误 | 重试 1 次，失败则返回友好提示 |
| timeout | 超时 | 30s 超时，重试 1 次 |

## 4. 速率限制策略
- 请求间隔：最小 {{MIN_INTERVAL}}ms
- 并发限制：{{MAX_CONCURRENT}} 个同时请求
- 日限额：{{DAILY_LIMIT}}（如适用）

## 5. 工具调用规范
{{#each TOOLS}}
### {{this.name}}
- **用途**：{{this.purpose}}
- **调用方式**：{{this.method}}
- **输入格式**：{{this.input_format}}
- **输出格式**：{{this.output_format}}
- **错误处理**：{{this.error_handling}}
{{/each}}
```

---

## 6. TODO.md 模板

```markdown
# 功能开发任务清单

## Phase 1: 初始化
- [Done] T-000: 搭建项目脚手架
- [Done] T-001: 配置开发环境
- [Done] T-002: 初始化 Git
- [Done] T-003: 创建任务清单

## Phase 2: 核心功能
- [Todo] T-100: 实现基础对话界面
- [Todo] T-101: 集成 AI 模型 API
- [Todo] T-102: 实现消息历史记录
- [Todo] T-103: 实现流式响应输出
...

## Phase 2: 高级功能
- [Todo] T-200: 实现文件上传解析
- [Todo] T-201: 集成向量数据库
...

## Phase 2: UI/UX 完善
- [Todo] T-300: 响应式布局适配
- [Todo] T-301: 暗色模式支持
...

## 状态说明
- [Todo]        待开发
- [In Progress] 开发中
- [Done]        已完成
- [Failed]      开发失败（详见 FAILURES.md）
```

---

## 7. TESTING.md 模板

```markdown
# 测试策略

## 1. 测试方法：TDD（测试驱动开发）
每个功能开发流程：
1. 先写测试 → 运行确认失败（红灯）
2. 写最少代码让测试通过（绿灯）
3. 重构优化（保持绿灯）

## 2. 测试框架
| 类型 | 框架 | 配置 |
|------|------|------|
| 单元测试 | {{UNIT_FRAMEWORK}} | {{UNIT_CONFIG}} |
| 集成测试 | {{INTEGRATION_FRAMEWORK}} | {{INTEGRATION_CONFIG}} |
| E2E 测试 | {{E2E_FRAMEWORK}} | {{E2E_CONFIG}} |

## 3. 各功能测试用例

### T-100: {{FEATURE_NAME}}
| 用例 ID | 描述 | 输入 | 期望输出 | 类型 |
|---------|------|------|----------|------|
| TC-100-1 | {{TEST_DESC}} | {{INPUT}} | {{EXPECTED}} | unit |
| TC-100-2 | ... | ... | ... | ... |

### T-101: {{FEATURE_NAME}}
...

## 4. 验收测试清单
- [ ] 所有 P0 功能测试通过
- [ ] 所有 P1 功能测试通过
- [ ] API 调用错误处理正常
- [ ] UI 在所有目标平台上正常显示（如适用）
- [ ] 响应时间符合要求
- [ ] 无严重安全漏洞
```

---

## 8. blueprint.yaml 模板

```yaml
# ═══════════════════════════════════════
# AgentForge Blueprint — 机器可读蓝图
# 供 AI IDE (Cursor/Windsurf/Cline) 执行
# ═══════════════════════════════════════

version: "1.0"
generated_at: "{{TIMESTAMP}}"

# ─── 项目基本信息 ───
project:
  name: "{{PROJECT_NAME}}"
  description: "{{DESCRIPTION}}"
  type: "{{gui|cli}}"
  platform: "{{web|desktop|mobile|miniprogram|terminal}}"

# ─── 技术栈 ───
tech_stack:
  language: "{{LANGUAGE}}"
  runtime: "{{RUNTIME}}"
  package_manager: "{{PACKAGE_MANAGER}}"
  backend:
    framework: "{{BACKEND_FRAMEWORK}}"
    port: {{PORT}}
  frontend:  # 仅 GUI 项目
    framework: "{{FRONTEND_FRAMEWORK}}"
    ui_library: "{{UI_LIBRARY}}"
    css_framework: "{{CSS_FRAMEWORK}}"
    build_tool: "{{BUILD_TOOL}}"
  testing:
    unit: "{{UNIT_TEST_FRAMEWORK}}"
    integration: "{{INTEGRATION_TEST_FRAMEWORK}}"
    e2e: "{{E2E_TEST_FRAMEWORK}}"
  additional_dependencies:
    - name: "{{DEP_NAME}}"
      version: "{{VERSION}}"
      purpose: "{{PURPOSE}}"

# ─── AI 模型配置 ───
ai_config:
  provider: "{{PROVIDER}}"
  model: "{{MODEL}}"
  api_key_env: "{{ENV_VAR_NAME}}"
  base_url: "{{BASE_URL}}"  # 留空则使用官方默认
  parameters:
    temperature: {{TEMPERATURE}}
    max_tokens: {{MAX_TOKENS}}
    top_p: {{TOP_P}}
    stream: true

# ─── Agent 定义 ───
agent:
  role: "{{AGENT_ROLE_DESCRIPTION}}"
  goal: "{{AGENT_GOAL}}"
  pattern: "{{react|plan-and-execute|reflexion|custom}}"
  system_prompt: |
    {{AGENT_SYSTEM_PROMPT}}
  constraints:
    - "{{CONSTRAINT_1}}"
    - "{{CONSTRAINT_2}}"
  capabilities:
    - "{{CAPABILITY_1}}"
    - "{{CAPABILITY_2}}"
  memory:
    type: "{{buffer|summary|vector|hybrid}}"
    max_history: {{MAX_HISTORY_TURNS}}
    storage: "{{STORAGE_METHOD}}"

# ─── 工具定义 ───
tools:
  - name: "{{TOOL_NAME}}"
    type: "{{search|database|file|api|browser|code_execution|custom}}"
    description: "{{TOOL_DESCRIPTION}}"
    config:
      # 工具特定配置
      {{TOOL_CONFIG}}

# ─── UI 设计（仅 GUI） ───
ui_design:
  theme: "{{light|dark|auto}}"
  colors:
    primary: "{{HEX}}"
    secondary: "{{HEX}}"
    accent: "{{HEX}}"
    background: "{{HEX}}"
    surface: "{{HEX}}"
    text_primary: "{{HEX}}"
    text_secondary: "{{HEX}}"
    border: "{{HEX}}"
    success: "{{HEX}}"
    warning: "{{HEX}}"
    error: "{{HEX}}"
  typography:
    font_family: "{{FONT}}"
    mono_font: "{{MONO_FONT}}"
  border_radius:
    button: "{{VALUE}}"
    input: "{{VALUE}}"
    card: "{{VALUE}}"
  layout: "{{sidebar|top-nav|single-page|multi-page}}"
  responsive: true
  icon_library: "{{ICON_LIB}}"

# ─── 目录结构 ───
directory_structure: |
  {{PROJECT_NAME}}/
  ├── src/
  │   ├── agent/          # Agent 核心逻辑
  │   ├── tools/          # 工具实现
  │   ├── api/            # API 路由
  │   ├── ui/             # 前端（仅 GUI）
  │   ├── config/         # 配置文件
  │   └── utils/          # 工具函数
  ├── tests/
  │   ├── unit/
  │   ├── integration/
  │   └── e2e/
  ├── docs/               # 文档
  ├── .env.example
  ├── .gitignore
  ├── TODO.md
  ├── DEV_LOG.md
  ├── FAILURES.md
  └── {{CONFIG_FILES}}

# ─── 开发架构（固定） ───
development:
  methodology: "tdd"
  architecture: "external-memory-dual-phase"

  external_memory:
    - file: "TODO.md"
      purpose: "任务状态跟踪"
    - file: "DEV_LOG.md"
      purpose: "开发日志记录"
    - file: "FAILURES.md"
      purpose: "失败记录"
    - file: ".git"
      purpose: "版本控制与回滚"

  phase_1_initialization:
    description: "项目初始化 — 仅运行一次"
    run_once: true
    steps:
      - id: "init-001"
        action: "创建项目目录结构"
        command: "mkdir -p {{DIRS}}"
        validation: "目录结构存在"

      - id: "init-002"
        action: "初始化包管理器"
        command: "{{INIT_COMMAND}}"
        validation: "配置文件存在"

      - id: "init-003"
        action: "安装所有依赖"
        command: "{{INSTALL_COMMAND}}"
        validation: "依赖安装成功，无报错"

      - id: "init-004"
        action: "创建环境配置文件"
        files:
          - path: ".env.example"
            content: |
              {{ENV_TEMPLATE}}
          - path: ".gitignore"
            content: |
              {{GITIGNORE_CONTENT}}
        validation: "文件存在且内容正确"

      - id: "init-005"
        action: "初始化 Git 仓库"
        commands:
          - "git init"
          - "git add ."
          - "git commit -m 'chore: project initialization'"
        validation: "git log 显示首次提交"

      - id: "init-006"
        action: "创建 TODO.md"
        file: "TODO.md"
        content: |
          {{GENERATED_TODO_CONTENT}}
        validation: "文件存在，包含所有任务"

      - id: "init-007"
        action: "创建 UI_DESIGN_GUIDE.md"
        condition: "project.type == 'gui'"
        file: "UI_DESIGN_GUIDE.md"
        content: |
          {{GENERATED_UI_GUIDE}}
        validation: "文件存在"

      - id: "init-008"
        action: "创建开发日志和失败记录"
        files:
          - path: "DEV_LOG.md"
            content: |
              # 开发日志
              ## {{DATE}} - 项目初始化
              - 项目脚手架搭建完成
              - 所有依赖安装成功
              - Git 仓库初始化完成
              - 任务清单创建完成
          - path: "FAILURES.md"
            content: |
              # 失败记录
              暂无失败记录。
        validation: "文件存在"

      - id: "init-009"
        action: "创建测试配置"
        files:
          - path: "{{TEST_CONFIG_PATH}}"
            content: |
              {{TEST_CONFIG_CONTENT}}
        validation: "测试命令可运行（即使 0 个测试用例）"

      - id: "init-010"
        action: "提交初始化完成状态"
        commands:
          - "git add ."
          - "git commit -m 'chore: initialization complete, ready for development'"
        validation: "git status 显示 clean"

  phase_2_development:
    description: "增量循环开发"
    loop: true
    max_retries_per_feature: 3

    on_failure:
      strategy: "skip_and_log"
      actions:
        - "将错误信息追加到 FAILURES.md"
        - "git checkout . （回滚未提交的更改）"
        - "在 TODO.md 中将该任务标记为 [Failed]"
        - "继续下一个任务"

    on_complete:
      actions:
        - "展示 TODO.md 最终状态"
        - "如果有 [Failed] 任务，展示 FAILURES.md 汇总"
        - "运行全量测试，展示结果"

    cycle:
      - step: "read_state"
        description: "读取当前状态"
        actions:
          - "读取 TODO.md，找到第一个 [Todo] 状态的任务"
          - "读取 DEV_LOG.md 末尾 20 行，了解上轮情况"
          - "如果是 GUI 任务，读取 UI_DESIGN_GUIDE.md"
          - "将当前任务在 TODO.md 中标记为 [In Progress]"
        output: "当前要开发的任务详情"

      - step: "write_test"
        description: "编写测试用例（TDD - Red）"
        actions:
          - "根据任务描述和 blueprint.yaml 中的测试定义，编写测试"
          - "运行测试，确认当前状态下测试失败（红灯）"
        output: "测试文件路径"

      - step: "write_code"
        description: "实现功能代码"
        rules:
          - "一次只实现当前任务，不要越界"
          - "如果是 GUI 项目，严格遵循 UI_DESIGN_GUIDE.md 的设计规范"
          - "代码要有适当注释"
          - "遵循项目已有的代码风格"
        output: "修改/新增的文件列表"

      - step: "run_test"
        description: "运行测试验证"
        actions:
          - "运行当前任务相关的测试"
          - "如果通过（绿灯）→ 进入 git_commit"
          - "如果失败（红灯）→ 分析错误 → 修改代码 → 重新运行"
          - "最多重试 {{MAX_RETRIES}} 次"
        output: "测试结果 (pass/fail)"

      - step: "git_commit"
        description: "提交代码"
        actions:
          - "git add ."
          - "git commit -m 'feat(T-{{TASK_ID}}): {{TASK_SUMMARY}}'"
        output: "commit hash"

      - step: "update_state"
        description: "更新项目状态"
        actions:
          - "TODO.md: 将任务标记为 [Done] 或 [Failed]"
          - "DEV_LOG.md: 追加本轮开发记录"
          - "git add . && git commit -m 'docs: update progress for T-{{TASK_ID}}'"
        output: "更新后的 TODO.md"

      - step: "clear_context"
        description: "清空上下文，准备下一轮"
        note: "本轮对话结束。下一轮将从 read_state 重新开始，通过读取文件恢复上下文。"

    # ─── 功能任务列表 ───
    features:
      # ── 核心功能 ──
      - id: "T-100"
        name: "{{FEATURE_NAME}}"
        description: "{{DETAILED_DESCRIPTION}}"
        priority: "P0"
        dependencies: []
        estimated_complexity: "{{low|medium|high}}"
        implementation_notes: |
          {{SPECIFIC_GUIDANCE_FOR_AI}}
        tests:
          - id: "TC-100-1"
            description: "{{TEST_DESCRIPTION}}"
            type: "{{unit|integration|e2e}}"
            expected_result: "{{EXPECTED}}"
          - id: "TC-100-2"
            description: "{{TEST_DESCRIPTION}}"
            type: "{{unit|integration|e2e}}"
            expected_result: "{{EXPECTED}}"

      - id: "T-101"
        name: "{{FEATURE_NAME}}"
        # ... 同上结构

# ─── 上下文恢复 Prompt ───
context_recovery_prompt: |
  你是一个编码智能体，正在按照增量循环模式开发项目「{{PROJECT_NAME}}」。

  当前是新一轮循环的开始，你的上下文已被清空。
  请按以下步骤恢复上下文：

  1. 读取 `TODO.md`，找到第一个状态为 [Todo] 的任务
  2. 读取 `DEV_LOG.md` 末尾 20 行，了解上一轮的情况
  3. 如果当前任务涉及 UI，读取 `UI_DESIGN_GUIDE.md`
  4. 读取当前任务所在模块的已有代码，理解上下文

  然后按照 TDD 流程开发：写测试 → 写代码 → 跑测试 → 提交

  规则：
  - 一次只做一个任务
  - 测试失败最多重试 3 次
  - 3 次全失败则记录到 FAILURES.md，跳过继续下一个
  - 严格遵循已有代码风格和设计规范
  - 每完成一个任务必须 git commit

# ─── 验收标准 ───
acceptance_criteria:
  - description: "{{CRITERION}}"
    verification: "{{HOW_TO_VERIFY}}"
  - description: "所有 P0 功能测试通过"
    verification: "运行测试套件，P0 用例全部绿灯"
  - description: "UI 风格一致"
    verification: "检查所有页面是否遵循 UI_DESIGN_GUIDE.md"
  - description: "API 调用正常"
    verification: "使用有效 API Key 测试所有模型调用"
```
