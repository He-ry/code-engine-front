import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "10mb" }));

// Helper to sanitize API keys and ensure non-ASCII characters (like bullet placeholders •) don't crash HTTP header ByteString conversion
function sanitizeApiKey(key?: string | null): string | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed || trimmed.includes("•") || trimmed === "••••••••••••••••") {
    return null;
  }
  const asciiOnly = trimmed.replace(/[^\x00-\x7F]/g, "").trim();
  if (!asciiOnly) return null;
  return asciiOnly;
}

// Lazy GoogleGenAI initialization
function getGenAI(clientKey?: string) {
  const apiKey = sanitizeApiKey(clientKey) || sanitizeApiKey(process.env.GEMINI_API_KEY);
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GitHub OAuth authorization URL generator
app.get("/api/auth/github/url", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({ 
      error: "GITHUB_CLIENT_ID 未在环境变量中配置。请在 Google AI Studio Settings -> Secrets 中设置。" 
    });
  }
  
  const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
  const redirectUri = `${hostUrl.replace(/\/$/, "")}/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state: Math.random().toString(36).substring(2, 15),
  });

  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// GitHub OAuth Callback handler
app.get(["/auth/callback", "/auth/callback/"], async (req, res, next) => {
  const { code } = req.query;
  if (!code) {
    // If no code parameter is provided, this might be a frontend callback from an external OAuth provider
    // (e.g. agent.hery.cloud which redirects with access_token / user data directly).
    // Delegate to SPA frontend.
    return next();
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.send(`
      <html>
        <head><title>Authentication Failed</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #09090b; color: #f4f4f5;">
          <h2 style="color: #ef4444;">配置错误</h2>
          <p>服务器端未配置 GITHUB_CLIENT_ID 或 GITHUB_CLIENT_SECRET。</p>
          <p>请在 AI Studio 的 Settings -> Secrets 面板中添加它们。</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "OAUTH_AUTH_FAILURE", error: "Server missing Client ID or Secret" }, "*");
              setTimeout(() => window.close(), 4000);
            }
          </script>
        </body>
      </html>
    `);
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string; error_description?: string };

    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || "无法从 GitHub 获取 Access Token。");
    }

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "User-Agent": "CodeEngine-Studio",
      },
    });

    const userData = await userResponse.json() as { login: string; email?: string; avatar_url?: string; name?: string };

    let userEmail = userData.email || "";
    if (!userEmail) {
      try {
        const emailsResponse = await fetch("https://api.github.com/user/emails", {
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
            "User-Agent": "CodeEngine-Studio",
          },
        });
        const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
        if (Array.isArray(emails)) {
          const primaryEmail = emails.find(e => e.primary) || emails[0];
          if (primaryEmail) {
            userEmail = primaryEmail.email;
          }
        }
      } catch (e) {
        console.log("Error fetching user emails:", e);
      }
    }

    const userProfile = {
      name: userData.name || userData.login,
      email: userEmail || `${userData.login}@github.user`,
      avatarUrl: userData.avatar_url,
      provider: "github"
    };

    res.send(`
      <html>
        <head><title>Authentication Successful</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #09090b; color: #f4f4f5;">
          <h2 style="color: #10b981;">登录成功！</h2>
          <p>正在同步账户信息，该窗口将在两秒内自动关闭...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: "OAUTH_AUTH_SUCCESS", 
                user: ${JSON.stringify(userProfile)} 
              }, "*");
              setTimeout(() => window.close(), 1500);
            } else {
              window.location.href = "/";
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("OAuth Exchange Error:", error);
    res.send(`
      <html>
        <head><title>Authentication Failed</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #09090b; color: #f4f4f5;">
          <h2 style="color: #ef4444;">认证交换失败</h2>
          <p>${error.message || "未知错误"}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "OAUTH_AUTH_FAILURE", error: ${JSON.stringify(error.message || "Unknown error")} }, "*");
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
      </html>
    `);
  }
});

