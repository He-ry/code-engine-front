/**
 * ASR 语音转文字客户端 —— 对接本地 code-engine-asr 服务(FunASR 2pass 桥接)。
 *
 * Endpoints(本服务无鉴权,不走 agentClient 的 baseUrl+token 体系):
 *   POST {asrUrl}/api/asr   multipart "file" = 16-bit PCM WAV(服务端自动转 16k mono)
 *                          → {"text": "..."} ;415 格式错 / 502 服务不可达 / 504 超时
 *   WS   {asrWsUrl}/ws/asr  流式:二进制帧 = 16k mono PCM16LE;文本 {"type":"stop"} 结束本句;
 *                          回包 {"kind":"partial"|"final","text"} —— partial 是服务端累积的
 *                          "到目前为止的完整句",直接整句替换展示;final 仅在发过 stop 后到达,
 *                          随后服务端会主动关闭连接。close 码:4401 密钥无效 / 1013 FunASR 不可用
 *   GET  {asrUrl}/healthz
 *
 * ASR 地址默认本机桥接,可用 localStorage["app_asr_url"] 覆盖(与后端地址
 * app_backend_api_url 的存储方式一致)。
 */

const ASR_BASE_URL_STORAGE_KEY = "app_asr_url";
const ASR_DEFAULT_BASE_URL = "http://192.168.43.102:8001";
const TARGET_SAMPLE_RATE = 16000;
const REQUEST_TIMEOUT_MS = 90_000;

export function getAsrBaseUrl(): string {
  try {
    return localStorage.getItem(ASR_BASE_URL_STORAGE_KEY) || ASR_DEFAULT_BASE_URL;
  } catch {
    return ASR_DEFAULT_BASE_URL;
  }
}

