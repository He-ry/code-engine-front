import { Project, RecommendationCard, FileNode, CommandItem, ChatMessage } from "../types";

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "rec-search",
    name: "rec-search-platform",
    subtext: "",
    branch: "main",
    conversations: [],
    isActive: false,
  },
  {
    id: "blackbox",
    name: "blackbox-engine",
    subtext: "",
    branch: "rongshu-3.8.0",
    conversations: [
      { id: "conv-1", title: "rongshu-3.8.0" },
    ],
    isActive: true,
  },
];

export const RECOMMENDATION_CARDS: RecommendationCard[] = [
  {
    id: "expert",
    title: "专家",
    enTitle: "Expert",
    subtitle: "领域专家，提效能手",
    enSubtitle: "Domain expert to boost productivity",
    icon: "🎓",
    gradient: "from-blue-400 to-indigo-500",
    prompt: "@Ask 请担任系统架构专家，帮我重构 blackbox-engine 的核心代码逻辑",
    enPrompt: "@Ask Please act as a system architecture expert and help me refactor blackbox-engine core logic",
  },
  {
    id: "expert-group",
    title: "专家团",
    enTitle: "Expert Group",
    subtitle: "专业团队，分工协作",
    enSubtitle: "Professional team, collaborative execution",
    icon: "👷",
    gradient: "from-amber-400 to-orange-500",
    prompt: "/expert-group 组建包含前端、后端与测试的全栈团队，评估项目代码质量",
    enPrompt: "/expert-group Assemble a full-stack team with frontend, backend and QA to evaluate project code quality",
  },
  {
    id: "ppt-gen",
    title: "PPT 生成",
    enTitle: "PPT Generator",
    subtitle: "一键生成 PPT",
    enSubtitle: "One-click slide outline generation",
    icon: "🎨",
    gradient: "from-indigo-400 to-pink-500",
    prompt: "/generate-ppt 为 blackbox-engine 架构生成 10 页高质感技术汇报 PPT 大纲",
    enPrompt: "/generate-ppt Generate a 10-page tech presentation outline for blackbox-engine architecture",
  },
  {
    id: "nano-banana",
    title: "Nano Banana",
    enTitle: "Nano Banana",
    subtitle: "一句话生成任意照片",
    enSubtitle: "Generate any picture from a prompt",
    icon: "🍌",
    gradient: "from-yellow-400 to-purple-500",
    prompt: "/nano-banana 生成一张具有科技感的高级 IDE 界面插画",
    enPrompt: "/nano-banana Generate a futuristic tech IDE interface illustration",
  },
  {
    id: "popo-share",
    title: "发个 popo",
    enTitle: "Popo Share",
    subtitle: "产物快速发布与分享",
    enSubtitle: "Fast build artifact publishing and sharing",
    icon: "🥷",
    gradient: "from-pink-400 to-rose-500",
    prompt: "/popo-share 将当前 blackbox-engine 部署产物一键分享给团队成员",
    enPrompt: "/popo-share Share current blackbox-engine build artifacts with team members",
  },
  {
    id: "popo-square",
    title: "popo 作品广场",
    enTitle: "Popo Showcase",
    subtitle: "发现海量灵感作品",
    enSubtitle: "Discover creative community creations",
    icon: "🌈",
    gradient: "from-teal-400 to-blue-500",
    prompt: "浏览 popo 社区热度最高的 AI 辅助生成代码案例与优质 Prompts",
    enPrompt: "Browse trending AI-generated code showcases and top prompts in Popo community",
  },
];