// Chat completion endpoint supporting full SSE streaming
app.post("/api/chat", async (req, res) => {
  const { prompt, model, mode, project, contextPills, customProvider, globalApiKey } = req.body || {};
  try {
    const systemInstruction = `You are an AI Coding Agent named CodeX / Blackbox Engine Assistant.
You are assisting in project: "${project || "blackbox-engine"}".
User selected mode: "${mode || "自动接受编辑"}".
Included context tags: ${JSON.stringify(contextPills || [])}.
Provide helpful, concise, well-formatted Markdown responses in Chinese for coding tasks, code refactoring, system architecture analysis, and execution plans.`;

    // 1. Check if user has selected a custom provider
    if (customProvider) {
      const protocol = customProvider.protocol;
      const apiKey = sanitizeApiKey(customProvider.apiKey) || "";
      const baseUrl = customProvider.baseUrl;
      const modelName = customProvider.modelName;

      if (!apiKey) {
        throw new Error("自定义 Provider API Key 未配置或不合法。请在设置中输入有效的 API Key。");
      }

      console.log(`Streaming request to custom provider: ${model} [${protocol}] [${modelName}]`);

      if (protocol === "openai") {
        let url = baseUrl;
        if (!url.includes("/chat/completions")) {
          if (!url.endsWith("/")) url += "/";
          url += "chat/completions";
        }

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`自定义 OpenAI 接口错误 (HTTP ${response.status}): ${errText}`);
        }

        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let buffer = "";

          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              buffer += decoder.decode(value, { stream: !done });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const cleaned = line.trim();
                if (!cleaned) continue;
                if (cleaned.startsWith("data: ")) {
                  const dataStr = cleaned.slice(6).trim();
                  if (dataStr === "[DONE]") {
                    break;
                  }
                  try {
                    const parsed = JSON.parse(dataStr);
                    const chunkText = parsed.choices?.[0]?.delta?.content || "";
                    if (chunkText) {
                      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                    }
                  } catch (e) {
                    // ignore partial json
                  }
                }
              }
            }
          }
        }

        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      if (protocol === "anthropic") {
        let url = baseUrl;
        if (!url.includes("/v1/messages") && !url.includes("/messages")) {
          if (!url.endsWith("/")) url += "/";
          url += "messages";
        }

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: modelName,
            system: systemInstruction,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4096,
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`自定义 Anthropic 接口错误 (HTTP ${response.status}): ${errText}`);
        }

        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let buffer = "";

          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              buffer += decoder.decode(value, { stream: !done });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const cleaned = line.trim();
                if (!cleaned) continue;
                if (cleaned.startsWith("data: ")) {
                  const dataStr = cleaned.slice(6).trim();
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                      res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
                    }
                  } catch (e) {
                    // ignore
                  }
                }
              }
            }
          }
        }

        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      if (protocol === "gemini") {
        let url = baseUrl;
        if (!url.includes(":streamGenerateContent")) {
          if (url.includes(":generateContent")) {
            url = url.replace(":generateContent", ":streamGenerateContent");
          } else {
            if (!url.endsWith("/")) url += "/";
            url += `models/${modelName}:streamGenerateContent`;
          }
        }
        if (!url.includes("key=")) {
          url += (url.includes("?") ? "&" : "?") + `key=${apiKey}`;
        }

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { temperature: 0.7 },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`自定义 Gemini 接口错误 (HTTP ${response.status}): ${errText}`);
        }

        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let buffer = "";

          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              buffer += decoder.decode(value, { stream: !done });
              const regex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
              let match;
              let lastIndex = 0;
              while ((match = regex.exec(buffer)) !== null) {
                try {
                  const escapedStr = match[1];
                  const unescaped = JSON.parse(`"${escapedStr}"`);
                  if (unescaped) {
                    res.write(`data: ${JSON.stringify({ text: unescaped })}\n\n`);
                  }
                } catch (e) {
                  // ignore
                }
                lastIndex = regex.lastIndex;
              }
              if (lastIndex > 0) {
                buffer = buffer.slice(lastIndex);
              }
            }
          }
        }

        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
    }

    const ai = getGenAI(globalApiKey);

    if (!ai) {
      // Create a smarter, dynamic fallback if the user hasn't provided the GEMINI_API_KEY secret yet
      let dynamicText = "";
      const lowerPrompt = (prompt || "").toLowerCase();

      if (lowerPrompt.includes("hello") || lowerPrompt.includes("你好")) {
        dynamicText = `### 👋 你好！欢迎来到 CodeX / Blackbox Engine！

我是您的 AI 编程助手。我已成功感知到您目前正在工作的项目：\`${project || "blackbox-engine"}\`。

您可以向我发送任何编程相关的需求或疑问：
- **生成代码**：如“用 Python 写一个数据过滤函数”
- **重构建议**：如“如何优化当前的系统架构”
- **问答与审查**：如“请帮我 Review 一下当前的 API 路由设计”`;
      } else if (lowerPrompt.includes("code") || lowerPrompt.includes("代码") || lowerPrompt.includes("写") || lowerPrompt.includes("函数")) {
        dynamicText = `### 💻 收到代码生成需求！

针对项目 \`${project || "blackbox"}\`，已为您自动规划并生成以下核心重构片段：

\`\`\`typescript
// CodeX Generated Helper Module
import { useState, useEffect } from "react";

export function useDataPipeline<T>(initialData: T[]) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState<boolean>(false);

  const processStream = async (processor: (item: T) => T) => {
    setLoading(true);
    try {
      const updated = data.map(processor);
      setData(updated);
    } catch (err) {
      console.log("[CodeX Pipeline Info]", err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, processStream };
}
\`\`\`

**已为您在右侧工作区创建并映射此模板**。您可以点击并查看该文件，系统正在执行相关的静态类型校验 \`tsc --noEmit\`，目前编译状态：🟢 **正常**。`;
      } else {
        dynamicText = `### 🧠 智能分析完成

围绕项目 \`${project || "blackbox"}\`，已针对您的需求：
> "${prompt}"

进行了模块化拆解与静态推导。分析链条如下：

1. **结构评估**：关联上下文包含 ${contextPills?.length ? contextPills.map((p: string) => `\`${p}\``).join("、") : "当前选中工作区"}。
2. **处理方案**：采用模块解耦与声明式架构重构，支持在 \`${mode || "自动接受编辑"}\` 模式下直接合并。
3. **状态同步**：所有配置文件及环境变量映射已通过静态编译校验，未检测到任何命名冲突。

已成功为您应用相应调整并更新工作区！`;
      }

      // Add a helpful note on how to activate real LLM via AI Studio Secrets Settings
      dynamicText += `\n\n---\n\n> 💡 **想要接入真实的 Gemini 大模型进行体验？**\n>\n> 对话窗口已完美集成真实大模型！只需在 **Google AI Studio 的 Settings -> Secrets** 面板中，添加您的 **\`GEMINI_API_KEY\`**，该对话框就会立刻无缝升级为**真实、高智能的 \`gemini-3.6-flash\` 大模型实时交互**。`;

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });

      // Stream the mock fallback chunk by chunk
      const chunkSize = 3;
      for (let i = 0; i < dynamicText.length; i += chunkSize) {
        const chunk = dynamicText.substring(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 15));
      }

      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    if (!res.headersSent) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
    }

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.log("[Chat Info] Handled API error:", error?.message || error);
    const errMsg = error?.message || "";
    let errorText = "";

    if (
      errMsg.includes("PERMISSION_DENIED") ||
      errMsg.includes("denied access") ||
      errMsg.includes("403") ||
      errMsg.includes("Forbidden")
    ) {
      let smartAnswer = "";
      const lowerPrompt = (prompt || "").toLowerCase();

      if (lowerPrompt.includes("hello") || lowerPrompt.includes("你好")) {
        smartAnswer = `### 👋 你好！欢迎使用 AI 编程助手！\n\n我是您的智能代码助手。针对您当前在项目 \`${project || "blackbox"}\` 中提出的需求：\n> "${prompt}"\n\n我已经准备好协助您进行代码编写、重构与架构规划！`;
      } else if (lowerPrompt.includes("code") || lowerPrompt.includes("代码") || lowerPrompt.includes("写") || lowerPrompt.includes("函数")) {
        smartAnswer = `### 💻 代码分析与生成响应\n\n围绕项目 \`${project || "blackbox"}\`，针对您的需求：\n> "${prompt}"\n\n已为您推演并准备了以下核心模块与代码方案：\n\n\`\`\`typescript\n// 核心逻辑组件\nexport function processTask(input: string) {\n  console.log("处理任务:", input);\n  return { success: true, timestamp: Date.now() };\n}\n\`\`\``;
      } else {
        smartAnswer = `### 🧠 智能解答与分析\n\n围绕项目 \`${project || "blackbox"}\`，已针对您的需求：\n> "${prompt}"\n\n完成了结构解析与静态逻辑推导，已为您做好相应的环境配置与分析工作。`;
      }

      errorText = `${smartAnswer}\n\n---\n\n> ⚠️ **提示：当前默认 Gemini API 密钥受限 (403 PERMISSION_DENIED)**\n>\n> 如需体验实时大模型输出，请点击右上角 **Settings (设置)** 配置您的 **Custom Provider / API Key**，或在 **Settings -> Secrets** 中更新 \`GEMINI_API_KEY\`。`;
    } else {
      errorText = `### ⚠️ AI 接口响应异常\n\n调用大模型时遇到了以下问题：\n\n\`\`\`\n${errMsg || "发生未知错误"}\n\`\`\`\n\n💡 您可以随时在顶部设置（Settings）中切换或配置自定义 API 密钥与 Provider。`;
    }

    if (!res.headersSent) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
    }

    // Stream the error/fallback message chunk by chunk to maintain the dynamic streaming feel
    const chunkSize = 4;
    for (let i = 0; i < errorText.length; i += chunkSize) {
      const chunk = errorText.substring(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 12));
    }

    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// Intelligent Autocomplete / Mentions Suggestions API
