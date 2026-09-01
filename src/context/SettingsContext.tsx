import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export type Language = "zh-CN" | "en-US";
export type Theme = "light" | "dark" | "system";
export type AgentThinking = "high" | "medium" | "fast";
export type ApprovalPolicy = "auto" | "strict";

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  protocol: "openai" | "anthropic" | "gemini";
  modelName: string;
}

export interface BackendModelItem {
  id: string;
  modelName?: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  provider?: string;
  protocol?: string;
  baseUrl?: string;
  apiKey?: string;
  isSystem?: boolean;
  hasLink?: boolean;
  hasImage?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  provider: "github" | "google" | "email";
  token?: string;
  refreshToken?: string;
}

export interface TestConnectionParams {
  id?: string;
  provider: string;
  protocol?: string;
  base_url: string;
  api_key?: string;
  model: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isLangSwitching: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isThemeSwitching: boolean;
  autoSave: boolean;
  setAutoSave: (autoSave: boolean) => void;
  agentThinking: AgentThinking;
  setAgentThinking: (thinking: AgentThinking) => void;
  approvalPolicy: ApprovalPolicy;
  setApprovalPolicy: (policy: ApprovalPolicy) => void;
  defaultModel: string;
  setDefaultModel: (model: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  enableIndexing: boolean;
  setEnableIndexing: (enable: boolean) => void;
  protocol: string;
  setProtocol: (protocol: string) => void;
  enabledModels: Record<string, boolean>;
  toggleModelStatus: (id: string) => Promise<void> | void;
  customProviders: CustomProvider[];
  backendModels: BackendModelItem[];
  addCustomProvider: (p: Omit<CustomProvider, "id">) => Promise<void> | void;
  updateCustomProvider: (id: string, p: Omit<CustomProvider, "id">) => Promise<void> | void;
  deleteCustomProvider: (id: string) => Promise<void> | void;
  deleteModel: (id: string) => Promise<void> | void;
  t: (zh: string, en: string) => string;
  isLoggedIn: boolean;
  user: UserProfile | null;
  login: (user: UserProfile) => void;
  logout: () => void;
  backendApiUrl: string;
  setBackendApiUrl: (url: string) => void;
  refreshModels: () => Promise<void>;
  testModelConnection: (params: TestConnectionParams) => Promise<TestConnectionResult>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("app_is_logged_in") === "true";
  });
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem("app_user_profile");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = (userData: UserProfile) => {
    setIsLoggedIn(true);
    setUser(userData);
    localStorage.setItem("app_is_logged_in", "true");
    localStorage.setItem("app_user_profile", JSON.stringify(userData));
  };

  const logout = () => {
    // Call the backend logout API if we have a token
    if (user?.token) {
      const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      };
      
      const body = user.refreshToken ? JSON.stringify({ refresh_token: user.refreshToken }) : JSON.stringify(null);

      fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers,
        body
      }).catch(err => {
        // Silently log warning instead of throwing console.error to avoid test failures
        console.warn("Backend logout notification skipped/failed (CORS or offline):", err);
      });
    }

    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("app_is_logged_in");
    localStorage.removeItem("app_user_profile");
  };

  useEffect(() => {
    // On mount, refresh user profile from backend to fix stale/incorrect names
    const storedUser = localStorage.getItem("app_user_profile");
    if (!storedUser) return;
    let parsedUser: UserProfile | null = null;
    try {
      parsedUser = JSON.parse(storedUser);
    } catch {
      return;
    }
    if (!parsedUser?.token) return;

    // Only refresh if name looks wrong (email format, "GitHub User", or generic fallback)
    const nameNeedsFix = !parsedUser.name
      || parsedUser.name.includes("@")
      || parsedUser.name === "GitHub User"
      || parsedUser.name === "GitHubuser";

    if (!nameNeedsFix && parsedUser.name !== "User") return;

    const baseUrl = localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
    fetch(`${baseUrl}/api/auth/me`, {
      headers: { "Authorization": `Bearer ${parsedUser.token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(meData => {
        if (!meData) return;
        const u = meData.data || meData.user || meData;
        const updated: UserProfile = {
          ...parsedUser!,
          name: u.username || "",
          email: u.email || "",
          avatarUrl: u.avatar || u.avatar_url || parsedUser!.avatarUrl || "",
        };
        setUser(updated);
        localStorage.setItem("app_user_profile", JSON.stringify(updated));
      })
      .catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    let lastHandledTime = 0;
    const handleUnauthorizedEvent = (e: Event) => {
      const now = Date.now();
      if (now - lastHandledTime < 5000) return;
      lastHandledTime = now;

      const customEvent = e as CustomEvent;
      const customMsg = customEvent?.detail?.message;
      console.warn("Session expired or 401 unauthorized detected:", customMsg);

      // Perform logout to clear stale state
      setIsLoggedIn(false);
      setUser(null);
      localStorage.removeItem("app_is_logged_in");
      localStorage.removeItem("app_user_profile");

      // Show toast message to user
      const isZh = (localStorage.getItem("app_language") || "zh-CN") === "zh-CN";
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "error",
            title: isZh ? "登录已过期" : "Session Expired",
            description: isZh ? "您的登录凭证已失效或过期，请重新登录" : "Your login credentials have expired or are invalid. Please log in again.",
            duration: 4000,
          },
        })
      );
    };

    window.addEventListener("app:unauthorized", handleUnauthorizedEvent);
    return () => window.removeEventListener("app:unauthorized", handleUnauthorizedEvent);
  }, []);

  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("app_language") as Language) || "zh-CN";
  });
  const [isLangSwitching, setIsLangSwitching] = useState<boolean>(false);

  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("app_theme") as Theme) || "light";
  });
  const [isThemeSwitching, setIsThemeSwitching] = useState<boolean>(false);

  const [autoSave, setAutoSaveState] = useState<boolean>(() => {
    const saved = localStorage.getItem("app_auto_save");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [agentThinking, setAgentThinkingState] = useState<AgentThinking>(() => {
    return (localStorage.getItem("app_agent_thinking") as AgentThinking) || "high";
  });

  const [approvalPolicy, setApprovalPolicyState] = useState<ApprovalPolicy>(() => {
    const saved = localStorage.getItem("app_approval_policy");
    // Migrate legacy values to the new 2-mode system
    if (saved === "always") return "strict";
    if (saved === "auto" || saved === "strict") return saved;
    // "never" / "on_request" / "unless_trusted" → auto (default)
    return "auto";
  });

  const [defaultModel, setDefaultModelState] = useState<string>(() => {
    return localStorage.getItem("app_default_model") || "Auto";
  });

  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem("app_api_key") || "••••••••••••••••";
  });

  const [enableIndexing, setEnableIndexingState] = useState<boolean>(() => {
    const saved = localStorage.getItem("app_enable_indexing");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [protocol, setProtocolState] = useState<string>(() => {
    return localStorage.getItem("app_protocol") || "openai";
  });

  const [backendApiUrl, setBackendApiUrlState] = useState<string>(() => {
    let url = localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
    if (url.startsWith("http://agent.hery.cloud")) {
      url = url.replace("http://agent.hery.cloud", "https://agent.hery.cloud");
      localStorage.setItem("app_backend_api_url", url);
    }
    return url;
  });

  const [enabledModels, setEnabledModels] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("app_enabled_models");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      "deepseek-v4-flash": true,
      "deepseek-v4-pro": true,
      "glm-4-7": true,
      "glm-5-turbo": true,
      "glm-5-0": true,
      "glm-5-1": true,
      "glm-5-2": true,
      "glm-5v-turbo": true,
      "kimi-k2-5": true,
    };
  });

  const [customProviders, setCustomProviders] = useState<CustomProvider[]>(() => {
    const saved = localStorage.getItem("app_custom_providers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [backendModels, setBackendModels] = useState<BackendModelItem[]>([]);

  const fetchBackendModels = async () => {
    // 未登录时不调用模型接口
    if (!isLoggedIn || !user?.token) return;
    try {
      const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
      const headers: Record<string, string> = {};
      if (user?.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }
      const res = await apiFetch(`${baseUrl}/api/models`, { headers });
      if (!res.ok) throw new Error("Failed to fetch models");
      const data = await res.json();
      
      let modelsList: any[] = [];
      if (Array.isArray(data)) {
        modelsList = data;
      } else if (data && typeof data === "object") {
        if (Array.isArray(data.data)) {
          modelsList = data.data;
        } else if (Array.isArray(data.models)) {
          modelsList = data.models;
        } else if (Array.isArray(data.items)) {
          modelsList = data.items;
        } else if (Array.isArray(data.list)) {
          modelsList = data.list;
        } else if (Array.isArray(data.result)) {
          modelsList = data.result;
        } else if (data.data && typeof data.data === "object") {
          if (Array.isArray(data.data.models)) modelsList = data.data.models;
          else if (Array.isArray(data.data.items)) modelsList = data.data.items;
          else if (Array.isArray(data.data.list)) modelsList = data.data.list;
          else if (Array.isArray(data.data.data)) modelsList = data.data.data;
          else if (Array.isArray(data.data.result)) modelsList = data.data.result;
        }
      }

      if (modelsList && modelsList.length > 0) {
        const systemIds = [
          "deepseek-v4-flash",
          "deepseek-v4-pro",
          "glm-4-7",
          "glm-5-turbo",
          "glm-5-0",
          "glm-5-1",
          "glm-5-2",
          "glm-5v-turbo",
          "kimi-k2-5"
        ];
        
        const nextEnabledModels: Record<string, boolean> = {};
        const nextCustomProviders: CustomProvider[] = [];
        const nextBackendModels: BackendModelItem[] = [];
        const seenIds = new Set<string>();
        
        modelsList.forEach((model: any) => {
          if (!model) return;

          // Extract database record ID first for API path operations (DELETE/PUT)
          const recordId = typeof model === "string" 
            ? model 
            : (model.id || model._id || model.model_id || model.model || model.modelName || model.model_name || model.name || model.code || model.value);

          if (!recordId) return;

          const idStr = String(recordId);
          if (seenIds.has(idStr)) return;
          seenIds.add(idStr);

          // Extract actual model identifier code (e.g., deepseek-chat, gpt-4o)
          const actualModelName = typeof model === "object" ? (model.model || model.model_id || model.modelName || model.model_name || idStr) : idStr;
          const modelCodeStr = String(actualModelName);

          const isEnabled = typeof model === "object" ? (model.is_enabled !== false && model.isEnabled !== false && model.status !== "disabled" && model.status !== 0) : true;
          nextEnabledModels[idStr] = isEnabled;
          nextEnabledModels[modelCodeStr] = isEnabled;
          
          // Check is_system field directly from backend model object
          let isSystem = false;
          if (typeof model === "object" && model.is_system !== undefined && model.is_system !== null) {
            isSystem = model.is_system === true || model.is_system === 1 || model.is_system === "true";
          } else if (typeof model === "object" && model.isSystem !== undefined && model.isSystem !== null) {
            isSystem = model.isSystem === true || model.isSystem === 1 || model.isSystem === "true";
          } else if (typeof model === "object" && model.type !== undefined && model.type !== null) {
            isSystem = model.type === "system" || model.type === 1;
          } else if (typeof model === "object" && model.is_custom !== undefined && model.is_custom !== null) {
            isSystem = !(model.is_custom === true || model.is_custom === 1 || model.is_custom === "true");
          } else {
            isSystem = systemIds.includes(idStr) || systemIds.includes(modelCodeStr);
          }

          const nameStr = typeof model === "string"
            ? model
            : (model.display_name || model.name || model.title || model.label || model.model_name || modelCodeStr || idStr);

          const descStr = typeof model === "string"
            ? ""
            : (model.description || model.desc || model.summary || model.remark || "");

          const providerStr = typeof model === "string"
            ? (isSystem ? "System" : "Custom")
            : (model.provider || model.vendor || model.owned_by || model.owner || (isSystem ? "System" : "Custom"));

          const protocolStr = typeof model === "string"
            ? "openai"
            : (model.protocol || "openai");

          const baseUrlStr = typeof model === "string"
            ? ""
            : (model.base_url || model.baseUrl || model.url || "");

          const apiKeyStr = typeof model === "object"
            ? (model.api_key || model.apiKey || "")
            : "";

          nextBackendModels.push({
            id: idStr,
            modelName: modelCodeStr,
            name: String(nameStr),
            description: String(descStr),
            isEnabled,
            provider: String(providerStr),
            protocol: String(protocolStr),
            baseUrl: String(baseUrlStr),
            apiKey: isSystem ? "" : String(apiKeyStr),
            isSystem,
            hasLink: true,
            hasImage: idStr.includes("v") || modelCodeStr.includes("v") || idStr.includes("vision") || idStr.includes("kimi"),
          });

          if (!isSystem) {
            nextCustomProviders.push({
              id: idStr,
              name: String(providerStr),
              baseUrl: String(baseUrlStr),
              apiKey: String(apiKeyStr),
              protocol: (protocolStr as any) || "openai",
              modelName: modelCodeStr,
            });
          }
        });

        // Replace enabledModels entirely with fresh data from backend
        // (previously used spread merge which never removed stale entries of deleted models)
        setEnabledModels(nextEnabledModels);
        localStorage.setItem("app_enabled_models", JSON.stringify(nextEnabledModels));

        // Always update customProviders, even if empty (e.g. last custom model was deleted)
        setCustomProviders(nextCustomProviders);
        localStorage.setItem("app_custom_providers", JSON.stringify(nextCustomProviders));

        // Always update backendModels, even if empty
        setBackendModels(nextBackendModels);
      } else {
        // Backend returned empty list — clear all model-related state
        setEnabledModels({});
        localStorage.setItem("app_enabled_models", JSON.stringify({}));
        setCustomProviders([]);
        localStorage.setItem("app_custom_providers", JSON.stringify([]));
        setBackendModels([]);
      }
    } catch (err) {
      console.warn("Failed to load models from backend:", err);
    }
  };

  // Fetch backend models when component mounts or token/url updates
  useEffect(() => {
    fetchBackendModels();
  }, [user?.token, user?.email, isLoggedIn, backendApiUrl]);

  const refreshModels = async () => {
    await fetchBackendModels();
  };

  const deleteModel = async (id: string) => {
    // System models cannot be deleted
    const target = backendModels.find((m) => m.id === id || m.modelName === id);
    const isSystemModel = target 
      ? target.isSystem === true 
      : ["claude-3-5-sonnet", "gemini-2-5-pro", "gpt-4o-mini", "deepseek-r1", "kimi-k2-5", "glm-5-0", "glm-5-1", "glm-5-2", "glm-5v-turbo"].includes(id);

    if (isSystemModel) {
      throw new Error(t("系统内置模型无法删除，您可以选择停用它", "System models cannot be deleted. You can disable it instead."));
    }

    const backendRecordId = target?.id || id;

    const savedDeleted = localStorage.getItem("app_deleted_models");
    let deletedList: string[] = [];
    if (savedDeleted) {
      try { deletedList = JSON.parse(savedDeleted); } catch (_) {}
    }
    if (!deletedList.includes(backendRecordId)) {
      deletedList.push(backendRecordId);
    }
    if (!deletedList.includes(id)) {
      deletedList.push(id);
    }
    localStorage.setItem("app_deleted_models", JSON.stringify(deletedList));

    if (user?.token) {
      const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
      const res = await apiFetch(`${baseUrl}/api/models/${backendRecordId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user.token}`
        }
      });
      if (!res.ok) {
        let errMsg = "";
        try {
          const errJson = await res.json();
          errMsg = errJson.detail || errJson.message || "";
        } catch (_) {
          errMsg = await res.text();
        }
        throw new Error(errMsg || t("后端删除模型失败", "Failed to delete model on backend"));
      }
      await fetchBackendModels();
      return;
    }

    setBackendModels((prev) => prev.filter((m) => m.id !== backendRecordId && m.id !== id && m.modelName !== id));
    setCustomProviders((prev) => {
      const updated = prev.filter((p) => p.id !== backendRecordId && p.id !== id && p.modelName !== id);
      localStorage.setItem("app_custom_providers", JSON.stringify(updated));
      return updated;
    });
    setEnabledModels((prev) => {
      const updated = { ...prev };
      delete updated[id];
      localStorage.setItem("app_enabled_models", JSON.stringify(updated));
      return updated;
    });
  };

  const testModelConnection = async (params: TestConnectionParams): Promise<TestConnectionResult> => {
    const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (user?.token) {
      headers["Authorization"] = `Bearer ${user.token}`;
    }

    try {
      const res = await apiFetch(`${baseUrl}/api/models/test-connection`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: params.id || null,
          provider: params.provider || "Custom",
          protocol: params.protocol || "openai",
          base_url: params.base_url,
          api_key: params.api_key || "",
          model: params.model,
        }),
      });

      if (!res.ok) {
        let errMsg = "";
        try {
          const errJson = await res.json();
          errMsg = errJson.detail || errJson.message || "";
        } catch (_) {
          errMsg = await res.text();
        }
        return {
          success: false,
          message: errMsg || t("连接测试请求失败", "Connection test request failed"),
        };
      }

      const json = await res.json();
      if (json && json.data) {
        return {
          success: !!json.data.success,
          message: json.data.message || (json.data.success ? t("连接正常", "Connection successful") : t("连接失败", "Connection failed")),
          latency_ms: json.data.latency_ms,
        };
      }

      return {
        success: json.code === 200 || json.success === true,
        message: json.message || t("测试完成", "Test completed"),
        latency_ms: json.latency_ms,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || t("网络错误，无法连接到测试服务", "Network error, failed to reach server"),
      };
    }
  };

  const addCustomProvider = async (p: Omit<CustomProvider, "id">) => {
    if (user?.token) {
      const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
      const res = await apiFetch(`${baseUrl}/api/models`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({
          provider: p.name,
          protocol: p.protocol,
          base_url: p.baseUrl,
          api_key: p.apiKey,
          model: p.modelName,
          model_id: p.modelName,
          display_name: p.modelName,
          description: `${p.name} custom model`,
          is_system: false,
        })
      });
      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg || "Failed to create model on backend");
      }
      await fetchBackendModels();
      return;
    }

    const newProvider: CustomProvider = {
      ...p,
      id: Date.now().toString(),
    };
    setCustomProviders((prev) => {
      const updated = [...prev, newProvider];
      localStorage.setItem("app_custom_providers", JSON.stringify(updated));
      return updated;
    });
    setBackendModels((prev) => [
      ...prev,
      {
        id: p.modelName || newProvider.id,
        name: p.modelName || p.name,
        description: `${p.name} custom model`,
        isEnabled: true,
        provider: p.name,
        protocol: p.protocol,
        baseUrl: p.baseUrl,
        apiKey: p.apiKey,
        isSystem: false,
        hasLink: true,
        hasImage: false,
      },
    ]);
  };

  const updateCustomProvider = async (id: string, p: Omit<CustomProvider, "id">) => {
    if (user?.token) {
      const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
      const bodyData = {
        provider: p.name,
        protocol: p.protocol,
        base_url: p.baseUrl,
        api_key: p.apiKey,
        model: p.modelName,
        model_id: p.modelName,
        display_name: p.modelName,
        description: `${p.name} custom model`,
        is_system: false,
      };

      let res = await apiFetch(`${baseUrl}/api/models/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify(bodyData)
      });

      if (res.status === 405 || res.status === 404) {
        res = await apiFetch(`${baseUrl}/api/models/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.token}`
          },
          body: JSON.stringify(bodyData)
        });
      }

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg || "Failed to update model on backend");
      }
      await fetchBackendModels();
      return;
    }

    setCustomProviders((prev) => {
      const updated = prev.map((item) => (item.id === id || item.modelName === id ? { ...p, id } : item));
      localStorage.setItem("app_custom_providers", JSON.stringify(updated));
      return updated;
    });
    setBackendModels((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              id: p.modelName || id,
              name: p.modelName || p.name,
              provider: p.name,
              protocol: p.protocol,
              baseUrl: p.baseUrl,
              apiKey: p.apiKey,
            }
          : m
      )
    );
  };

  const deleteCustomProvider = async (id: string) => {
    const providerObj = customProviders.find((p) => p.id === id);
    const modelId = providerObj?.modelName || id;

    if (user?.token) {
      try {
        const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
        await apiFetch(`${baseUrl}/api/models/${modelId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${user.token}`
          }
        });
      } catch (e) {
        console.warn("Failed deleting model on backend:", e);
      }
    }

    setCustomProviders((prev) => {
      const updated = prev.filter((p) => p.id !== id && p.modelName !== modelId);
      localStorage.setItem("app_custom_providers", JSON.stringify(updated));
      return updated;
    });
    setBackendModels((prev) => prev.filter((m) => m.id !== id && m.id !== modelId));
  };

  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    setIsLangSwitching(true);
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
    setTimeout(() => {
      setIsLangSwitching(false);
    }, 800);
  };

  const setTheme = (th: Theme) => {
    if (th === theme) return;
    setIsThemeSwitching(true);
    setThemeState(th);
    localStorage.setItem("app_theme", th);
    setTimeout(() => {
      setIsThemeSwitching(false);
    }, 600);
  };

  const setAutoSave = (val: boolean) => {
    setAutoSaveState(val);
    localStorage.setItem("app_auto_save", JSON.stringify(val));
  };

  const setAgentThinking = (val: AgentThinking) => {
    setAgentThinkingState(val);
    localStorage.setItem("app_agent_thinking", val);
  };

  const setApprovalPolicy = (val: ApprovalPolicy) => {
    setApprovalPolicyState(val);
    localStorage.setItem("app_approval_policy", val);
  };

  const setDefaultModel = (val: string) => {
    setDefaultModelState(val);
    localStorage.setItem("app_default_model", val);
  };

  const setApiKey = (val: string) => {
    setApiKeyState(val);
    localStorage.setItem("app_api_key", val);
  };

  const setEnableIndexing = (val: boolean) => {
    setEnableIndexingState(val);
    localStorage.setItem("app_enable_indexing", JSON.stringify(val));
  };

  const setProtocol = (val: string) => {
    setProtocolState(val);
    localStorage.setItem("app_protocol", val);
  };

  const setBackendApiUrl = (val: string) => {
    // Clean up trailing slash if present
    const cleaned = val.replace(/\/$/, "");
    setBackendApiUrlState(cleaned);
    localStorage.setItem("app_backend_api_url", cleaned);
  };

  const toggleModelStatus = async (id: string) => {
    const isEnabled = enabledModels[id] !== false;
    const newEnabled = !isEnabled;

    if (user?.token) {
      try {
        const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
        // Optimistic update
        setEnabledModels((prev) => {
          const updated = { ...prev, [id]: newEnabled };
          localStorage.setItem("app_enabled_models", JSON.stringify(updated));
          return updated;
        });

        const res = await apiFetch(`${baseUrl}/api/models/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.token}`
          },
          body: JSON.stringify({ is_enabled: newEnabled })
        });

        if (!res.ok) {
          // Revert on error
          setEnabledModels((prev) => {
            const updated = { ...prev, [id]: isEnabled };
            localStorage.setItem("app_enabled_models", JSON.stringify(updated));
            return updated;
          });
          throw new Error("Failed to update model status on backend");
        }
        await fetchBackendModels();
        return;
      } catch (err) {
        console.warn("Failed to toggle model status on backend:", err);
        setEnabledModels((prev) => {
          const updated = { ...prev, [id]: isEnabled };
          localStorage.setItem("app_enabled_models", JSON.stringify(updated));
          return updated;
        });
      }
    }

    setEnabledModels((prev) => {
      const updated = { ...prev, [id]: newEnabled };
      localStorage.setItem("app_enabled_models", JSON.stringify(updated));
      return updated;
    });
  };

  // Helper for i18n
  const t = (zh: string, en: string) => {
    return language === "en-US" ? en : zh;
  };

  // Apply Theme effect to DOM
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const isDarkSystem = mediaQuery.matches;
      if (theme === "dark" || (theme === "system" && isDarkSystem)) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();

    if (theme === "system") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  // Sync login/logout state from other windows (e.g. OAuth popup login)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "app_user_profile") {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setUser(parsed);
            setIsLoggedIn(true);
          } catch {
            setUser(null);
            setIsLoggedIn(false);
          }
        } else {
          setUser(null);
          setIsLoggedIn(false);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        isLangSwitching,
        theme,
        setTheme,
        isThemeSwitching,
        autoSave,
        setAutoSave,
        agentThinking,
        setAgentThinking,
        approvalPolicy,
        setApprovalPolicy,
        defaultModel,
        setDefaultModel,
        apiKey,
        setApiKey,
        enableIndexing,
        setEnableIndexing,
        protocol,
        setProtocol,
        enabledModels,
        toggleModelStatus,
        customProviders,
        backendModels,
        addCustomProvider,
        updateCustomProvider,
        deleteCustomProvider,
        deleteModel,
        t,
        isLoggedIn,
        user,
        login,
        logout,
        backendApiUrl,
        setBackendApiUrl,
        refreshModels,
        testModelConnection,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

