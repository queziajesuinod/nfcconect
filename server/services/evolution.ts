import axios, { Method } from "axios";
import { ENV } from "../_core/env";
import type { EvoConnectionResponse, EvoQrResponse } from "@shared/types/evolution";

type EvoRequestOptions = {
  method?: Method;
  path?: string;
  data?: unknown;
  params?: Record<string, unknown> | null;
  timeout?: number;
  baseOverride?: string | null;
  apiKeyOverride?: string | null;
};

type EvoMessagePayload = {
  number: string;
  text: string;
  [key: string]: unknown;
};

export type EvoImagePayload = {
  number: string;
  base64: string;
  fileName?: string;
  mimeType?: string;
  caption?: string;
  mediaType: "image" | "video" | "document";
  encoding?: boolean;
};

export type EvoAudioPayload = {
  number: string;
  audio: string;
  encoding?: boolean;
};

const BASE_RAW = ENV.evoApiUrl || "";
const API_KEY = ENV.evoApiKey || "";

function resolveBase(raw: string): string {
  if (!raw) return "";
  let base = String(raw).trim();
  if (!base) return "";
  const idx = base.indexOf("/message/");
  if (idx !== -1) base = base.slice(0, idx);
  return base.replace(/\/+$/, "");
}

export function baseUrl(): string {
  return resolveBase(BASE_RAW);
}

export function buildSendUrl(instance: string): string {
  const base = baseUrl();
  if (!base || !instance) return "";
  return `${base}/message/sendText/${encodeURIComponent(instance)}`;
}

function decodeMaybeBase64(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return String(value);
  const raw = value.trim();
  if (!raw) return null;

  if (/^[0-9A-Za-z\-]{4,}$/.test(raw)) return raw;

  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(raw) && raw.length % 4 === 0;
  if (!isBase64) return raw;
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const reencoded = Buffer.from(decoded, "utf8").toString("base64").replace(/=+$/, "");
    if (raw.replace(/=+$/, "") === reencoded) {
      return decoded;
    }
  } catch (err) {
    console.warn("[EVO] falha ao decodificar base64 de pairing code", (err as Error).message);
  }
  return raw;
}

function normalizePairingCode(raw: unknown): string | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return (
      raw
        .map((item) => normalizePairingCode(item))
        .filter(Boolean)
        .join("-") || null
    );
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return normalizePairingCode(obj.code ?? obj.value ?? obj.number ?? obj.pairingCode ?? obj[0] ?? null);
  }
  if (typeof raw === "string" && raw.includes(",")) {
    return (
      raw
        .split(",")
        .map((chunk) => normalizePairingCode(chunk))
        .filter(Boolean)
        .join("-") || null
    );
  }
  const val = decodeMaybeBase64(String(raw));
  return val ? val.trim() : null;
}

