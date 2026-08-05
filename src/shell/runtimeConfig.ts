import { DEFAULT_TOOL_AVAILABILITY, TOOL_IDS, type ToolAvailability, type ToolId } from './toolRegistry'

const knownToolIds = new Set<string>(TOOL_IDS)
const defaults = (): ToolAvailability => ({ ...DEFAULT_TOOL_AVAILABILITY })

export function parseRuntimeConfig(value: unknown): ToolAvailability {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults()
  const tools = (value as { tools?: unknown }).tools
  if (!tools || typeof tools !== 'object' || Array.isArray(tools)) return defaults()

  const result = defaults()
  for (const [key, enabled] of Object.entries(tools)) {
    if (!knownToolIds.has(key)) continue
    if (typeof enabled !== 'boolean') return defaults()
    result[key as ToolId] = enabled
  }
  return result
}

export async function loadRuntimeConfig({
  baseUrl = document.baseURI,
  fetcher = globalThis.fetch,
  timeoutMs = 3000,
}: {
  baseUrl?: string
  fetcher?: typeof fetch
  timeoutMs?: number
} = {}): Promise<ToolAvailability> {
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetcher(new URL('toolbox.config.json', baseUrl), { cache: 'no-store', signal: controller.signal })
    if (!response.ok) return defaults()
    return parseRuntimeConfig(await response.json())
  } catch {
    return defaults()
  } finally {
    globalThis.clearTimeout(timer)
  }
}
