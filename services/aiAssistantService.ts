import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "./dataService";
import { getEnvString } from "./env";

export type JayMessage = {
  role: "user" | "assistant";
  content: string;
};

export type JayVariant = "app" | "landing";

const DISABLE_KEY = "jay_assistant_disabled_until";
const STATUS_EVENT = "jay-assistant-status";

const KNOWLEDGE_BASE = `
You are Jay, Syncly's AI-native copilot. Syncly is a workforce-operations suite that currently includes:
- AI-powered EOD reports with streak tracking, approvals, and version history.
- Leave & attendance workflows (balance tracking, future leave planning, approvals, delinquent alerts).
- Task management with comments, @mentions, reminders, meeting-linked tasks, and performance coaching.
- Announcement boards with acknowledgements, HR notices, audience targeting, and engagement insights.
- Meetings and live notes, Telegram alerts, Google Calendar sync, tenant provisioning, roles/permissions, and platform telemetry.
- Public landing page flows (pricing guidance, live demo booking, AI features narrative, free-trial CTA).

Response guardrails:
1. Only reference features that exist above or in the conversation history. If something is unknown or not yet shipping, state that plainly and offer the closest supported workflow in Syncly.
2. Answers must stay under ~120 words: lead with the direct takeaway in one sentence, then add a short bullet list or numbered steps when helpful (no more than 3 bullets).
3. Never invent customer data, roadmaps, or integrations. For questions outside Syncly's scope, politely decline and redirect to a supported capability.
4. When guiding someone, cite the exact in-app path (e.g., “Manager Dashboard → Performance Hub → Coaching Tips”).
5. Close with an action-oriented tip only if it clearly helps (e.g., “Tip: Turn on Telegram alerts so managers see comments instantly.”).
`;

const MAX_HISTORY = 6; // keep prompts lean for cheaper calls
const JAY_MAX_RETRIES = 2;
const JAY_RETRY_DELAY_MS = 800;

type AvailabilitySnapshot = {
  canAccessJay: boolean;
  source: "proxy" | "direct" | "none";
  isTemporarilyDisabled: boolean;
};

const dispatchStatus = () => {
  if (typeof window === "undefined") return;
  const detail = getAvailabilitySnapshot();
  window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail }));
};

const parseDisableUntil = (): number => {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage?.getItem(DISABLE_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const setDisableUntil = (timestamp: number) => {
  if (typeof window === "undefined") return;
  if (timestamp > Date.now()) {
    window.localStorage?.setItem(DISABLE_KEY, String(timestamp));
  } else {
    window.localStorage?.removeItem(DISABLE_KEY);
  }
  dispatchStatus();
};

const isTemporarilyDisabled = (): boolean => Date.now() < parseDisableUntil();

export const clearJayDisableFlag = () => setDisableUntil(0);

export const disableJayForToday = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 5, 0, 0); // tiny buffer after midnight next day
  setDisableUntil(tomorrow.getTime());
};

const getProxyUrl = (): string | null => {
  const fromEnv = getEnvString("VITE_JAY_PROXY_URL", "JAY_PROXY_URL");
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== "undefined") {
    const globalOverride = (window as any).__JAY_PROXY_URL__;
    if (typeof globalOverride === "string" && globalOverride.trim()) {
      return globalOverride.trim();
    }
  }

  return null;
};

export const getJayProxyUrl = (): string | null => getProxyUrl();

export const getAvailabilitySnapshot = (): AvailabilitySnapshot => {
  const hasProxy = !!getProxyUrl();
  const hasDirectKey = !!getGeminiApiKey();
  const source: AvailabilitySnapshot["source"] = hasProxy
    ? "proxy"
    : hasDirectKey
      ? "direct"
      : "none";

  return {
    canAccessJay: source !== "none",
    source,
    isTemporarilyDisabled: isTemporarilyDisabled(),
  };
};

export const subscribeToJayAvailability = (
  callback: (snapshot: AvailabilitySnapshot) => void
): (() => void) => {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    if (event instanceof CustomEvent && event.detail) {
      callback(event.detail as AvailabilitySnapshot);
    }
  };
  window.addEventListener(STATUS_EVENT, handler as EventListener);
  return () => window.removeEventListener(STATUS_EVENT, handler as EventListener);
};

const RESPONSE_STYLE = `
When you answer:
- Start with the key takeaway in one short sentence.
- Follow with up to three concise bullets or numbered steps if instructions are needed.
- Keep replies under ~120 words and avoid filler.
`;

