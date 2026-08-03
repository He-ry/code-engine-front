# CodeEngine Front

基于 React 19 + Vite 6 + TypeScript 的全栈自主 AI Agent 工作区前端应用。

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | React 19、TypeScript 5.8 |
| 构建 | Vite 6、ESBuild |
| 样式 | Tailwind CSS 4 |
| 路由 | React Router DOM 7 |
| 动画 | Motion (Framer Motion) |
| 图标 | Lucide React |
| 代码高亮 | Prism.js |
| 服务端 | Express (开发代理) |
| AI | Google GenAI SDK |

## 目录结构

```
src/
├── components/          # UI 组件
│   ├── LoginPage.tsx    # 登录页面 (GitHub OAuth / Google OAuth / 邮箱)
│   ├── Sidebar.tsx      # 侧边栏导航
│   ├── TopNavbar.tsx    # 顶部导航栏
│   ├── PromptInput.tsx  # 命令输入框
│   ├── ChatStream.tsx   # AI 对话流
│   ├── CodeEditor.tsx   # 代码编辑器
│   ├── CodeBlock.tsx    # 代码块渲染
│   ├── CodexLogo.tsx    # Logo 组件
│   ├── ContextPopovers.tsx  # 上下文浮窗
│   ├── FileViewerModal.tsx  # 文件预览弹窗
│   ├── RightPanel.tsx   # 右侧面板
│   ├── TerminalPanel.tsx    # 终端面板
│   ├── SettingsModal.tsx    # 设置弹窗
│   ├── ToolExecutionGroup.tsx # 工具执行组
│   └── ToolInvocationCard.tsx # 工具调用卡片
├── context/             # React Context
│   ├── SettingsContext.tsx  # 全局设置、用户状态、多语言、主题
│   └── ToastContext.tsx     # Toast 通知
├── lib/                 # 工具库
│   ├── api.ts           # API 请求封装
│   └── agentClient.ts   # Agent 通信客户端
├── data/
│   └── mockData.ts      # Mock 数据
├── types.ts             # TypeScript 类型定义
├── App.tsx              # 应用入口
└── main.tsx             # 渲染入口
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 服务运行在 http://localhost:3000
```

## 脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (tsx server.ts) |
| `npm run build` | 生产构建 (Vite + ESBuild) |
| `npm start` | 运行生产构建 (node dist/server.cjs) |
| `npm run lint` | TypeScript 类型检查 |
| `npm run clean` | 清理构建产物 |

## 功能特性

- **多种登录方式**：GitHub OAuth、Google OAuth、邮箱登录，用户信息统一通过 `/api/auth/me` 获取
- **AI 对话工作区**：流式对话、代码生成、工具调用可视化
- **项目管理**：多项目切换，文件树浏览
- **代码编辑**：内置语法高亮代码编辑器
- **终端模拟**：实时终端输出展示
- **深色/浅色主题**：支持跟随系统
- **中英双语**：zh-CN / en-US 切换
- **Toast 通知**：统一浮动消息提示
- **响应式布局**：适配桌面端和移动端

## 环境变量

在项目根目录创建 `.env` 文件：

```env
GEMINI_API_KEY=your_gemini_api_key    # Google Gemini AI (可选)
GITHUB_CLIENT_ID=your_github_client_id # GitHub OAuth (可选)
GITHUB_CLIENT_SECRET=your_github_secret
```
