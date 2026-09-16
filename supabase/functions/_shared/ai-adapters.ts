// Model adapters.
//
// Nearly every gateway worth adding is OpenAI-compatible, so there is ONE
// OpenAI-compatible adapter plus a table of base URLs. Adding a new gateway is
// one line in OPENAI_COMPATIBLE, not a new file. Only Gemini and Anthropic
// need hand-written adapters.

export type AdapterArgs = {
  apiKey: string;
  model: string;
  prompt: string;
  system?: string;
  baseUrl?: string;
  maxTokens?: number;
};

export type Adapter = (args: AdapterArgs) => Promise<string>;

export const OPENAI_COMPATIBLE: Record<string, { baseUrl: string; modelsUrl: string }> = {
  openai:     { baseUrl: "https://api.openai.com/v1",              modelsUrl: "https://api.openai.com/v1/models" },
  groq:       { baseUrl: "https://api.groq.com/openai/v1",         modelsUrl: "https://api.groq.com/openai/v1/models" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1",           modelsUrl: "https://openrouter.ai/api/v1/models" },
  cerebras:   { baseUrl: "https://api.cerebras.ai/v1",             modelsUrl: "https://api.cerebras.ai/v1/models" },
  sambanova:  { baseUrl: "https://api.sambanova.ai/v1",            modelsUrl: "https://api.sambanova.ai/v1/models" },
  deepinfra:  { baseUrl: "https://api.deepinfra.com/v1/openai",    modelsUrl: "https://api.deepinfra.com/v1/openai/models" },
  deepseek:   { baseUrl: "https://api.deepseek.com/v1",            modelsUrl: "https://api.deepseek.com/v1/models" },
  mistral:    { baseUrl: "https://api.mistral.ai/v1",              modelsUrl: "https://api.mistral.ai/v1/models" },
  nvidia:     { baseUrl: "https://integrate.api.nvidia.com/v1",    modelsUrl: "https://integrate.api.nvidia.com/v1/models" },
  chutes:     { baseUrl: "https://llm.chutes.ai/v1",               modelsUrl: "https://llm.chutes.ai/v1/models" },
  together:   { baseUrl: "https://api.together.xyz/v1",            modelsUrl: "https://api.together.xyz/v1/models" },
};

/** Vendors needing their own adapter, listed for the admin picker. */
export const NATIVE_PROVIDERS = ["gemini", "anthropic"] as const;

export const ALL_PROVIDERS = [...Object.keys(OPENAI_COMPATIBLE), ...NATIVE_PROVIDERS];

/** Where the admin console fetches a live model list from. */
export function modelsUrlFor(provider: string, baseUrl?: string): string | null {
  if (provider === "gemini") return "https://generativelanguage.googleapis.com/v1beta/models";
  if (provider === "anthropic") return "https://api.anthropic.com/v1/models";
  if (baseUrl) return `${baseUrl.replace(/\/$/, "")}/models`;
  return OPENAI_COMPATIBLE[provider]?.modelsUrl ?? null;
}

async function failing(res: Response): Promise<never> {
  throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 600)}`);
}

const openAiCompatible: Adapter = async ({ apiKey, model, prompt, system, baseUrl, maxTokens }) => {
  const url = `${(baseUrl ?? "").replace(/\/$/, "")}/chat/completions`;
  const messages = system
    ? [{ role: "system", content: system }, { role: "user", content: prompt }]
    : [{ role: "user", content: prompt }];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens ?? 800, temperature: 0.7 }),
  });
  if (!res.ok) await failing(res);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
};

const gemini: Adapter = async ({ apiKey, model, prompt, system, maxTokens }) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: { maxOutputTokens: maxTokens ?? 800, temperature: 0.7 },
    }),
  });
  if (!res.ok) await failing(res);
  const data = await res.json();

  // Copyright guard: long verbatim passages come back as RECITATION with no
  // text. That is a normal chain failure, not a crash.
  const finish = data?.candidates?.[0]?.finishReason;
  if (finish && finish !== "STOP" && finish !== "MAX_TOKENS") {
    throw new Error(`Gemini finishReason: ${finish}`);
  }
  return (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "").join("");
};

const anthropic: Adapter = async ({ apiKey, model, prompt, system, maxTokens }) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens ?? 800,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) await failing(res);
  const data = await res.json();
  return (data?.content ?? [])
    .filter((b: { type?: string }) => b?.type === "text")
    .map((b: { text?: string }) => b?.text ?? "").join("");
};

export const ADAPTERS: Record<string, Adapter> = { gemini, anthropic };

export function adapterFor(provider: string): { adapter: Adapter; baseUrl?: string } | null {
  if (ADAPTERS[provider]) return { adapter: ADAPTERS[provider] };
  const compat = OPENAI_COMPATIBLE[provider];
  if (compat) return { adapter: openAiCompatible, baseUrl: compat.baseUrl };
  return null;
}
