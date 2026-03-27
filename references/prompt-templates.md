# 关键 Prompt 模板

本文件包含 AgentForge 生成蓝图后，交给 AI IDE 执行的 Prompt 模板。

## 目录

1. [Phase 1 初始化 Prompt](#1-phase-1-初始化-prompt)
2. [Phase 2 循环开发 Prompt](#2-phase-2-循环开发-prompt)
3. [迭代更新 Prompt](#3-迭代更新-prompt)

---

## 1. Phase 1 初始化 Prompt

交给 AI IDE 执行，用于项目初始化。

```markdown
# 项目初始化任务

你是项目初始化智能体。你的任务是根据以下蓝图完成项目的初始化工作。

## 重要规则
1. **不要写任何业务代码**，只搭建脚手架和基础配置
2. 完成所有步骤后，项目应该能成功安装依赖、运行空测试
3. TODO.md 必须包含所有功能的原子级任务分解
4. 每个步骤完成后进行验证，验证失败则修复后重试

## 执行步骤
请严格按照 `blueprint.yaml` 中 `phase_1_initialization.steps` 的定义执行。

## 蓝图内容
\```yaml
{{PASTE_FULL_BLUEPRINT_YAML}}
\```

## 开始执行
请从 init-001 开始，按顺序执行每个步骤。每完成一个步骤，报告结果后继续下一个。
```

---

## 2. Phase 2 循环开发 Prompt

每轮循环开始时使用，用于增量开发。

```markdown
# 增量开发任务 — 新一轮循环

你是编码智能体，正在增量开发项目「{{PROJECT_NAME}}」。

## 上下文恢复
你的上下文已被清空。请先执行以下操作恢复状态：
1. `cat TODO.md` — 查看当前任务进度
2. `tail -20 DEV_LOG.md` — 查看最近的开发日志
3. 找到第一个 `[Todo]` 状态的任务，这就是你本轮要做的

## 开发流程（严格遵循）
1. **标记任务**：在 TODO.md 中将目标任务改为 `[In Progress]`
2. **写测试**：先写测试用例，运行确认是红灯（失败）
3. **写代码**：实现功能，一次只做这一个任务
4. **跑测试**：运行测试，确认绿灯（通过）
   - 失败？分析错误，修复，重试（最多 3 次）
   - 3 次全失败？→ 执行失败流程（见下方）
5. **提交**：`git add . && git commit -m 'feat(T-XXX): 功能描述'`
6. **更新状态**：TODO.md 标记 `[Done]`，DEV_LOG.md 追加记录
7. **再次提交**：`git add . && git commit -m 'docs: update progress'`

## 失败流程
如果某任务 3 次尝试均失败：
1. 将详细错误信息追加到 `FAILURES.md`
2. `git checkout .` 回滚未提交的更改
3. TODO.md 中标记为 `[Failed]`
4. DEV_LOG.md 记录失败原因
5. 继续下一个任务

## 设计规范
{{#if GUI_PROJECT}}
⚠️ 本项目有 GUI，所有 UI 开发必须严格遵循 `UI_DESIGN_GUIDE.md`。
开发 UI 相关任务前，请先 `cat UI_DESIGN_GUIDE.md` 查看设计规范。
{{/if}}

## 代码规范
- 遵循已有代码的风格和模式
- 添加必要的注释
- 保持函数单一职责
- 错误处理要完善

## 现在开始
请执行上下文恢复步骤，然后报告你将要开发的任务。
```

---

## 3. 迭代更新 Prompt

用户修改需求时使用。

```markdown
# 需求变更处理

用户提出了以下变更需求：
「{{USER_CHANGE_REQUEST}}」

## 处理流程

### 1. 影响分析
请分析此变更会影响哪些已有模块和文件：
- 需要修改的文件：
- 需要新增的文件：
- 需要删除的文件：
- 对已完成功能的影响：

### 2. 更新蓝图文件
需要更新以下文件（用 [UPDATED - {{变更描述}}] 标注变更处）：
- [ ] REQUIREMENTS.md
- [ ] ARCHITECTURE.md
- [ ] UI_DESIGN_GUIDE.md（如涉及 UI 变更）
- [ ] TODO.md（新增/修改/标记废弃任务）
- [ ] TESTING.md（更新测试用例）
- [ ] blueprint.yaml（同步更新所有变更）
- [ ] README.md（更新变更历史）

### 3. 如果有已完成的功能受影响
- 评估是否需要重新开发
- 如需重开发，在 TODO.md 中新增对应任务
- 保留原有 Git 提交记录，新的修改作为新提交
```
