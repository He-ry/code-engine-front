/**
 * code-engine-office 预览集成
 *
 * 把 Office 文件交给本地 ONLYOFFICE 自托管编辑器服务(code-engine-office)
 * 预览:下载原始字节 → POST /api/open → 返回编辑器 URL(livePreviewUrl 标签页)。
 * 服务不可用时抛错,调用方回退原 OfficeCLI HTML 预览。
 */

/**
 * code-engine-office 服务地址。
 * 优先级:localStorage["office_service_url"] 覆盖 > 自动推导。
 * - 本机(localhost/127.0.0.1)直接连宿主机 3200;
 * - 远程经已公网可达的预览代理(同源 host,端口 5190 的 /ofsvc 前缀)
 *   转发到宿主机 office 服务。否则浏览器里的 WebSocket / REST 会落到
 *   客户端自己的 127.0.0.1:3200 而失败。
 */
export function officeServiceUrl(): string {
  try {
    const v = localStorage.getItem("office_service_url");
    if (v) return v.replace(/\/$/, "");
  } catch {
    /* ignore */
  }
  const h = window.location.hostname;
  const isLocal = h === "localhost" || h === "127.0.0.1" || h === "::1";
  if (isLocal) return "http://127.0.0.1:3200";
  return `http://${h}:5190/ofsvc`;
}

export interface OfficeOpenResult {
  id: string;
  fileUrl: string;
  /** 编辑器路径(相对服务根),拼接服务地址后用于 iframe */
  editorUrl: string;
}

export interface OfficeOpenOptions {
  /** code-engine 后端基址(取 save-token 用,与 projectApi 同源) */
  baseUrl?: string;
  /** 用户 JWT */
  token?: string;
  /** 项目 id(工作区归属;附件等无项目场景可不传 → 仅预览不回存) */
  projectId?: string;
}

/** 上传文件字节,换取编辑器 URL(项目文件自动附带回存令牌) */
export async function openInOfficeService(
  bytes: ArrayBuffer | Blob,
  fileName: string,
  docPath?: string,
  opts?: OfficeOpenOptions,
): Promise<OfficeOpenResult> {
  const qs = new URLSearchParams({ name: fileName });
  if (docPath) qs.set("path", docPath);
  if (opts?.projectId) qs.set("projectId", opts.projectId);
  // save-token:让编辑器内的修改(含纯手动编辑的自动保存)能直写回工作区
  if (opts?.baseUrl && opts?.token && opts?.projectId && docPath) {
    try {
      const tr = await fetch(`${opts.baseUrl}/api/office/save-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.token}`,
        },
        body: JSON.stringify({ projectId: opts.projectId, path: docPath }),
      });
      if (tr.ok) {
        const j = await tr.json();
        const st = j?.data?.token || j?.token;
        if (st) qs.set("st", st);
      }
    } catch {
      /* 取不到令牌则仅预览(修改不落盘) */
    }
  }
  const res = await fetch(
    `${officeServiceUrl()}/api/open?${qs.toString()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: bytes as BodyInit,
    },
  );
  if (!res.ok) {
    throw new Error(`office 服务返回 ${res.status}`);
  }
  return res.json();
}

/** 编辑器完整 URL(给 livePreviewUrl 标签页) */
export function officeEditorUrl(result: OfficeOpenResult): string {
  return `${officeServiceUrl()}${result.editorUrl}`;
}

/**
 * 从编辑器 URL 提取 fileId(/f/{id}/ 路由键)。
 * ⚠️ editorUrl 的 url 参数是 encodeURIComponent 编码过的("/f/x/" → "%2Ff%2Fx%2F"),
 *    必须先解码再匹配——此前直接对原串跑 /\/f\// 正则恒返回 null,
 *    "自己保存跳过重载"的 SHA 比对因此从未生效(每次保存都重载编辑器 tab)。
 */
export function officeFileIdFromUrl(url: string): string | null {
  let u = url;
  try {
    u = decodeURIComponent(url);
  } catch {
    /* 非法编码则按原串匹配 */
  }
  const m = u.match(/\/f\/([a-f0-9]{16,})\//);
  return m ? m[1] : null;
}

/**
 * 拉取编辑器会话当前持有的字节(office 服务内存里的最新导出)。
 * 用于 file_change 时判断"磁盘变化是不是这个编辑器自己保存的"。
 * 会话过期/不存在返回 null。
 */
export async function fetchOfficeSessionBytes(
  fileId: string,
  name: string,
): Promise<ArrayBuffer | null> {
  try {
    // cache: no-store —— 同一 fileId 的字节会随每次导出变化,
    // 刷新比对不能吃 HTTP 缓存里的旧字节
    const r = await fetch(
      `${officeServiceUrl()}/f/${fileId}/${encodeURIComponent(name)}`,
      { cache: "no-store" },
    );
    if (!r.ok) return null;
    return await r.arrayBuffer();
  } catch {
    return null;
  }
}

/** 两份字节是否相同(SHA-256;无 crypto.subtle 时退化为长度+首尾采样比对) */
export async function sameBytes(
  a: ArrayBuffer,
  b: ArrayBuffer,
): Promise<boolean> {
  if (a.byteLength !== b.byteLength) return false;
  try {
    if (crypto?.subtle) {
      const [ha, hb] = await Promise.all([
        crypto.subtle.digest("SHA-256", a),
        crypto.subtle.digest("SHA-256", b),
      ]);
      return new Uint8Array(ha).every((v, i) => v === new Uint8Array(hb)[i]);
    }
  } catch {
    /* fallthrough */
  }
  const ua = new Uint8Array(a);
  const ub = new Uint8Array(b);
  const n = ua.length;
  for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 64))) {
    if (ua[i] !== ub[i]) return false;
  }
  return ua[n - 1] === ub[n - 1];
}