/** 把任意浏览器可解码音频(webm/opus、mp4、wav...)重采样为 16k mono 并封装成 16-bit PCM WAV Blob。 */
export async function encodeWav16kMono(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();

  // decodeAudioData 需要真实 AudioContext(OfflineAudioContext 无法解码容器格式)
  const AudioCtx: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void decodeCtx.close();
  }
  if (decoded.duration <= 0) throw new Error("empty audio");

  // OfflineAudioContext 重采样 + 混缩为单声道
  const length = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, length, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  const samples = rendered.getChannelData(0);

  // Float32 → int16 PCM + 44 字节 RIFF 头
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** 录音 Blob → 识别文本。抛出的 Error message 可直接展示给用户。 */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const wav = await encodeWav16kMono(blob);
  const form = new FormData();
  form.append("file", wav, "speech.wav");

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${getAsrBaseUrl()}/api/asr`, { method: "POST", body: form, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("语音识别超时");
    }
    throw new Error(`无法连接语音服务(${getAsrBaseUrl()}),请确认 code-engine-asr 已启动`);
  } finally {
    window.clearTimeout(timer);
  }

  let detail = "";
  try {
    const json = await res.json();
    detail = typeof json?.detail === "string" ? json.detail : "";
    if (res.ok && typeof json?.text === "string") {
      return json.text;
    }
  } catch {
    // 响应不是 JSON,走状态码文案
  }
  if (res.status === 415) throw new Error(detail || "音频格式不受支持");
  if (res.status === 502) throw new Error(detail || "语音服务后端不可用");
  if (res.status === 504) throw new Error(detail || "语音识别超时");
  throw new Error(detail || `语音识别失败(HTTP ${res.status})`);
}

// ===================== 流式识别(WS /ws/asr)=====================

const PCM_TARGET_RATE = 16000;
const WS_OPEN_TIMEOUT_MS = 5_000;
const FINAL_TIMEOUT_MS = 12_000;
const FLUSH_ACK_TIMEOUT_MS = 300;

export type AsrStreamErrorCode =
  | "ws-connect" // WS 连不上(启动阶段)
  | "bad-key" // 服务端 4401
  | "funasr-unavailable" // 服务端 1013(FunASR 挂了)
  | "mic-denied" // getUserMedia 失败
  | "not-supported" // 浏览器不支持 AudioWorklet / AudioContext 被挂起
  | "ws-closed"; // 会话中途掉线

export class AsrStreamError extends Error {
  constructor(
    public code: AsrStreamErrorCode,
    message: string,
    public closeCode?: number,
  ) {
    super(message);
  }
}

export interface AsrStreamHandlers {
  /** partial 为"到目前为止的完整句子"(服务端累积),整句替换展示即可 */
  onPartial?: (text: string) => void;
  /** 仅在调用 controller.stop() 之后到达;到达后服务端会主动关闭连接 */
  onFinal?: (text: string) => void;
  onError?: (err: AsrStreamError) => void;
  onClose?: () => void;
}

export interface AsrStreamController {
  /** 结束本句:立即关麦 → flush 残余 PCM → 发 {"type":"stop"} → 等 final。
   *  resolve:final 文本(可为空串);null = 超时/断开没拿到 final。幂等,重复调用返回同一 Promise。*/
  stop(): Promise<string | null>;
  /** 立即放弃:关 WS、停麦、关 AudioContext,不等待 final。幂等。 */
  close(): void;
}

/** 流式识别的 WS 地址(仿 terminalApi.terminalWsUrl 的协议换写法)。 */
export function asrWsUrl(): string {
  const u = new URL(`${getAsrBaseUrl().replace(/\/+$/, "")}/ws/asr`);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString();
}

/**
 * AudioWorklet 源码:麦克风 Float32 → 重采样 16k → 每 1600 样本(100ms)转 Int16 批量上报。
 * 以 Blob URL 形式注册(项目无 public/ 目录,这样 dev/prod 零构建配置)。
 * 注意:这是纯 JS 字符串,tsc 检查不到,只能靠浏览器实测(见 asr-pcm-sender 的 E2E)。
 */
const PCM_WORKLET_SRC = `
class PcmSenderProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.sourceRate = opts.sourceRate || sampleRate;  // 主线程传 AudioContext 实际采样率
    this.ratio = this.sourceRate / 16000;             // 每产 1 个输出样本消耗的输入样本数
    this.pos = 0;                    // 重采样浮点读位置(跨 process() 块连续,不丢样本)
    this.pendingIn = new Float32Array(0);
    this.out = new Float32Array(1600);
    this.outLen = 0;
    this.done = false;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'flush' && !this.done) {
        this.done = true;
        this.emit(true);                             // 残余样本也发出去
        this.port.postMessage({ type: 'pcm-end' });  // ack:保证 PCM 全部先于主线程的 stop 帧
      }
    };
  }

  emit(finalChunk) {
    while (this.outLen >= 1600 || (finalChunk && this.outLen > 0)) {
      const n = Math.min(1600, this.outLen);
      const pcm = new Int16Array(n);
      for (let i = 0; i < n; i++) {
        const s = Math.max(-1, Math.min(1, this.out[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage({ type: 'pcm', buffer: pcm.buffer }, [pcm.buffer]);
      this.out.copyWithin(0, n, this.outLen);
      this.outLen -= n;
    }
  }

  pushOut(values) {
    if (this.outLen + values.length > this.out.length) {
      const bigger = new Float32Array(Math.max(this.out.length * 2, this.outLen + values.length));
      bigger.set(this.out.subarray(0, this.outLen), 0);
      this.out = bigger;
    }
    this.out.set(values, this.outLen);
    this.outLen += values.length;
  }

  process(inputs) {
    if (this.done) return false;                     // flush 后停摆,等主线程断开
    const input = inputs[0] && inputs[0][0];
    if (!input || input.length === 0) return true;
    // 输入缓冲会被复用,必须先拷贝再拼接
    const merged = new Float32Array(this.pendingIn.length + input.length);
    merged.set(this.pendingIn, 0);
    merged.set(input, this.pendingIn.length);
    if (this.ratio === 1) {
      this.pushOut(merged);
      this.pendingIn = new Float32Array(0);
    } else {
      const resampled = [];
      while (this.pos + this.ratio <= merged.length) {
        const start = Math.floor(this.pos);
        const end = Math.floor(this.pos + this.ratio);
        let sum = 0;
        for (let i = start; i < end; i++) sum += merged[i];
        resampled.push(sum / Math.max(1, end - start));
        this.pos += this.ratio;
      }
      if (resampled.length) this.pushOut(Float32Array.from(resampled));
      const consumed = Math.floor(this.pos);
      this.pendingIn = consumed > 0 ? merged.slice(consumed) : merged;
      if (consumed > 0) this.pos -= consumed;
    }
    this.emit(false);
    return true;
  }
}
registerProcessor('asr-pcm-sender', PcmSenderProcessor);
`;

/** close 码 → 错误分类。connect 阶段的未知码归 ws-connect(降级批量),会话中归 ws-closed。 */
function closeCodeToError(code: number, phase: "connect" | "session", fallbackMsg: string): AsrStreamError {
  if (code === 4401) return new AsrStreamError("bad-key", "语音服务密钥无效", code);
  if (code === 1013) return new AsrStreamError("funasr-unavailable", "语音服务后端不可用(FunASR)", code);
  return new AsrStreamError(phase === "connect" ? "ws-connect" : "ws-closed", fallbackMsg, code);
}

function connectWs(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(asrWsUrl());
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new AsrStreamError("ws-connect", "连接语音服务超时"));
    }, WS_OPEN_TIMEOUT_MS);
    ws.onopen = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      ws.onopen = null;
      resolve(ws);
    };
    ws.onerror = () => {
      /* close 会跟着来,统一在 onclose 处理 */
    };
    ws.onclose = (ev) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(closeCodeToError(ev.code, "connect", "无法连接语音服务"));
    };
  });
}

/**
 * 启动一次流式识别会话:先连 WS(失败不弹麦克风授权,调用方据此降级批量),
 * 再开麦 → AudioContext(16k) → 注册 worklet → 接线。成功返回 controller。
 * 启动失败 reject AsrStreamError(此时所有资源已释放)。
 */
export async function startAsrStream(handlers: AsrStreamHandlers): Promise<AsrStreamController> {
  const ws = await connectWs();

  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let node: AudioWorkletNode | null = null;
  let mute: GainNode | null = null;

  let gotFinal = false;
  let closedByUs = false;
  let stopping = false; // stop() 已发起(等 final 中)
  let notifiedClose = false;
  let flushWaiter: (() => void) | null = null;
  let finalResolve: ((text: string | null) => void) | null = null;
  let stopPromise: Promise<string | null> | null = null;

  const notifyClose = () => {
    if (notifiedClose) return;
    notifiedClose = true;
    handlers.onClose?.();
  };

  /** 幂等拆链:AudioContext(Chrome 上限 6 个)、麦克风、WS、三个节点。 */
  const teardown = () => {
    closedByUs = true;
    try {
      stream?.getTracks().forEach((track) => track.stop());
    } catch {
      /* ignore */
    }
    stream = null;
    try {
      source?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      node?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      mute?.disconnect();
    } catch {
      /* ignore */
    }
    source = node = mute = null;
    void ctx?.close().catch(() => undefined);
    ctx = null;
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
  };

  const ensureWsAlive = () => {
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      throw new AsrStreamError("ws-closed", "语音连接已中断");
    }
  };

  // 会话期消息/断线处理(安装在建麦之前,setup 中途掉线也能感知)
  ws.onmessage = (ev: MessageEvent) => {
    let data: unknown;
    try {
      data = JSON.parse(typeof ev.data === "string" ? ev.data : "");
    } catch {
      return;
    }
    if (!data || typeof data !== "object") return;
    const { kind, text } = data as { kind?: unknown; text?: unknown };
    if (typeof text !== "string") return;
    if (kind === "partial") {
      handlers.onPartial?.(text);
    } else if (kind === "final") {
      gotFinal = true;
      handlers.onFinal?.(text);
      finalResolve?.(text);
      finalResolve = null;
    }
  };
  ws.onclose = (ev) => {
    if (gotFinal || closedByUs) {
      notifyClose(); // final 后服务端主动关 / 我们自己关,都是正常收尾
      return;
    }
    finalResolve?.(null); // stop() 等待中的立即返回 null,不干等 12s
    finalResolve = null;
    handlers.onError?.(closeCodeToError(ev.code, "session", "语音连接已中断"));
  };
  ws.onerror = () => {
    /* onclose 会跟来 */
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    ensureWsAlive();

    try {
      ctx = new AudioContext({ sampleRate: PCM_TARGET_RATE }); // 浏览器原生重采样
    } catch {
      ctx = new AudioContext(); // 老浏览器不支持采样率参数,worklet 内兜底重采样
    }
    ensureWsAlive();
    if (!ctx.audioWorklet) throw new AsrStreamError("not-supported", "浏览器不支持 AudioWorklet");
    try {
      await ctx.resume();
    } catch {
      /* 检查放下面 */
    }
    if (ctx.state === "suspended") throw new AsrStreamError("not-supported", "音频上下文被挂起");
    ensureWsAlive();

    const blobUrl = URL.createObjectURL(new Blob([PCM_WORKLET_SRC], { type: "application/javascript" }));
    try {
      await ctx.audioWorklet.addModule(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl); // 模块已入 worklet 模块表,revoke 安全
    }
    ensureWsAlive();

    node = new AudioWorkletNode(ctx, "asr-pcm-sender", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { sourceRate: ctx.sampleRate }, // 实际值;≠16k 时 worklet 内重采样
    });
    source = ctx.createMediaStreamSource(stream);
    mute = ctx.createGain();
    mute.gain.value = 0;
    source.connect(node);
    node.connect(mute);
    mute.connect(ctx.destination); // 必须接 destination:音频图被持续拉取,process() 才会被调

    node.port.onmessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; buffer?: ArrayBuffer } | null;
      if (d?.type === "pcm" && d.buffer) {
        if (ws.readyState === WebSocket.OPEN) ws.send(d.buffer);
      } else if (d?.type === "pcm-end") {
        flushWaiter?.();
        flushWaiter = null;
      }
    };
  } catch (e) {
    teardown();
    throw e instanceof AsrStreamError ? e : new AsrStreamError("mic-denied", String(e));
  }

  const stop = (): Promise<string | null> => {
    if (stopPromise) return stopPromise;
    stopPromise = (async () => {
      stopping = true;
      try {
        // 1. 立即关麦(点停即停)
        stream?.getTracks().forEach((track) => track.stop());
        try {
          source?.disconnect();
        } catch {
          /* ignore */
        }
        source = null;
        // 2. flush 残余 PCM,等 worklet ack(300ms 兜底)
        if (node) {
          await new Promise<void>((resolve) => {
            const timer = window.setTimeout(resolve, FLUSH_ACK_TIMEOUT_MS);
            flushWaiter = () => {
              window.clearTimeout(timer);
              resolve();
            };
            node!.port.postMessage({ type: "flush" });
          });
          flushWaiter = null;
        }
        // 3. 通知服务端本句说完
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "stop" }));
        // 4. 等 final(中途断线由 onclose 立即 resolve null)
        const text = await new Promise<string | null>((resolve) => {
          const timer = window.setTimeout(() => resolve(null), FINAL_TIMEOUT_MS);
          finalResolve = (v) => {
            window.clearTimeout(timer);
            resolve(v);
          };
        });
        finalResolve = null;
        return text;
      } finally {
        teardown();
      }
    })();
    return stopPromise;
  };

  const close = () => {
    stopping = true;
    finalResolve?.(null);
    finalResolve = null;
    teardown();
  };

  return { stop, close };
}
