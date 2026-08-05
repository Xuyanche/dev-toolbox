import { DEFAULT_TOOL_AVAILABILITY } from './toolRegistry'
import { loadRuntimeConfig, parseRuntimeConfig } from './runtimeConfig'

describe('runtime tool configuration', () => {
  it('uses complete defaults with DES disabled', () => {
    expect(parseRuntimeConfig({ tools: {} })).toEqual(DEFAULT_TOOL_AVAILABILITY)
    expect(DEFAULT_TOOL_AVAILABILITY.des).toBe(false)
    expect(Object.entries(DEFAULT_TOOL_AVAILABILITY).filter(([, enabled]) => !enabled)).toEqual([['des', false]])
  })

  it('applies known boolean overrides and ignores unknown keys', () => {
    expect(parseRuntimeConfig({ tools: { des: true, json: false, futureTool: true } })).toEqual({
      ...DEFAULT_TOOL_AVAILABILITY,
      des: true,
      json: false,
    })
  })

  it.each([
    null,
    [],
    {},
    { tools: null },
    { tools: [] },
    { tools: { des: 'yes' } },
  ])('falls back completely for invalid structure %#', (value) => {
    expect(parseRuntimeConfig(value)).toEqual(DEFAULT_TOOL_AVAILABILITY)
  })

  it('loads relative to a subpath base URL without caching or request data', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tools: { des: true } }),
    })

    await expect(loadRuntimeConfig({
      baseUrl: 'https://example.test/deploy/toolbox/index.html',
      fetcher,
      timeoutMs: 100,
    })).resolves.toEqual({ ...DEFAULT_TOOL_AVAILABILITY, des: true })

    expect(fetcher).toHaveBeenCalledTimes(1)
    const [url, options] = fetcher.mock.calls[0]
    expect(url.toString()).toBe('https://example.test/deploy/toolbox/toolbox.config.json')
    expect(options).toMatchObject({ cache: 'no-store' })
    expect(options).not.toHaveProperty('body')
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it.each([
    vi.fn().mockResolvedValue({ ok: false }),
    vi.fn().mockRejectedValue(new Error('offline')),
    vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('invalid JSON') } }),
  ])('falls back when loading fails %#', async (fetcher) => {
    await expect(loadRuntimeConfig({
      baseUrl: 'https://example.test/toolbox/',
      fetcher,
      timeoutMs: 100,
    })).resolves.toEqual(DEFAULT_TOOL_AVAILABILITY)
  })
})
