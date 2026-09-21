import { CHAT_PRESETS, EMBEDDING_PRESETS, baseUrlEndpointSuffix, findPreset } from './ai-providers'

describe('AI provider presets', () => {
  it('lists current DeepSeek chat models', () => {
    const deepseek = CHAT_PRESETS.find((preset) => preset.id === 'deepseek')
    expect(deepseek).toMatchObject({
      protocol: 'openai_compatible',
      baseUrl: 'https://api.deepseek.com/v1',
      models: ['deepseek-flash', 'deepseek-v4-pro'],
    })
  })

  it('does not advertise DeepSeek as an embedding host', () => {
    expect(EMBEDDING_PRESETS.some((preset) => preset.id === 'deepseek')).toBe(false)
  })

  it('defaults OpenRouter embedding to qwen/qwen3-embedding-4b with bge-m3 alternative', () => {
    const openrouter = EMBEDDING_PRESETS.find((preset) => preset.id === 'openrouter')
    expect(openrouter).toMatchObject({
      protocol: 'openai_compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
      models: ['qwen/qwen3-embedding-4b', 'openai/text-embedding-3-small', 'baai/bge-m3'],
    })
  })

  it('flags Base URLs pasted with an endpoint suffix', () => {
    expect(baseUrlEndpointSuffix('https://openrouter.ai/api/v1/embeddings')).toBe('/embeddings')
    expect(baseUrlEndpointSuffix('https://api.deepseek.com/v1/chat/completions/')).toBe(
      '/chat/completions',
    )
    expect(baseUrlEndpointSuffix('https://api.anthropic.com/v1/messages')).toBe('/v1/messages')
    expect(baseUrlEndpointSuffix('https://openrouter.ai/api/v1')).toBeUndefined()
    expect(baseUrlEndpointSuffix('http://localhost:11434/v1')).toBeUndefined()
  })

  it('matches DeepSeek docs base URL without /v1', () => {
    expect(findPreset(CHAT_PRESETS, 'https://api.deepseek.com', 'openai_compatible')?.id).toBe(
      'deepseek',
    )
  })
})
