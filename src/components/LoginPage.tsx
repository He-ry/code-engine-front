import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useSettings, UserProfile } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { CodexLogo } from "./CodexLogo";
import {
  Mail,
  Eye,
  EyeOff,
  Globe,
  Sun,
  Moon,
  ArrowRight,
  Terminal,
  ShieldCheck,
  Cpu,
  Lock,
  Check,
  Loader2,
  FileCode,
  Zap,
  MessageSquare,
  Settings,
  Folder
} from "lucide-react";

// Pixel-perfect SVG for Google Icon
const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// Pixel-perfect SVG for GitHub Icon
const GithubIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
    />
  </svg>
);

// High-tech particles interactive background
const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
    }> = [];

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 800;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 10000), 100);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.3 + 0.1
        });
      }
    };

    let mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    resizeCanvas();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw very subtle lines
      ctx.strokeStyle = "rgba(14, 165, 233, 0.03)";
      ctx.lineWidth = 0.5;
      const gridSize = 64;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          p.x -= (dx / dist) * 0.3;
          p.y -= (dy / dist) * 0.3;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(14, 165, 233, ${p.alpha})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const ldx = p.x - p2.x;
          const ldy = p.y - p2.y;
          const ldist = Math.sqrt(ldx * ldx + ldy * ldy);
          if (ldist < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${(1 - ldist / 80) * 0.05})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (canvas) {
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

// Simulated internal workspace animation scenarios
interface MockScenario {
  prompt: string;
  agentText: string;
  fileName: string;
  code: string;
  toolLogs: string[];
  terminalLogs: string[];
}

const mockScenarios: MockScenario[] = [
  {
    prompt: "Refactor src/hooks/useAuth.ts to handle secure OAuth callback stream",
    agentText: "Reading source hooks. Refactoring useAuth.ts connection states with robust single sign-on event handlers...",
    fileName: "useAuth.ts",
    code: `import { useState, useEffect } from "react";
import { sdk } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    return sdk.auth.onStateChange((session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  return { user, isLoggedIn: !!user, loading };
}`,
    toolLogs: [
      "🔍 view_file: read src/hooks/useAuth.ts successfully",
      "📝 edit_file: injected secure onStateChange listener into module",
      "⚙️ tsc --noEmit: verifying static types... passed"
    ],
    terminalLogs: [
      "$ npm run build && lint_applet",
      "✔ Compilation complete. 0 syntax errors found.",
      "Agent port: 3000 online. Hot-reload ready."
    ]
  },
  {
    prompt: "Add dynamic PerformanceChart using Recharts to monitor cloud node speed",
    agentText: "Creating responsive PerformanceChart.tsx layout. Importing LineChart, XAxis, and responsive container configurations...",
    fileName: "PerformanceChart.tsx",
    code: `import React from "react";
import { LineChart, Line, XAxis, ResponsiveContainer } from "recharts";

export function PerformanceChart({ latencyLogs }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={latencyLogs}>
        <XAxis dataKey="time" stroke="#4b5563" fontSize={10} />
        <Line type="monotone" dataKey="ms" stroke="#0ea5e9" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}`,
    toolLogs: [
      "📦 install_applet_package: successfully mounted [recharts]",
      "📝 create_file: written src/components/PerformanceChart.tsx",
      "⚙️ lint_applet: static validation complete... passed"
    ],
    terminalLogs: [
      "$ npm run build && lint_applet",
      "✔ Compilation complete. 0 syntax errors found.",
      "Agent port: 3000 online. Hot-reload ready."
    ]
  }
];

export const LoginPage: React.FC = () => {
  const { language, setLanguage, theme, setTheme, login, t, backendApiUrl, setBackendApiUrl } = useSettings();
  const { showSuccess, showError } = useToast();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulated OAuth states
  const [oauthProvider, setOauthProvider] = useState<"github" | "google" | null>(null);
  const [oauthStep, setOauthStep] = useState<"connecting" | "authorize" | "completing">("connecting");
  const [showBackendConfig, setShowBackendConfig] = useState(false);

  // Latency telemetry simulation
  const [latency, setLatency] = useState(8);
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 4) + 6); // 6-9ms
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Workspace typing simulator states
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [animStep, setAnimStep] = useState<"prompt" | "thinking" | "coding" | "success">("prompt");
  const [typedPrompt, setTypedPrompt] = useState("");
  const [typedAgent, setTypedAgent] = useState("");
  const [typedCode, setTypedCode] = useState("");
  const [toolLogIdx, setToolLogIdx] = useState(0);

  useEffect(() => {
    const scenario = mockScenarios[scenarioIdx];
    let active = true;
    let timer: NodeJS.Timeout;

    if (animStep === "prompt") {
      setTypedPrompt("");
      setTypedAgent("");
      setTypedCode("");
      setToolLogIdx(0);

      let char = 0;
      const type = () => {
        if (!active) return;
        if (char < scenario.prompt.length) {
          setTypedPrompt(scenario.prompt.substring(0, char + 1));
          char++;
          timer = setTimeout(type, 30);
        } else {
          timer = setTimeout(() => {
            setAnimStep("thinking");
          }, 800);
        }
      };
      timer = setTimeout(type, 300);
    } 
    else if (animStep === "thinking") {
      let char = 0;
      const type = () => {
        if (!active) return;
        if (char < scenario.agentText.length) {
          setTypedAgent(scenario.agentText.substring(0, char + 1));
          char++;
          timer = setTimeout(type, 20);
        } else {
          let logIdx = 0;
          const showLogs = () => {
            if (!active) return;
            if (logIdx < scenario.toolLogs.length) {
              setToolLogIdx(logIdx + 1);
              logIdx++;
              timer = setTimeout(showLogs, 700);
            } else {
              timer = setTimeout(() => {
                setAnimStep("coding");
              }, 500);
            }
          };
          timer = setTimeout(showLogs, 300);
        }
      };
      timer = setTimeout(type, 200);
    } 
    else if (animStep === "coding") {
      let char = 0;
      const type = () => {
        if (!active) return;
        if (char < scenario.code.length) {
          setTypedCode(scenario.code.substring(0, char + 5));
          char += 5;
          timer = setTimeout(type, 12);
        } else {
          setTypedCode(scenario.code);
          timer = setTimeout(() => {
            setAnimStep("success");
          }, 800);
        }
      };
      timer = setTimeout(type, 300);
    } 
    else if (animStep === "success") {
      timer = setTimeout(() => {
        if (!active) return;
        setScenarioIdx((prev) => (prev + 1) % mockScenarios.length);
        setAnimStep("prompt");
      }, 4500);
    }

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [scenarioIdx, animStep]);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        !origin.endsWith(".run.app") && 
        !origin.includes("localhost") && 
        !origin.includes("127.0.0.1") &&
        !origin.includes("hery.cloud")
      ) {
        return;
      }
      
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const userProfile = event.data.user;
        login(userProfile);
        setOauthProvider(null);
      } else if (event.data?.type === "OAUTH_AUTH_FAILURE") {
        setOauthStep("authorize");
        showError(t("OAuth 登录失败", "OAuth Failed"), event.data.error || "OAuth Failed");
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [login, t, showError]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      showError(t("请输入邮箱地址", "Please enter your email address"));
      return;
    }
    if (!password || password.length < 6) {
      showError(t("密码长度不能少于 6 位", "Password must be at least 6 characters"));
      return;
    }

    setIsSubmitting(true);

    try {
      const baseUrl = backendApiUrl || "https://agent.hery.cloud";
      // Try standard login first
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: email,
          password: password,
        }),
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        const refreshToken = loginData.refresh_token;

        const meRes = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (meRes.ok) {
          const meData = await meRes.json();
          const u = meData.data || meData;
          const profile: UserProfile = {
            name: u.username || "",
            email: u.email || "",
            avatarUrl: u.avatar || "",
            provider: "email",
            token,
            refreshToken,
          };
          login(profile);
        } else {
          const profile: UserProfile = {
            name: "",
            email: email,
            avatarUrl: "",
            provider: "email",
            token,
            refreshToken,
          };
          login(profile);
        }
      } else {
        // If login failed, let's see if we should auto-register them
        const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: email,
            email: email,
            password: password,
            nick_name: email.split("@")[0],
          })
        });

        if (registerRes.ok) {
          // Re-try login after successful registration
          const loginRes2 = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: email,
              password: password,
            }),
          });

          if (loginRes2.ok) {
            const loginData2 = await loginRes2.json();
            const token2 = loginData2.access_token;
            const refreshToken2 = loginData2.refresh_token;

            // Fetch real profile from /api/auth/me
            let profile: UserProfile = {
              name: "",
              email: email,
              avatarUrl: "",
              provider: "email",
              token: token2,
              refreshToken: refreshToken2,
            };
            try {
              const meRes2 = await fetch(`${baseUrl}/api/auth/me`, {
                headers: { "Authorization": `Bearer ${token2}` }
              });
              if (meRes2.ok) {
                const meData2 = await meRes2.json();
                const u2 = meData2.data || meData2;
                profile.name = u2.username || "";
                profile.email = u2.email || email;
                profile.avatarUrl = u2.avatar || "";
              }
            } catch {}
            login(profile);
            showSuccess(t("登录成功", "Login Successful"), t(`欢迎回来，${profile.name}`, `Welcome back, ${profile.name}`));
            return;
          }
        }

        // If both failed, extract the error from response
        const errorText = await loginRes.text();
        let errorMsg = t("登录或注册失败，请检查账号密码", "Login or registration failed, please check your credentials");
        try {
          const errJson = JSON.parse(errorText);
          if (errJson.detail) {
            errorMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
          }
        } catch (_) {}
        showError(t("登录失败", "Login Failed"), errorMsg);
      }
    } catch (err: any) {
      console.error("Login process error:", err);
      const connErr = t("连接认证服务失败，请检查网络", "Failed to connect to authentication service, please check your network");
      showError(t("连接失败", "Connection Error"), connErr);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startOauth = (provider: "github" | "google") => {
    setOauthProvider(provider);
    handleAuthorizeOauth(provider);
  };

  const handleAuthorizeOauth = async (providerOverride?: "github" | "google") => {
    const activeProvider = providerOverride || oauthProvider;
    setOauthStep("connecting");

    try {
      let baseUrl = backendApiUrl ? backendApiUrl : "https://agent.hery.cloud";
      if (baseUrl.startsWith("http://agent.hery.cloud")) {
        baseUrl = baseUrl.replace("http://agent.hery.cloud", "https://agent.hery.cloud");
      }
      const callbackUrl = window.location.origin + "/auth/callback";

      const apiEndpoint = activeProvider === "google" 
        ? `${baseUrl}/api/auth/oauth/google?frontend_callback=${encodeURIComponent(callbackUrl)}`
        : `${baseUrl}/api/auth/oauth/github?frontend_callback=${encodeURIComponent(callbackUrl)}`;

      let authorizeUrl = "";
      let errorMsg = "";

      try {
        const res = await fetch(apiEndpoint);
        const data = await res.json();
        if (res.ok) {
          authorizeUrl = data.data?.authorize_url || data.authorize_url || data.url || "";
        } else {
          errorMsg = data.detail || data.message || `HTTP ${res.status}`;
        }
      } catch (e: any) {
        console.warn(`Failed fetching ${activeProvider} OAuth URL from backend:`, e);
        errorMsg = e.message || "Network error";
      }

      if (!authorizeUrl) {
        throw new Error(
          t(
            `无法从后端 API 获取 ${activeProvider ? activeProvider.toUpperCase() : "OAuth"} 授权链接: ${errorMsg || "未找到 authorize_url"}`,
            `Failed to get ${activeProvider ? activeProvider.toUpperCase() : "OAuth"} OAuth URL from API: ${errorMsg || "authorize_url not found"}`
          )
        );
      }

      // Force use of https for agent.hery.cloud redirect_uri to prevent protocol mismatches
      if (authorizeUrl.includes("http://agent.hery.cloud")) {
        authorizeUrl = authorizeUrl.replace(/http:\/\/agent\.hery\.cloud/g, "https://agent.hery.cloud");
      }
      if (authorizeUrl.includes("http%3A%2F%2Fagent.hery.cloud")) {
        authorizeUrl = authorizeUrl.replace(/http%3A%2F%2Fagent\.hery\.cloud/g, "https%3A%2F%2Fagent.hery.cloud");
      }

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // Try opening popup first, fallback to window.location.href if popup is blocked
      let popup: Window | null = null;
      try {
        popup = window.open(
          authorizeUrl,
          `${activeProvider}_oauth_popup`,
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=1`
        );
      } catch (e) {
        console.warn("Popup blocked, falling back to direct redirect:", e);
      }

      if (!popup || popup.closed) {
        // Fallback: Redirect main page directly to authorizeUrl
        window.location.href = authorizeUrl;
        return;
      }

      // Poll for popup closure so that we clear loading states if closed
      const timer = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(timer);
          setOauthProvider(null);
        }
      }, 1000);

      setOauthStep("completing");
    } catch (err: any) {
      setOauthProvider(null);
      setOauthStep("authorize");
      showError(t("OAuth 登录启动失败", "OAuth Failed"), err.message || `${activeProvider ? activeProvider.toUpperCase() : "OAuth"} 登录启动失败`);
    }
  };

  const scenario = mockScenarios[scenarioIdx];

  return (
    <div className="min-h-screen bg-[#fafafb] dark:bg-[#060608] text-gray-800 dark:text-zinc-200 flex flex-col justify-between relative font-sans transition-colors duration-300 overflow-hidden select-none">
      
      {/* Outer grid wrapper */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        
        {/* LEFT COLUMN: MINIMALIST PRODUCT INNER WORKSPACE PREVIEW */}
        <div className="hidden lg:flex lg:col-span-7 bg-[#08090c] border-r border-zinc-900 p-10 flex-col justify-between overflow-hidden relative">
          
          <ParticleCanvas />

          {/* Minimalist Top Branding info */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5">
              <CodexLogo size={36} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-zinc-100 font-mono">
                    CodeEngine Studio
                  </span>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-sky-950/40 text-sky-400 border border-sky-900/30 font-mono">
                    PROD
                  </span>
                </div>
              </div>
            </div>

            {/* Micro latency badge */}
            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-800/40 rounded-md py-1 px-2 text-[9px] font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{latency}ms latency</span>
            </div>
          </div>

          {/* Minimalist Interactive Workspace Mockup */}
          <div className="my-auto z-10 w-full max-w-2xl space-y-5">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                {t("全栈自主 AI Agent", "Autonomous Full-Stack AI Agent")}
              </h1>
              <p className="text-xs text-zinc-400 max-w-md font-sans">
                {t("实时指令流、双向代码注入与自动化 Agent 部署，让您的创意一秒触达。", "Real-time prompt streaming, hot module injection, and live Agent compilation.")}
              </p>
            </div>

            {/* High-fidelity internal IDE UI Mockup */}
            <div className="bg-[#0b0c10] rounded-lg border border-zinc-800/50 shadow-2xl overflow-hidden h-[340px] flex relative">
              
              {/* Minimalist Sidebar */}
              <div className="w-10 bg-[#0c0d11] border-r border-zinc-900 flex flex-col justify-between items-center py-4 shrink-0">
                <div className="space-y-3.5 flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <div className="p-1 text-sky-400 bg-sky-950/30 rounded-md">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors">
                    <FileCode className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-zinc-700">
                  <Settings className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chat Panel */}
              <div className="w-[40%] border-r border-zinc-900 flex flex-col bg-[#0e0f14] p-3 shrink-0">
                <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-900/60 mb-2.5 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[9px] font-bold font-mono text-zinc-400 uppercase tracking-wider">AI Coding Assistant</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 min-h-0 text-[11px] leading-relaxed">
                  {/* User query block */}
                  <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg p-2">
                    <div className="text-[8px] font-bold text-zinc-500 font-mono mb-0.5">REQUEST</div>
                    <p className="text-zinc-200">{typedPrompt || <span className="text-zinc-700">Awaiting user input...</span>}</p>
                  </div>

                  {/* Agent Reply block */}
                  {animStep !== "prompt" && typedAgent && (
                    <div className="bg-sky-950/10 border border-sky-900/20 rounded-lg p-2 space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-bold text-sky-400 font-mono">
                        <span>AGENT THOUGHTS</span>
                        <span className="text-[7px] text-zinc-500">models/flash</span>
                      </div>
                      <p className="text-zinc-300">{typedAgent}</p>

                      {/* Tool call sequence logs */}
                      {toolLogIdx > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-zinc-900/60 mt-1">
                          {scenario.toolLogs.slice(0, toolLogIdx).map((log, lidx) => (
                            <div key={lidx} className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-mono">
                              <span className="text-emerald-500">✔</span>
                              <span className="truncate">{log}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Success notification in chat */}
                  {animStep === "success" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg flex items-center gap-2"
                    >
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-[9px] text-emerald-400 font-mono uppercase tracking-wider font-semibold">Agent Build Safe</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Code Editor Panel */}
              <div className="flex-1 flex flex-col bg-[#0b0c10] min-w-0">
                {/* File Header */}
                <div className="bg-[#0e0f13] px-3 py-1.5 border-b border-zinc-900 flex items-center justify-between select-none shrink-0 text-[10px] text-zinc-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>{scenario.fileName}</span>
                  </div>
                  <span className="text-[8px] text-zinc-600">utf-8</span>
                </div>

                {/* Editor Content */}
                <div className="flex-1 p-3.5 overflow-y-auto text-[10px] text-zinc-300 leading-normal font-mono relative">
                  {typedCode ? (
                    <pre className="whitespace-pre-wrap">
                      <code>
                        {typedCode}
                        <span className="w-1.5 h-3 bg-sky-400 inline-block animate-pulse ml-0.5" />
                      </code>
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-700 text-[8px] uppercase tracking-wider">
                      Waiting for active code injection...
                    </div>
                  )}
                </div>

                {/* Bottom Terminal console */}
                <div className="bg-[#060709] h-20 p-2.5 font-mono text-[8px] text-zinc-500 border-t border-zinc-900 flex flex-col justify-end shrink-0">
                  <div className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest border-b border-zinc-900 pb-0.5 mb-1 flex justify-between">
                    <span>COMPILE OUT</span>
                    <span>bash</span>
                  </div>
                  <div className="space-y-0.5">
                    {animStep === "coding" && (
                      <div className="text-sky-500 flex items-center gap-1">
                        <Loader2 className="w-2 h-2 animate-spin" />
                        <span>Compiling project dependencies...</span>
                      </div>
                    )}
                    {(animStep === "success" || (animStep === "coding" && typedCode === scenario.code)) ? (
                      <div className="space-y-0.5">
                        <div className="text-zinc-600">$ npm run build && tsc --noEmit</div>
                        <div className="text-emerald-500 font-semibold">✔ Compiled successfully. 0 static errors.</div>
                        <div className="text-zinc-500">Live preview synchronized on port 3000.</div>
                      </div>
                    ) : (
                      animStep !== "coding" && <div className="text-zinc-700">Terminal idle. Waiting for compilation trigger.</div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Minimalist Footer details */}
          <div className="text-[9px] text-zinc-600 font-mono z-10 flex justify-between items-center border-t border-zinc-900 pt-3">
            <p>© {new Date().getFullYear()} CodeEngine. Autonomous AI Agent workflows.</p>
            <p className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>US-EAST5 Cluster Active</span>
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: DIRECT ELITE AUTHENTICATION PORTAL (NO PROMOTIONAL TOUR SWITCHER) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between bg-[#fafafb] dark:bg-[#070709] min-h-screen relative p-6 md:p-10 transition-colors">
          
          {/* Header Controls */}
          <header className="w-full flex justify-between items-center z-10 shrink-0 select-none">
            {/* Logo on mobile/small viewports */}
            <div className="flex lg:hidden items-center gap-2">
              <CodexLogo size={30} />
              <span className="font-bold text-xs tracking-tight text-gray-900 dark:text-zinc-100 font-mono">
                CodeEngine
              </span>
            </div>
            
            {/* Localization and Theme Switcher aligned beautifully on the right */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => setLanguage(language === "zh-CN" ? "en-US" : "zh-CN")}
                className="px-2 py-1 text-gray-500 dark:text-zinc-400 hover:bg-gray-200/40 dark:hover:bg-zinc-900 rounded-md transition-all border border-gray-200/50 dark:border-zinc-800/60 flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold"
              >
                <Globe className="w-3 h-3" />
                <span>{language === "zh-CN" ? "EN" : "中文"}</span>
              </button>

              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-1 text-gray-500 dark:text-zinc-400 hover:bg-gray-200/40 dark:hover:bg-zinc-900 rounded-md transition-all border border-gray-200/50 dark:border-zinc-800/60 cursor-pointer"
                title={t("切换主题", "Toggle Theme")}
              >
                {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </header>

          {/* Form Content */}
          <div className="my-auto w-full max-w-sm mx-auto py-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Security ID Badge */}
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 text-[9px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>SECURE ID GATEWAY</span>
              </div>

              {/* Title Header */}
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">
                  {t("登 录 账 户", "Sign In")}
                </h2>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-normal">
                  {t("连接至您的高性能 AI Agent 工作区，开启安全开发之旅", "Access your isolated development Agent workspace and cloud-IDE.")}
                </p>
              </div>

              {/* SSO Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => startOauth("github")}
                  disabled={oauthProvider !== null}
                  className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg transition-all cursor-pointer shadow-sm border border-transparent disabled:opacity-60"
                >
                  {oauthProvider === "github" ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  ) : (
                    <GithubIcon className="w-4 h-4 shrink-0" />
                  )}
                  <span>{oauthProvider === "github" ? t("正在连接...", "Connecting...") : "GitHub"}</span>
                </button>

                <button
                  onClick={() => startOauth("google")}
                  disabled={oauthProvider !== null}
                  className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-all border border-gray-200/80 dark:border-zinc-800 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {oauthProvider === "google" ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  ) : (
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                  )}
                  <span>{oauthProvider === "google" ? t("正在连接...", "Connecting...") : "Google"}</span>
                </button>
              </div>

              {/* Separator */}
              <div className="relative flex items-center justify-center py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200/80 dark:border-zinc-800/80" />
                </div>
                <span className="relative px-3 text-[9px] uppercase font-bold tracking-wider text-gray-400 dark:text-zinc-500 bg-[#fafafb] dark:bg-[#070709]">
                  {t("或使用电子邮箱", "or credentials")}
                </span>
              </div>

              {/* Form fields */}
              <form onSubmit={handleEmailLogin} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-mono">
                    {t("电子邮箱", "Email address")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type="email"
                      placeholder="developer@codeengine.dev"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white dark:bg-zinc-900/30 border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-mono">
                      {t("密码", "Password")}
                    </label>
                    <button
                      type="button"
                      className="text-[9px] font-semibold text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      {t("忘记密码？", "Forgot password?")}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs pl-9 pr-10 py-2.5 bg-white dark:bg-zinc-900/30 border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#0e0f14] hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-semibold text-xs disabled:opacity-50 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("验证账户中...", "Authenticating...")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("进 入 工 作 区", "Mount Workspace")}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

            </motion.div>
          </div>

          {/* Footer */}
          <footer className="w-full text-center text-[9px] text-gray-400 dark:text-zinc-600 shrink-0 select-none pt-4">
            <p>© {new Date().getFullYear()} CodeEngine Studio. {t("基于全链自主 AI Agent 容器构建", "Secure, Agent isolated developer workspace.")}</p>
          </footer>
        </div>

      </div>


    </div>
  );
};
