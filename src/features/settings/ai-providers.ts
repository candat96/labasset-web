/** Preset nhà cung cấp theo hợp đồng AI provider 2026-09-21 (giao thức + Base URL). */
export interface ProviderPreset {
  id: string
  protocol: 'openai_compatible' | 'anthropic' | 'voyage'
  baseUrl: string
  models: string[]
}

export const CHAT_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  },
  {
    id: 'openrouter',
    protocol: 'openai_compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o-mini', 'anthropic/claude-sonnet-5', 'google/gemini-2.0-flash-001'],
  },
  {
    id: 'deepseek',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'glm',
    protocol: 'openai_compatible',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.7-flash', 'glm-4.7', 'glm-4.5-air'],
  },
  {
    id: 'groq',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
  {
    id: 'ollama',
    protocol: 'openai_compatible',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.1', 'qwen2.5'],
  },
  {
    id: 'anthropic',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-sonnet-5', 'claude-haiku-4'],
  },
]

export const EMBEDDING_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.openai.com/v1',
    models: ['text-embedding-3-small', 'text-embedding-3-large'],
  },
  {
    id: 'openrouter',
    protocol: 'openai_compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/text-embedding-3-small'],
  },
  {
    id: 'deepseek',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat'],
  },
  {
    id: 'voyage',
    protocol: 'voyage',
    baseUrl: 'https://api.voyageai.com/v1',
    models: ['voyage-3', 'voyage-3-lite'],
  },
  {
    id: 'ollama',
    protocol: 'openai_compatible',
    baseUrl: 'http://localhost:11434/v1',
    models: ['nomic-embed-text'],
  },
]

/** Tìm preset khớp Base URL hiện tại (ưu tiên khớp URL, protocol phải cùng loại). */
export function findPreset(
  presets: ProviderPreset[],
  baseUrl: string,
  protocol: string,
): ProviderPreset | undefined {
  return presets.find((p) => p.baseUrl === baseUrl && p.protocol === protocol)
}
