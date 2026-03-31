# 个人求职辅助

基于 RAG + AI Agent 的个人求职辅助系统。集成知识库检索、智能简历生成（6 套模板）、面试准备、模拟面试等功能，支持 10+ 主流 LLM 提供商。

## 功能特性

### 智能助手
- AI Agent 对话，支持 SSE 流式输出
- 自动检索知识库中的个人文档（RAG）
- 联网搜索获取最新信息
- 跨页面工具调用（对话中可直接修改简历等）

### 简历编辑
- **6 套专业模板**：专业商务、简约现代、创意设计、技术极客、学术研究、高管精英
- **结构化数据驱动**：姓名、经历、技能等字段独立编辑，模板一键切换不丢失数据
- **AI 生成**：输入目标职位，Agent 从知识库提取信息自动生成完整简历
- **对话修改**：在聊天侧栏直接告诉 Agent 修改需求，预览确认后应用
- **多格式导出**：PDF、DOCX、Markdown
- **实时预览**：左侧表单编辑，右侧模板渲染同步更新

### 文档管理
- 上传 PDF、DOCX、TXT、Markdown 文档
- 自动分块、向量化，存入 ChromaDB
- 作为知识库供 Agent 检索引用

### 面试准备
- 根据目标职位和知识库生成面试题
- AI 评估答案并提供改进建议

### 模拟面试
- 实时语音面试（支持讯飞/百度语音）
- 语音转文字 → Agent 评估 → 文字转语音

### 设置
- 前端页面直接切换 LLM 提供商和修改 API Key
- 修改即时生效，无需重启

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + Zustand |
| 后端 | Python 3.11+ + FastAPI + Pydantic |
| AI Agent | ReAct 模式（Think → Act → Observe 循环） |
| 向量数据库 | ChromaDB |
| LLM 提供商 | Claude / OpenAI / DeepSeek / 智谱 / Moonshot / 通义千问 / Yi / 硅基流动 / Ollama / 自定义 |
| 简历导出 | WeasyPrint (PDF) + python-docx (DOCX) |
| 通信 | SSE 流式传输 + WebSocket (语音) |

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 18+
- 任意一个 LLM 提供商的 API Key（或本地 Ollama）

### 1. 克隆项目

```bash
git clone https://github.com/shuiyi5/personal-job-assistant.git
cd personal-job-assistant
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填入你的 LLM 提供商和 API Key：

```env
# 选择提供商（可选: claude / openai / deepseek / zhipu / moonshot / dashscope / yi / siliconflow / ollama / custom）
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat

# 填入对应提供商的 API Key
DEEPSEEK_API_KEY=sk-your-api-key-here
```

> 也可以启动后在「设置」页面直接修改，无需手动编辑文件。

### 3. 启动后端

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

> WeasyPrint (PDF 导出) 需要系统级依赖，macOS: `brew install pango`，Ubuntu: `apt install libpango-1.0-0 libpangocairo-1.0-0`

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

打开浏览器访问 http://localhost:5173

## 配置说明

### LLM 提供商配置

项目支持 10+ 提供商，只需在 `.env` 中设置 `LLM_PROVIDER` 和对应的 API Key：

| 提供商 | LLM_PROVIDER 值 | 需要配置 |
|--------|-----------------|---------|
| Anthropic Claude | `claude` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| 智谱 GLM | `zhipu` | `ZHIPU_API_KEY` |
| 月之暗面 Kimi | `moonshot` | `MOONSHOT_API_KEY` |
| 通义千问 | `dashscope` | `DASHSCOPE_API_KEY` |
| 零一万物 Yi | `yi` | `YI_API_KEY` |
| 硅基流动 | `siliconflow` | `SILICONFLOW_API_KEY` |
| Ollama (本地) | `ollama` | `OLLAMA_BASE_URL` |
| 自定义 | `custom` | `CUSTOM_BASE_URL` + `CUSTOM_API_KEY` + `CUSTOM_API_FORMAT` |

### 自定义提供商

接入任意 OpenAI/Claude 兼容的第三方 API：

```env
LLM_PROVIDER=custom
CUSTOM_API_FORMAT=openai       # openai 或 claude
CUSTOM_BASE_URL=https://your-proxy.com/v1
CUSTOM_API_KEY=sk-xxxxx
CUSTOM_MODEL=gpt-4o
```

### Embedding 配置

```env
EMBEDDING_PROVIDER=chroma      # chroma (默认，无需额外配置) | openai | sentence-transformers
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

### 语音服务（可选）

模拟面试的语音功能需要配置讯飞或百度语音 API：

```env
IFLYTEK_APP_ID=
IFLYTEK_API_KEY=
IFLYTEK_API_SECRET=
```

## 项目结构

```
├── backend/
│   ├── app/
│   │   ├── agents/          # AI Agent 实现（ReAct 模式）
│   │   │   ├── base.py      # Agent 基类 (Think → Act → Observe)
│   │   │   ├── unified_agent.py  # 统一全工具 Agent
│   │   │   ├── resume_agent.py   # 简历专用 Agent
│   │   │   └── ...
│   │   ├── api/             # FastAPI 路由端点
│   │   │   ├── chat.py      # 聊天 (SSE 流式)
│   │   │   ├── resume.py    # 简历生成/导出
│   │   │   ├── settings_api.py  # 设置读写
│   │   │   └── ...
│   │   ├── config/          # Pydantic Settings 配置
│   │   ├── models/          # LLM 提供商适配层
│   │   ├── rag/             # RAG 管线 (加载/分块/向量化/检索)
│   │   ├── schemas/         # Pydantic 数据模型
│   │   ├── services/        # 业务逻辑层
│   │   ├── tools/           # Agent 工具集
│   │   ├── utils/           # 导出工具 (PDF/DOCX)
│   │   └── voice/           # 语音服务 (讯飞/百度)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # React 组件
│   │   │   ├── Chat/        # 聊天面板
│   │   │   ├── Common/      # 通用组件 (侧栏/分割面板)
│   │   │   ├── Documents/   # 文档管理
│   │   │   └── Resume/      # 简历编辑器/预览/模板选择器
│   │   ├── pages/           # 页面级组件
│   │   ├── stores/          # Zustand 状态管理
│   │   ├── templates/       # 6 套简历 HTML 模板
│   │   ├── types/           # TypeScript 类型定义
│   │   └── services/        # API 服务层
│   ├── package.json
│   └── vite.config.ts
├── .env.example
├── .gitignore
└── README.md
```

## 使用指南

### 上传知识库文档

1. 进入「文档管理」页面
2. 上传你的个人简历、项目经历、技能证书等文档（支持 PDF/DOCX/TXT/MD）
3. 系统自动分块并存入向量数据库

### 生成简历

1. 进入「简历编辑」页面
2. 在顶部选择一个模板风格
3. 输入目标职位，点击「AI 生成简历」
4. Agent 会从知识库中提取你的信息，生成结构化简历
5. 在左侧表单中微调内容，右侧实时预览
6. 导出为 PDF / DOCX / Markdown

### 通过对话修改简历

1. 在简历页面，展开右侧 Agent 面板
2. 直接输入修改需求，如："把工作经历的描述改得更量化"
3. Agent 修改后会弹出预览确认，点击「应用」或「取消」

### 面试准备

1. 进入「面试准备」页面
2. 选择职位和面试类型
3. AI 生成面试题，你可以输入答案获取评估反馈

## 许可证

MIT License