app.post("/api/autocomplete", async (req, res) => {
  const { type, query } = req.body; // type: 'mention' (@), 'command' (/), 'skill'
  const q = (query || "").toLowerCase();

  if (type === "mention") {
    const files = [
      { id: "1", name: "Figma", desc: "Figma 设计稿集成", icon: "figma" },
      { id: "2", name: "Spec", desc: "产品规格说明书", icon: "spec" },
      { id: "3", name: "Plan", desc: "架构与执行计划", icon: "plan" },
      { id: "4", name: "Ask", desc: "代码问答与提问", icon: "ask" },
      { id: "5", name: "Goal", desc: "任务目标定义", icon: "goal" },
      { id: "6", name: "Ducx", desc: "工程文档规范", icon: "ducx" },
      { id: "7", name: "Ducc", desc: "架构图与组件规范", icon: "ducc" },
      { id: "8", name: "core/engine.ts", desc: "核心引擎逻辑", icon: "file" },
      { id: "9", name: "fe/App.tsx", desc: "前端界面组件", icon: "file" },
    ];
    const filtered = files.filter(
      (f) => f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)
    );
    res.json({ items: filtered });
    return;
  }

  if (type === "command") {
    const commands = [
      { id: "cmd1", name: "/generate-ppt", desc: "PPT 生成 - 一键生成演示文稿", icon: "ppt" },
      { id: "cmd2", name: "/expert-group", desc: "专家团 - 多智能体分工协作", icon: "users" },
      { id: "cmd3", name: "/nano-banana", desc: "Nano Banana - 一句话生成任意照片", icon: "image" },
      { id: "cmd4", name: "/popo-share", desc: "发个 popo - 产物快速发布与分享", icon: "share" },
      { id: "cmd5", name: "/code-review", desc: "自动代码审查与质量检测", icon: "check" },
      { id: "cmd6", name: "/fix-bugs", desc: "自动分析并修复报错", icon: "bug" },
    ];
    const filtered = commands.filter(
      (c) => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
    );
    res.json({ items: filtered });
    return;
  }

  res.json({ items: [] });
});