export const SKILLS_LIST = [
  {
    id: "unit-test-gen",
    name: "单元测试生成器",
    enName: "Unit Test Generator",
    desc: "深度解析函数与类的输入输出，自动构建 90%+ 覆盖率的 Jest/Vitest 单元测试，包含边界异常校验与完整 Mock。",
    enDesc: "Deeply analyzes functions and class IO to auto-generate Jest/Vitest unit tests with 90%+ coverage, edge case validation, and complete mocks.",
    example: "自动为 core/engine.ts 核心解析例程补全单元测试",
    enExample: "Auto-generate unit tests for core/engine.ts parsing routines",
    category: "质量保障",
    enCategory: "QA & Testing",
  },
  {
    id: "code-refactor",
    name: "智能代码重构",
    enName: "Code Refactor Expert",
    desc: "基于洁净代码规范重构分支语句，降低函数圈复杂度，消除冗余，并重构命名以显著提升代码可读性。",
    enDesc: "Refactors logic based on clean code standards, reduces cyclomatic complexity, removes redundancy, and improves readability.",
    example: "对 data_clean_task.py 进行性能与代码结构重构",
    enExample: "Refactor performance and structure for data_clean_task.py",
    category: "代码优化",
    enCategory: "Code Optimization",
  },
  {
    id: "api-doc-gen",
    name: "API 文档自动生成",
    enName: "API Spec Generator",
    desc: "自动扫描代码中的 DTO 与 Controller 路由定义，一步提炼出标准的 OpenAPI 3.0 与 Markdown 接口规范文档。",
    enDesc: "Scans DTOs and Controller route definitions to produce OpenAPI 3.0 specs and Markdown API docs.",
    example: "解析 bottom 模块所有 REST 接口并导出 Markdown 文档",
    enExample: "Parse all REST APIs in bottom module and export Markdown docs",
    category: "文档协作",
    enCategory: "Documentation",
  },
  {
    id: "sql-optimizer",
    name: "SQL 慢查询优化",
    enName: "SQL Query Optimizer",
    desc: "分析 SQL 执行计划，识别全表扫描、N+1 风险与缺乏索引的连接条件，并输出高吞吐建索引策略。",
    enDesc: "Analyzes SQL execution plans, identifies full table scans and missing indexes, and outputs high-throughput index strategies.",
    example: "诊断行为日志表 def_ims 高并发场景下的查询延迟",
    enExample: "Diagnose query latency for log table def_ims under high concurrency",
    category: "数据库",
    enCategory: "Database",
  },
  {
    id: "security-audit",
    name: "Web 安全合规审计",
    enName: "Security Audit",
    desc: "扫描代码中潜在的 SQL 注入、XSS 漏洞、越权风险以及明文密钥泄露，提供一键修补建议。",
    enDesc: "Scans for SQL injection, XSS vulnerabilities, privilege risks, and plain-text secrets with one-click patch suggestions.",
    example: "对 application.yml 和系统配置进行安全隐患排查",
    enExample: "Audit application.yml and system configurations for security risks",
    category: "安全合规",
    enCategory: "Security",
  },
];

export const SUBAGENTS_LIST = [
  {
    id: "subagent-architect",
    name: "系统架构师 Subagent",
    enName: "System Architect Subagent",
    desc: "专注于高并发分布式架构演进与模块拆分建议。",
    enDesc: "Focuses on high-concurrency distributed architecture evolution and modular decomposition.",
  },
  {
    id: "subagent-tester",
    name: "全栈自动化测试 Subagent",
    enName: "Full-Stack QA Subagent",
    desc: "负责端到端 E2E 自动化测试用例搭建与链路走通。",
    enDesc: "Handles end-to-end (E2E) automated test suites and validation flows.",
  },
  {
    id: "subagent-security",
    name: "安全防御顾问 Subagent",
    enName: "Security Defense Subagent",
    desc: "评估代码防御力并协助建立安全屏障。",
    enDesc: "Evaluates code resilience and assists in building security guardrails.",
  },
];

export const MENU_ATTACHMENTS = [
  { id: "file", label: "添加文件", enLabel: "Add File", icon: "📄" },
  { id: "img", label: "添加图片", enLabel: "Add Image", icon: "🖼️" },
  { id: "figma", label: "Figma", enLabel: "Figma", icon: "🎨" },
  { id: "spec", label: "Spec", enLabel: "Spec", icon: "📄" },
  { id: "plan", label: "Plan", enLabel: "Plan", icon: "📐" },
  { id: "ask", label: "Ask", enLabel: "Ask", icon: "💬" },
  { id: "goal", label: "Goal", enLabel: "Goal", icon: "🎯" },
];

export const AUTO_ACCEPT_MODES = [
  {
    id: "auto-edit",
    title: "自动接受编辑",
    enTitle: "Auto Accept Edits",
    desc: "自动接受工作区内文件编辑和常见文件系统命令",
    enDesc: "Automatically accepts workspace file edits and standard file commands",
    checked: true,
  },
  {
    id: "auto-mode",
    title: "自动模式",
    enTitle: "Auto Mode",
    desc: "自动批准工具调用，并在后台进行安全检查",
    enDesc: "Automatically approves tool executions with background safety checks",
    checked: false,
  },
  {
    id: "bypass-perm",
    title: "绕过权限检查",
    enTitle: "Bypass Permissions",
    desc: "跳过权限提示，但根目录和主目录删除操作仍会拦截",
    enDesc: "Skips permission prompts, though root/home directory deletions are still blocked",
    checked: false,
  },
];