const buildPrompt = (messages: JayMessage[]): string => {
  const trimmedHistory = messages.slice(-MAX_HISTORY);
  const historyBlock = trimmedHistory
    .map((msg) => `${msg.role === "user" ? "User" : "Jay"}: ${msg.content}`)
    .join("\n\n");

  return `
${KNOWLEDGE_BASE}

${RESPONSE_STYLE}

Conversation so far:
${historyBlock}

Respond as Jay with concise, actionable guidance.`;
};

const toLowerMessage = (input: unknown): string =>
  (input?.toString() ?? "").toLowerCase();

const isQuotaError = (error: any): boolean => {
  const message = toLowerMessage(error?.message);
  return (
    error?.code === 429 ||
    error?.status === 429 ||
    error?.error?.code === 429 ||
    /quota/.test(message) ||
    /resource exhausted/.test(message) ||
    /rate limit/.test(message)
  );
};

const isModelOverloadedError = (error: any): boolean => {
  const message = toLowerMessage(error?.message);
  return (
    error?.code === 503 ||
    error?.status === 503 ||
    error?.error?.code === 503 ||
    /model is overloaded/.test(message) ||
    /unavailable/.test(message) ||
    /overload/.test(message)
  );
};

const getModelOverloadedError = () =>
  Object.assign(
    new Error('Jay is at capacity right now. Please try again in a few moments.'),
    { code: 'JAY_OVERLOADED' }
  );

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withJayRetries = async <T>(operation: () => Promise<T>): Promise<T> => {
  for (let attempt = 0; attempt <= JAY_MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (isModelOverloadedError(error) && attempt < JAY_MAX_RETRIES) {
        await delay(JAY_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  // Should be unreachable, but TypeScript needs a return.
  throw new Error('Jay retry attempts exhausted.');
};

type AskJayOptions = {
  variant?: JayVariant;
};

export const askJay = async (
  messages: JayMessage[],
  options: AskJayOptions = {}
): Promise<string> => {
  if (typeof window === "undefined") {
    throw Object.assign(new Error("Jay is only available in the browser."), {
      code: "JAY_UNAVAILABLE",
    });
  }

  if (isTemporarilyDisabled()) {
    throw Object.assign(new Error("Jay will be back soon."), {
      code: "JAY_DISABLED",
    });
  }

  const proxyUrl = getProxyUrl();
  const apiKey = proxyUrl ? null : getGeminiApiKey();

  if (!proxyUrl && !apiKey) {
    throw Object.assign(new Error("Jay is not configured."), {
      code: "JAY_NO_KEY",
    });
  }

  try {
    if (proxyUrl) {
      return await withJayRetries(async () => {
        const response = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            variant: options.variant ?? "app",
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 429 || data?.error === "quota_exceeded") {
            disableJayForToday();
            throw Object.assign(new Error("Jay is recharging. Please check later."), {
              code: "JAY_DISABLED",
            });
          }

          if (
            response.status === 503 ||
            data?.error === "model_overloaded" ||
            isModelOverloadedError({ message: data?.message })
          ) {
            throw getModelOverloadedError();
          }

          const errorMessage =
            data?.message ||
            data?.error ||
            "Jay is unavailable. Please try again shortly.";

          throw Object.assign(new Error(errorMessage), {
            code: "JAY_PROXY_ERROR",
          });
        }

        const text =
          typeof data?.text === "string" ? data.text.trim() : "";

        if (!text) {
          throw new Error("Jay could not craft a response right now.");
        }

        if (isTemporarilyDisabled()) {
          clearJayDisableFlag();
        }

        return text;
      });
    }

    return await withJayRetries(async () => {
      const ai = new GoogleGenAI({ apiKey: apiKey! });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(messages),
      });

      const text = response?.text?.trim();
      if (!text) {
        throw new Error("Jay could not craft a response right now.");
      }

      if (isTemporarilyDisabled()) {
        clearJayDisableFlag();
      }

      return text;
    });
  } catch (error: any) {
    if (isQuotaError(error)) {
      disableJayForToday();
      throw Object.assign(new Error("Jay is recharging. Please check later."), {
        code: "JAY_DISABLED",
      });
    }

    if (isModelOverloadedError(error)) {
      throw getModelOverloadedError();
    }

    const fallbackMessage =
      typeof error?.message === "string"
        ? error.message
        : "Jay ran into an issue. Please try again.";

    throw Object.assign(new Error(fallbackMessage), {
      code: error?.code ?? "JAY_ERROR",
    });
  }
};

// Helper to expose availability without importing storage logic everywhere
export const canRenderJay = (): boolean => {
  const snapshot = getAvailabilitySnapshot();
  return snapshot.canAccessJay && !snapshot.isTemporarilyDisabled;
};