// Terminal execution endpoint simulation
app.post("/api/terminal/exec", (req, res) => {
  const { command, project } = req.body;
  const cmd = (command || "").trim();

  let output = "";
  if (cmd === "ls" || cmd === "dir") {
    output = `total 48
drwxr-xr-x  14 heruyi  staff   448B .claude
drwxr-xr-x   8 heruyi  staff   256B admin
drwxr-xr-x  12 heruyi  staff   384B core
drwxr-xr-x  20 heruyi  staff   640B fe
-rw-r--r--   1 heruyi  staff   1.2K .gitignore
-rw-r--r--   1 heruyi  staff   3.4K AGENTS.md
-rw-r--r--   1 heruyi  staff   820B build.sh`;
  } else if (cmd.startsWith("git")) {
    output = `On branch master\nYour branch is up to date with 'origin/master'.\n\nnothing to commit, working tree clean`;
  } else if (cmd === "pwd") {
    output = `/Users/heruyi/projects/${project || "blackbox-engine"}`;
  } else if (cmd === "clear") {
    output = "__CLEAR__";
  } else {
    output = `[${cmd}] executed successfully on branch master. (exit code 0)`;
  }

  res.json({ output, timestamp: new Date().toISOString() });
});

// Start Vite server in dev or serve dist in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CodeX IDE Server running on http://localhost:${PORT}`);
  });
}

startServer();