export const MODEL_OPTIONS = [
  { id: "auto", name: "Auto", provider: "智能模型选择", enProvider: "Smart Engine Selection" },
  { id: "glm-5.2", name: "GLM-5.2-内部", provider: "智谱 AI", enProvider: "Zhipu AI" },
  { id: "gemini-3.6", name: "Gemini 3.6 Flash", provider: "Google AI", enProvider: "Google AI" },
  { id: "claude-3.5", name: "Claude 3.5 Sonnet", provider: "Anthropic", enProvider: "Anthropic" },
  { id: "gpt-4o", name: "GPT-4o Engine", provider: "OpenAI", enProvider: "OpenAI" },
];

export const FILE_TREE_BLACKBOX: FileNode[] = [
  { name: ".claude", type: "folder", path: ".claude" },
  { name: ".idea", type: "folder", path: ".idea" },
  { name: "admin", type: "folder", path: "admin" },
  {
    name: "bottom",
    type: "folder",
    path: "bottom",
    children: [
      {
        name: "src",
        type: "folder",
        path: "bottom/src",
        children: [
          {
            name: "main",
            type: "folder",
            path: "bottom/src/main",
            children: [
              { name: "java", type: "folder", path: "bottom/src/main/java" },
              {
                name: "resources",
                type: "folder",
                path: "bottom/src/main/resources",
                children: [
                  {
                    name: "application.yml",
                    type: "file",
                    path: "bottom/src/main/resources/application.yml",
                    content: "server:\n  port: 8080\nspring:\n  application:\n    name: rec-bottom\n",
                  },
                  {
                    name: "bootstrap.yml",
                    type: "file",
                    path: "bottom/src/main/resources/bootstrap.yml",
                    content: "spring:\n  cloud:\n    config:\n      uri: http://config-server:8888\n",
                  },
                  {
                    name: "logback.xml",
                    type: "file",
                    path: "bottom/src/main/resources/logback.xml",
                    status: "M",
                    content: `<?xml version="1.0" encoding="UTF-8"?>
<configuration debug="false">
    <property name="LOG.HOME" value="./logs/rec-bottom" />
    <!-- 控制台输出 -->
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %green([%thread]) %highlight(%-5level) %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    <appender name="LOCALHOST" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>\${LOG.HOME}/localhost.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>\${LOG.HOME}/localhost.%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
            <cleanHistoryOnStart>true</cleanHistoryOnStart>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <logger name="com.baidu.acg" level="DEBUG"/>

    <root level="INFO">
        <appender-ref ref="STDOUT"/>
        <appender-ref ref="LOCALHOST"/>
    </root>
</configuration>`,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { name: "brs", type: "folder", path: "brs" },
  { name: "conf", type: "folder", path: "conf" },
  {
    name: "core",
    type: "folder",
    path: "core",
    hasDot: true,
    children: [
      {
        name: "app",
        type: "folder",
        path: "core/app",
        children: [
          {
            name: "template",
            type: "folder",
            path: "core/app/template",
            children: [
              {
                name: "tuwen_3_8_0",
                type: "folder",
                path: "core/app/template/tuwen_3_8_0",
                children: [
                  {
                    name: "app_search",
                    type: "folder",
                    path: "core/app/template/tuwen_3_8_0/app_search",
                    children: [
                      {
                        name: "resources",
                        type: "folder",
                        path: "core/app/template/tuwen_3_8_0/app_search/resources",
                        children: [
                          {
                            name: "etl",
                            type: "folder",
                            path: "core/app/template/tuwen_3_8_0/app_search/resources/etl",
                            children: [
                              {
                                name: "data_clean_task.py",
                                type: "file",
                                path: "core/app/template/tuwen_3_8_0/app_search/resources/etl/data_clean_task.py",
                                content: `"""
data_clean_task
数据清理任务
1. 删除指定时间字段用户行为数据
2. 删除指定时间字段的用户数据
"""
import argparse
import json
import logging
import sys
from datetime import datetime, timedelta

import yaml

from common_base import redis_util
from elasticsearch import Elasticsearch

from core.db.console_db import ProjectOfflineTask

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("data_clean_task")

# 读取离线任务依赖的 ES、Redis 配置
try:
    conf = yaml.load(open("./data_clean_task.yaml").read(), yaml.Loader)
except Exception as e:
    logger.warning("Failed to load local yaml config, using default structure: %s", e)
    conf = {
        "es": {"hosts": ["http://localhost:9200"]},
        "redis": {"hosts": "127.0.0.1:6379"}
    }

# ES client lazy initialization helper
class ESDataCleaner:
    def __init__(self, es_config: dict):
        self.config = es_config
        self._client = None

    @property
    def client(self) -> Elasticsearch:
        if not self._client:
            auth = None
            if 'http_auth_user' in self.config:
                auth = (self.config["http_auth_user"], self.config.get("http_auth_pass", ""))
            
            self._client = Elasticsearch(
                hosts=self.config.get("hosts", ["localhost:9200"]),
                http_auth=auth,
                max_retries=3,
                timeout=30,
                retry_on_timeout=True
            )
        return self._client

    def clean_action_data(self, target_date_str: str, index_name: str = "def_ims") -> dict:
        """
        通过 delete_by_query 批量清洗指定日期之前的行为日志数据
        """
        logger.info("Starting ES action data cleanup for index: %s before %s", index_name, target_date_str)
        query = {
            "query": {
                "range": {
                    "action_time": {
                        "lte": target_date_str
                    }
                }
            }
        }
        try:
            response = self.client.delete_by_query(
                index=index_name,
                body=query,
                conflicts="proceed",
                wait_for_completion=True
            )
            logger.info("ES Cleanup complete. Deleted: %d, Failures: %d", 
                        response.get("deleted", 0), len(response.get("failures", [])))
            return response
        except Exception as e:
            logger.error("Failed to execute ES delete_by_query: %s", e)
            raise e

# Redis client initialization helper
class RedisDataCleaner:
    def __init__(self, redis_config: dict):
        self.config = redis_config
        self._client = None

    @property
    def client(self):
        if not self._client:
            if "hosts" in self.config:
                self._client = redis_util.init_redis_by_conf(self.config["hosts"])
            elif "redis" in self.config:
                self._client = redis_util.init_redis_by_conf(self.config["redis"])
            else:
                self._client = redis_util.init_redis_by_conf(self.config)
        return self._client

    def clean_user_session_keys(self, pattern: str = "user:session:*") -> int:
        """
        批量删除匹配模式的旧用户 Session 或临时行为缓存
        """
        logger.info("Starting Redis key cleanup with pattern: %s", pattern)
        try:
            r = self.client
            cursor = 0
            total_deleted = 0
            while True:
                cursor, keys = r.scan(cursor=cursor, match=pattern, count=1000)
                if keys:
                    pipe = r.pipeline()
                    for key in keys:
                        pipe.delete(key)
                    pipe.execute()
                    total_deleted += len(keys)
                if cursor == 0:
                    break
            logger.info("Redis Cleanup complete. Total deleted keys: %d", total_deleted)
            return total_deleted
        except Exception as e:
            logger.error("Failed to execute Redis scan and delete: %s", e)
            return 0

# 行为数据清理，对应 def_ims 索引
ACTION_DATA_CLEAN = "ACTION_DATA_CLEAN"
# 用户数据清理，对应 def_ums 索引和用户 Redis key
USER_DATA_CLEAN = "USER_DATA_CLEAN"

def main():
    parser = argparse.ArgumentParser(description="Data Cleanup Offline Task Utility")
    parser.add_argument("--task-type", type=str, required=True, choices=[ACTION_DATA_CLEAN, USER_DATA_CLEAN],
                        help="The type of data cleanup task to execute")
    parser.add_argument("--before-days", type=int, default=30,
                        help="Clean up data older than N days")
    
    args = parser.parse_args()
    
    target_date = datetime.now() - timedelta(days=args.before_days)
    target_date_str = target_date.strftime("%Y-%m-%d %H:%M:%S")
    
    logger.info("Executing cleanup task: %s, Threshold date: %s", args.task_type, target_date_str)
    
    # 模拟从 console_db 获取任务元数据
    try:
        task_record = ProjectOfflineTask.get_active_task(task_type=args.task_type)
        if task_record:
            logger.info("Found database offline task record ID: %s", task_record.id)
    except Exception:
        logger.info("No database connection available, running in standalone script mode.")

    if args.task_type == ACTION_DATA_CLEAN:
        es_cleaner = ESDataCleaner(conf.get("es", {}))
        es_cleaner.clean_action_data(target_date_str=target_date_str)
    elif args.task_type == USER_DATA_CLEAN:
        redis_cleaner = RedisDataCleaner(conf.get("redis", {}))
        redis_cleaner.clean_user_session_keys(pattern=f"user:inactive:{args.before_days}d:*")

if __name__ == "__main__":
    main()`,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "engine.ts",
        type: "file",
        path: "core/engine.ts",
        content: `// Blackbox Engine Core Execution Routine
import { AICompletionEngine } from './completion';

export class BlackboxEngine {
  private completionEngine: AICompletionEngine;

  constructor() {
    this.completionEngine = new AICompletionEngine();
  }

  public async executeTask(prompt: string, context: Record<string, any>) {
    console.log('[BlackboxEngine] Executing task with prompt:', prompt);
    const result = await this.completionEngine.generateCode(prompt, context);
    return {
      status: 'success',
      code: result,
      executionTimeMs: 142,
    };
  }
}`,
      },
    ],
  },
  { name: "demo", type: "folder", path: "demo" },
  { name: "deploy", type: "folder", path: "deploy" },
  {
    name: "developer_tools",
    type: "folder",
    path: "developer_tools",
    hasDot: true,
  },
  { name: "doc", type: "folder", path: "doc", hasDot: true },
  {
    name: "fe",
    type: "folder",
    path: "fe",
    children: [
      {
        name: "App.tsx",
        type: "file",
        path: "fe/App.tsx",
        content: `import React from 'react';\n\nexport default function App() {\n  return <div className="p-4 text-gray-800">Blackbox Frontend Ready</div>;\n}`,
      },
    ],
  },
  { name: "h5demo", type: "folder", path: "h5demo" },
  { name: "k8s", type: "folder", path: "k8s" },
  { name: "mock_data", type: "folder", path: "mock_data" },
  { name: "script", type: "folder", path: "script" },
  { name: "scripts", type: "folder", path: "scripts", hasDot: true },
  { name: "tests", type: "folder", path: "tests" },
  { name: "tob", type: "folder", path: "tob" },
  { name: ".gitignore", type: "file", path: ".gitignore", content: "node_modules/\ndist/\n.env\n" },
  { name: ".iscan", type: "file", path: ".iscan", content: "# Security scanner configuration" },
  {
    name: "AGENTS.md",
    type: "file",
    path: "AGENTS.md",
    status: "U",
    content: `# Blackbox Engine Agent Instructions\n- Always optimize for speed and accuracy.\n- Follow clean TypeScript and React patterns.\n`,
  },
  { name: "base.Dockerfile", type: "file", path: "base.Dockerfile", content: "FROM node:20-alpine\nWORKDIR /app\n" },
  { name: "build.sh", type: "file", path: "build.sh", content: "#!/bin/bash\necho 'Building blackbox engine...'\n" },
];

export const EN_DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "user",
    text: "Please analyze the ES and Redis data cleanup logic in data_clean_task.py and provide refactoring suggestions.",
    timestamp: "12:30:15",
    contextPills: [
      { id: "p1", name: "Ask", type: "ask" },
      { id: "p2", name: "data_clean_task.py", type: "file" }
    ],
    mode: "Code",
    model: "DeepSeek-V3",
  },
  {
    id: "msg-2",
    sender: "ai",
    agentStatus: "completed",
    thinkingProcess: {
      durationSec: 3.2,
      thoughtText: `1. Extract target_file: core/app/template/.../data_clean_task.py and parse structure.
2. Discovered ES Client and Redis connections established at module import without connection pool idle protection or failover.
3. Found single-record loop deletion for Elasticsearch 'def_ims' index cleanup, resulting in low throughput.
4. Designed Lazy Load initialization scheme with delete_by_query batch processing API and type annotations.`,
      isCollapsed: false,
    },
    toolExecutions: [
      { id: "t1", name: "view_file", args: "path: 'app.py'", status: "success", result: "122 lines", duration: "110ms" },
      { id: "t2", name: "view_file", args: "path: '__init__.py'", status: "success", result: "2 lines", duration: "45ms" },
      { id: "t3", name: "view_file", args: "path: 'config.py'", status: "success", result: "210 lines", duration: "85ms" },
      { id: "t4", name: "view_file", args: "path: 'bootstrap.py'", status: "success", result: "22 lines", duration: "60ms" },
      { id: "t5", name: "view_file", args: "path: 'lifespan.py'", status: "success", result: "121 lines", duration: "95ms" },
      { id: "t6", name: "view_file", args: "path: 'router.py'", status: "success", result: "17 lines", duration: "40ms" }
    ],
    text: `Certainly! I have thoroughly inspected and parsed the cleanup workflow in \`data_clean_task.py\`.

### Core Diagnostics & Refactoring Highlights:
1. **Decouple Connection Initialization**: The script connects to ES and Redis directly at top-level. Recommended to use **Lazy Initialization** to connect when task actually starts.
2. **Connection Pool Reuse & High Availability**: Add exponential backoff retries to prevent Redis jitter from failing offline cleaning tasks.
3. **Batch Index Cleanup Optimization**: For Elasticsearch \`def_ims\` action data cleanup, adopt \`helpers.bulk\` or \`delete_by_query\` with shard parallelization for 3-5x efficiency boost.

Recommended refactored logic:`,
    timestamp: "12:30:18",
    codeSnippets: [
      {
        filename: "data_clean_task_optimized.py",
        language: "python",
        code: `class ESDataCleaner:
    def __init__(self, es_config: dict):
        self.config = es_config
        self._client = None

    @property
    def client(self) -> Elasticsearch:
        if not self._client:
            auth = (self.config.get("http_auth_user"), self.config.get("http_auth_pass"))
            self._client = Elasticsearch(
                hosts=self.config.get("hosts", ["localhost:9200"]),
                http_auth=auth if auth[0] else None,
                max_retries=3,
                timeout=30
            )
        return self._client

    def clean_action_data(self, target_date_str: str):
        query = {"query": {"range": {"action_time": {"lte": target_date_str}}}}
        return self.client.delete_by_query(index="def_ims", body=query)`
      }
    ]
  },
  {
    id: "msg-3",
    sender: "user",
    text: "The lazy loading and delete_by_query approach is great! Are all service environment variables mapped properly in docker-compose?",
    timestamp: "12:31:02",
    contextPills: [
      { id: "p3", name: "docker-compose.yaml", type: "file" }
    ],
    mode: "Code",
    model: "DeepSeek-V3",
  },
  {
    id: "msg-4",
    sender: "ai",
    agentStatus: "completed",
    thinkingProcess: {
      durationSec: 1.6,
      thoughtText: `1. Open and scan docker-compose.yaml file contents.
2. Validate environment variables, especially DB_URL, RUSTFS_ACCESS_KEY, RUSTFS_BUCKET.
3. Check port mapping configuration (7981:8000) for network conflicts.`,
      isCollapsed: true,
    },
    toolExecutions: [
      { id: "t4-1", name: "view_file", args: "path: '__init__.py'", status: "success", result: "17 lines", duration: "35ms" },
      { id: "t4-2", name: "view_file", args: "path: 'user.py'", status: "success", result: "26 lines", duration: "50ms" },
      { id: "t4-3", name: "view_file", args: "path: 'conversation.py'", status: "success", result: "24 lines", duration: "45ms" },
      { id: "t4-4", name: "view_file", args: "path: 'message.py'", status: "success", result: "30 lines", duration: "60ms" },
      { id: "t4-5", name: "view_file", args: "path: 'skill.py'", status: "success", result: "38 lines", duration: "70ms" }
    ],
    text: `Scanned and verified service mapping configuration in \`docker-compose.yaml\`:

- **Database Config**: \`DB_URL=sqlite+aiosqlite:////.data/xinsheng_homepage.db\` read/write volume mounted correctly;
- **RustFS Object Storage**: Endpoint points to \`192.168.1.111:3691\`, key and bucket (\`xinsheng-homepage\`) ready;
- **Port Mapping**: Backend port config \`7981:8000\` mapped without conflicts.

Global configuration and runtime environment are in a healthy ready state!`,
    timestamp: "12:31:05"
  },
  {
    id: "msg-5",
    sender: "user",
    text: "Please write the optimized ESDataCleaner into the project file and arrange the next deployment step.",
    timestamp: "12:32:00",
    contextPills: [
      { id: "p4", name: "Goal", type: "goal" }
    ],
    mode: "Code",
    model: "DeepSeek-V3",
  },
  {
    id: "msg-6",
    sender: "ai",
    agentStatus: "asking_clarification",
    thinkingProcess: {
      durationSec: 2.1,
      thoughtText: `1. User requests writing project file and preparing deployment.
2. Evaluate edit actions: writing data cleanup component and launching in docker environment.
3. To ensure production safety, ask for interactive confirmation on deployment mode and backup strategy.`,
      isCollapsed: false,
    },
    toolExecutions: [
      { id: "t6", name: "create_file", args: "path: '/src/services/es_cleaner.py'", status: "success", result: "Wrote 38 lines", duration: "150ms" },
      {
        id: "t8",
        name: "Run",
        description: "Display current system time and user",
        command: 'echo "Current time:" && date /T && echo "Current user:" && whoami',
        status: "pending",
        autoExecute: false
      }
    ],
    text: `Ready to integrate the refactored cleanup logic and connection pool mechanism into the project.

Before executing environment deployment, please confirm your deployment mode preference:`,
    timestamp: "12:32:04",
    clarificationQuestions: [
      {
        id: "cq-1",
        question: "1. What is the primary purpose of this agent?",
        options: [
          { letter: "A", label: "Code review", value: "code_review" },
          { letter: "B", label: "Deployment & DevOps", value: "devops" },
          { letter: "C", label: "Code exploration & search", value: "search_explore" },
          { letter: "D", label: "Testing & QA", value: "testing_qa" },
          { letter: "E", label: "Custom features (please describe)", value: "custom_feature", isCustomInput: true },
          { letter: "F", label: "Other...", value: "other" }
        ]
      },
      {
        id: "cq-2",
        question: "2. What name would you like to give to this agent?",
        options: [
          { letter: "A", label: "Blackbox Core Agent", value: "name_blackbox" },
          { letter: "B", label: "DeepSeek Assistant", value: "name_deepseek" },
          { letter: "C", label: "Custom Name...", value: "name_custom", isCustomInput: true }
        ]
      }
    ]
  }
];

export const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "user",
    text: "请帮我分析一下 data_clean_task.py 中关于 ES 和 Redis 数据清理逻辑的实现，并提出重构建议。",
    timestamp: "12:30:15",
    contextPills: [
      { id: "p1", name: "Ask", type: "ask" },
      { id: "p2", name: "data_clean_task.py", type: "file" }
    ],
    mode: "Code",
    model: "DeepSeek-V3",
  },
  {
    id: "msg-2",
    sender: "ai",
    agentStatus: "completed",
    thinkingProcess: {
      durationSec: 3.2,
      thoughtText: `1. 提取 target_file: core/app/template/.../data_clean_task.py 并解析结构。
2. 发现 ES Client 与 Redis 在模块引入阶段即建立链接，缺乏连接池怠速保护与故障转移。
3. 发现对 Elasticsearch 'def_ims' 索引清理使用单条循环删除，吞吐低且影响集群 I/O。
4. 设计 Lazy Load 惰性加载方案与 delete_by_query 批处理 API，补充类型标注。`,
      isCollapsed: false,
    },
    toolExecutions: [
      { id: "t1", name: "view_file", args: "path: 'app.py'", status: "success", result: "122 行", duration: "110ms" },
      { id: "t2", name: "view_file", args: "path: '__init__.py'", status: "success", result: "2 行", duration: "45ms" },
      { id: "t3", name: "view_file", args: "path: 'config.py'", status: "success", result: "210 行", duration: "85ms" },
      { id: "t4", name: "view_file", args: "path: 'bootstrap.py'", status: "success", result: "22 行", duration: "60ms" },
      { id: "t5", name: "view_file", args: "path: 'lifespan.py'", status: "success", result: "121 行", duration: "95ms" },
      { id: "t6", name: "view_file", args: "path: 'router.py'", status: "success", result: "17 行", duration: "40ms" }
    ],
    text: `好的，我已经深度读取并解析了 \`data_clean_task.py\` 的清理流程。

### 核心诊断与重构要点：
1. **连接初始化解耦**：脚本在模块顶层直接连接 ES 和 Redis，建议使用**惰性加载（Lazy Initialization）**，在任务实际启动时再建立网络连接。
2. **连接池复用与高可用**：添加指数退避重试（Exponential Backoff）机制，防止 Redis 瞬时抖动导致离线清洗任务中断。
3. **批量索引清理优化**：对 Elasticsearch 的 \`def_ims\` 行为数据清理，推荐采用 \`helpers.bulk\` 或 \`delete_by_query\` 结合分片并行化，效率可提升 3-5 倍。

推荐重构逻辑如下：`,
    timestamp: "12:30:18",
    codeSnippets: [
      {
        filename: "data_clean_task_optimized.py",
        language: "python",
        code: `class ESDataCleaner:
    def __init__(self, es_config: dict):
        self.config = es_config
        self._client = None

    @property
    def client(self) -> Elasticsearch:
        if not self._client:
            auth = (self.config.get("http_auth_user"), self.config.get("http_auth_pass"))
            self._client = Elasticsearch(
                hosts=self.config.get("hosts", ["localhost:9200"]),
                http_auth=auth if auth[0] else None,
                max_retries=3,
                timeout=30
            )
        return self._client

    def clean_action_data(self, target_date_str: str):
        query = {"query": {"range": {"action_time": {"lte": target_date_str}}}}
        return self.client.delete_by_query(index="def_ims", body=query)`
      }
    ]
  },
  {
    id: "msg-3",
    sender: "user",
    text: "这个惰性加载和 delete_by_query 的思路非常好！另外 docker-compose 中的服务环境变量都映射正常吗？",
    timestamp: "12:31:02",
    contextPills: [
      { id: "p3", name: "docker-compose.yaml", type: "file" }
    ],
    mode: "Code",
    model: "DeepSeek-V3",
  },
  {
    id: "msg-4",
    sender: "ai",
    agentStatus: "completed",
    thinkingProcess: {
      durationSec: 1.6,
      thoughtText: `1. 打开并扫描 docker-compose.yaml 文件内容。
2. 校验环境变量，特别是 DB_URL、RUSTFS_ACCESS_KEY、RUSTFS_BUCKET。
3. 检查端口映射配置 (7981:8000) 是否存在网络冲突或重叠。`,
      isCollapsed: true,
    },
    toolExecutions: [
      { id: "t4-1", name: "view_file", args: "path: '__init__.py'", status: "success", result: "17 行", duration: "35ms" },
      { id: "t4-2", name: "view_file", args: "path: 'user.py'", status: "success", result: "26 行", duration: "50ms" },
      { id: "t4-3", name: "view_file", args: "path: 'conversation.py'", status: "success", result: "24 行", duration: "45ms" },
      { id: "t4-4", name: "view_file", args: "path: 'message.py'", status: "success", result: "30 行", duration: "60ms" },
      { id: "t4-5", name: "view_file", args: "path: 'skill.py'", status: "success", result: "38 行", duration: "70ms" }
    ],
    text: `已为你扫描并验证 \`docker-compose.yaml\` 文件的服务映射配置：

- **数据库配置**：\`DB_URL=sqlite+aiosqlite:////.data/xinsheng_homepage.db\` 读写卷正常挂载；
- **RustFS 对象存储**：Endpoint 指向 \`192.168.1.111:3691\`，秘钥与存储桶（\`xinsheng-homepage\`）绑定就绪；
- **端口映射**：后端口配置 \`7981:8000\` 映射无冲突。

全局配置与代码运行环境均处于健康就绪状态！`,
    timestamp: "12:31:05"
  },
  {
    id: "msg-5",
    sender: "user",
    text: "请将优化后的 ESDataCleaner 写入项目文件，并为我安排下一步发布。",
    timestamp: "12:32:00",
    contextPills: [
      { id: "p4", name: "Goal", type: "goal" }
    ],
    mode: "Code",
    model: "DeepSeek-V3",
  },
  {
    id: "msg-6",
    sender: "ai",
    agentStatus: "asking_clarification",
    thinkingProcess: {
      durationSec: 2.1,
      thoughtText: `1. 用户请求修改项目文件并安排发布。
2. 评估修改动作：涉及写入数据清洗组件并在 docker 环境启动。
3. 为了保障生产环境安全，需要向用户发起**反问互动确认**（确认部署模式与备份方式）。`,
      isCollapsed: false,
    },
    toolExecutions: [
      { id: "t6", name: "create_file", args: "path: '/src/services/es_cleaner.py'", status: "success", result: "写入 38 行组件代码", duration: "150ms" },
      {
        id: "t8",
        name: "Run",
        description: "显示当前系统时间和用户",
        command: 'echo "当前时间:" && date /T && echo "当前用户:" && whoami',
        status: "pending",
        autoExecute: false
      }
    ],
    text: `已准备好将重构后的清理逻辑与连接池机制集成到项目中。

在执行环境部署前，请确认您的发布模式偏好：`,
    timestamp: "12:32:04",
    clarificationQuestions: [
      {
        id: "cq-1",
        question: "1. 你希望这个 agent 主要用来做什么？",
        options: [
          { letter: "A", label: "代码审查 (code review)", value: "code_review" },
          { letter: "B", label: "部署/运维相关", value: "devops" },
          { letter: "C", label: "代码探索与搜索", value: "search_explore" },
          { letter: "D", label: "测试与质量检查", value: "testing_qa" },
          { letter: "E", label: "自定义功能（请描述）", value: "custom_feature", isCustomInput: true },
          { letter: "F", label: "Other...", value: "other" }
        ]
      },
      {
        id: "cq-2",
        question: "2. 你想给这个 agent 起什么名字？",
        options: [
          { letter: "A", label: "Blackbox Core Agent", value: "name_blackbox" },
          { letter: "B", label: "DeepSeek Assistant", value: "name_deepseek" },
          { letter: "C", label: "自定义名称...", value: "name_custom", isCustomInput: true }
        ]
      }
    ]
  }
];