async function evoRequest({
  method = "get",
  path = "",
  data = null,
  params = null,
  timeout = 15000,
  baseOverride = null,
  apiKeyOverride = null,
}: EvoRequestOptions): Promise<unknown> {
  const base = baseOverride || baseUrl();
  const key = apiKeyOverride || API_KEY;
  if (!base) throw new Error("EVO_API_URL não configurada");
  if (!key) throw new Error("EVO_API_KEY não configurada");

  const url = `${base}${path}`;
  console.log("[EVO] request", { method, url, hasKey: !!key, params, hasData: !!data });

  const config: Record<string, unknown> = {
    method,
    url,
    params,
    timeout,
    headers: {
      APIKEY: key,
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    transformResponse: [
      (raw: unknown) => {
        if (raw == null) return null;
        let trimmed = String(raw).trim();
        if (!trimmed) return null;

        const lower = trimmed.toLowerCase();
        if (lower === "null") return null;

        if (
          (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))
        ) {
          trimmed = trimmed.slice(1, -1).trim();
        }
        if (!trimmed) return null;

        const normalized = trimmed.replace(/'/g, '"');
        try {
          return JSON.parse(normalized);
        } catch {
          return normalized;
        }
      },
    ],
  };

  if (data != null && method.toLowerCase() !== "get" && method.toLowerCase() !== "head") {
    (config as Record<string, unknown>).data = data;
  }

  try {
    const res = await axios(config as Record<string, unknown>);
    return res.data;
  } catch (err) {
    const error = err as { response?: { status?: number; data?: unknown }; message?: string };
    const status = error.response?.status;
    const responseData = error.response?.data;
    console.error("[EVO] error", {
      method,
      url,
      status,
      data: responseData,
      message: error.message,
    });
    let message = error.message || "Falha ao acessar WhatsApp";
    if (responseData && typeof responseData === "object") {
      const resObj = responseData as Record<string, unknown>;
      message = (resObj.error as string) || (resObj.message as string) || message;
    } else if (typeof responseData === "string" && responseData.trim().length) {
      message = responseData.trim();
    }
    type EvoError = Error & { status?: number; data?: unknown };
    const thrown: EvoError = new Error(message || "Falha ao acessar WhatsApp");
    thrown.status = status;
    thrown.data = responseData ?? null;
    throw thrown;
  }
}

function extractConnectionStatus(payload: Record<string, unknown>, fallback = "pending"): string {
  const instanceState = (payload.instance as Record<string, unknown>)?.state;
  const rawStatus = payload.connectionStatus ?? payload.state ?? instanceState;
  if (typeof rawStatus === "string" && rawStatus) {
    return rawStatus;
  }
  if (rawStatus != null) {
    return String(rawStatus);
  }
  return fallback;
}

function normalizeQrResponse(instanceName: string, data: unknown): EvoQrResponse {
  if (data == null || data === "null") {
    return {
      connectionStatus: "unknown",
      instance: { instanceName, state: "unknown" },
      qrcode: null,
      code: null,
      pairingCode: null,
      raw: null,
    };
  }

  const payload = data as Record<string, unknown>;

  const state = extractConnectionStatus(payload, "pending");

  const qrcode =
    (payload.base64 as string) ??
    (payload.qrcode as string) ??
    (payload.instance as Record<string, unknown>)?.qrcode ??
    (payload.data as Record<string, unknown>)?.base64 ??
    (payload.data as Record<string, unknown>)?.qrcode ??
    null;

  const rawPairing =
    (payload.pairingCode as string) ??
    (payload.instance as Record<string, unknown>)?.pairingCode ??
    (payload.data as Record<string, unknown>)?.pairingCode ??
    (payload.data as Record<string, unknown>)?.pairing_code ??
    null;

  const pairingCode = normalizePairingCode(rawPairing);

  return {
    connectionStatus: state,
    instance: (payload.instance as Record<string, unknown>) ?? { instanceName, state },
    qrcode,
    code: decodeMaybeBase64(
      (payload.code as string) ??
        (payload.instance as Record<string, unknown>)?.code ??
        (payload.data as Record<string, unknown>)?.code ??
        null
    ),
    pairingCode,
    raw: data,
  };
}

export function formatInstanceName(name: string | null | undefined, suffix = ""): string {
  if (!name) return suffix ? `COMPANY_${suffix}` : "COMPANY";
  const normalized = String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = normalized || "COMPANY";
  return suffix ? `${base}_${suffix}` : base;
}

export async function createInstance(
  instanceName: string,
  options: EvoRequestOptions = {}
): Promise<EvoQrResponse> {
  const data = await evoRequest({
    method: "post",
    path: "/instance/create",
    data: {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    },
    ...options,
  });
  return normalizeQrResponse(instanceName, data);
}

export async function getConnectionState(
  instanceName: string,
  options: EvoRequestOptions = {}
): Promise<EvoConnectionResponse> {
  const data = await evoRequest({
    method: "get",
    path: `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    params: { pairingCode: true },
    ...options,
  });
  if (data == null || data === "null") {
    return {
      connectionStatus: "unknown",
      instance: { instanceName, state: "unknown" },
      raw: null,
    };
  }

  const payload = data as Record<string, unknown>;
  const state = extractConnectionStatus(payload, "unknown");
  return {
    connectionStatus: state,
    instance: (payload.instance as Record<string, unknown>) ?? { instanceName, state },
    raw: data,
  };
}

export async function restartInstance(
  instanceName: string,
  options: EvoRequestOptions = {}
): Promise<EvoQrResponse> {
  const data = await evoRequest({
    method: "post",
    path: `/instance/restart/${encodeURIComponent(instanceName)}`,
    data: { qrcode: true, pairingCode: true },
    ...options,
  });
  return normalizeQrResponse(instanceName, data);
}

export async function connectInstance(
  instanceName: string,
  options: EvoRequestOptions = {}
): Promise<EvoQrResponse> {
  const data = await evoRequest({
    method: "get",
    path: `/instance/connect/${encodeURIComponent(instanceName)}`,
    data: { pairingCode: true },
    ...options,
  });
  return normalizeQrResponse(instanceName, data);
}

export async function getQrCode(
  instanceName: string,
  options: EvoRequestOptions = {}
): Promise<EvoQrResponse> {
  const data = await evoRequest({
    method: "get",
    path: `/instance/qrcode/${encodeURIComponent(instanceName)}`,
    params: { pairingCode: true },
    ...options,
  });
  return normalizeQrResponse(instanceName, data);
}

export async function fetchInstances(options: EvoRequestOptions = {}): Promise<unknown> {
  return evoRequest({
    method: "get",
    path: "/instance/fetchInstances",
    params: options.params || null,
    ...options,
  });
}

export async function deleteInstance(
  instanceName: string,
  options: EvoRequestOptions = {}
): Promise<unknown> {
  return evoRequest({
    method: "delete",
    path: `/instance/delete/${encodeURIComponent(instanceName)}`,
    ...options,
  });
}

export async function sendTextMessage(
  instanceName: string,
  payload: EvoMessagePayload,
  options: EvoRequestOptions = {}
): Promise<unknown> {
  const key = options.apiKeyOverride || API_KEY;
  console.log("[EVO] sendTextMessage", {
    instanceName,
    number: payload.number,
    text: payload.text,
    hasApiKey: !!key,
    apiKeyHint: key ? key.replace(/.(?=.{4})/g, "*") : null,
  });
  return evoRequest({
    method: "post",
    path: `/message/sendText/${encodeURIComponent(instanceName)}`,
    data: { number: payload.number, text: payload.text },
    ...options,
  });
}

export async function sendMediaMessage(
  instanceName: string,
  payload: EvoImagePayload,
  options: EvoRequestOptions = {}
): Promise<unknown> {
  const suffix =
    payload.mediaType === "video"
      ? "mp4"
      : payload.mediaType === "document"
      ? "pdf"
      : "jpg";
  const data: Record<string, unknown> = {
    number: payload.number,
    mediatype: payload.mediaType,
    mediaType: payload.mediaType,
    mimetype:
      payload.mimeType ||
      (payload.mediaType === "video"
        ? "video/mp4"
        : payload.mediaType === "document"
        ? "application/pdf"
        : "image/jpeg"),
    fileName: payload.fileName || `arquivo.${suffix}`,
    caption: payload.caption ?? ".",
    media: payload.base64,
    encoding: payload.encoding ?? true,
  };

  return evoRequest({
    method: "post",
    path: `/message/sendMedia/${encodeURIComponent(instanceName)}`,
    data,
    ...options,
  });
}

export async function sendWhatsAppAudio(
  instanceName: string,
  payload: EvoAudioPayload,
  options: EvoRequestOptions = {}
): Promise<unknown> {
  const data: Record<string, unknown> = {
    number: payload.number,
    audio: payload.audio,
    encoding: payload.encoding ?? true,
  };

  return evoRequest({
    method: "post",
    path: `/message/sendWhatsAppAudio/${encodeURIComponent(instanceName)}`,
    data,
    ...options,
  });
}
