import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { bytesToBase64Url, utf8Bytes } from '../../shared/bytes'
import { JwtTool } from './JwtTool'
import { parseJwt, verifyJwt } from './jwt'

const knownToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

function setValue(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

async function openGenerate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: '生成' }))
  return screen.getByTestId('jwt-generate-mode')
}

describe('JwtTool', () => {
  it('decodes without trust, then reports valid and invalid UTF-8 secrets', async () => {
    const user = userEvent.setup()
    render(<JwtTool />)
    setValue('JWT', knownToken)

    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByText('签名未校验')).toBeVisible()
    expect(screen.getByLabelText('JWT Header')).toHaveTextContent('HS256')
    expect(screen.getByLabelText('JWT Claims/Payload')).toHaveTextContent('John Doe')
    expect(screen.getByText(/1516239022 · 2018-01-18T01:30:22.000Z/)).toBeVisible()

    setValue('解析 Secret（可选）', 'your-256-bit-secret')
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByText('签名有效')).toBeVisible()

    setValue('解析 Secret（可选）', 'wrong secret')
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByText('签名无效')).toBeVisible()
    expect(screen.getByText(/以下内容不可信/)).toBeVisible()
  })

  it('clears stale parsed output on malformed input and reports unsupported and unsigned tokens', async () => {
    const user = userEvent.setup()
    render(<JwtTool />)
    setValue('JWT', knownToken)
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByLabelText('JWT Header')).toBeVisible()

    setValue('JWT', 'broken.token')
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByText(/恰好包含三个/)).toBeVisible()
    expect(screen.queryByLabelText('JWT Header')).not.toBeInTheDocument()

    const unsupportedHeader = bytesToBase64Url(utf8Bytes(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
    setValue('JWT', `${unsupportedHeader}.e30.AA`)
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByText('不支持的算法')).toBeVisible()

    const noneHeader = bytesToBase64Url(utf8Bytes(JSON.stringify({ alg: 'none', typ: 'JWT' })))
    setValue('JWT', `${noneHeader}.e30.`)
    setValue('解析 Secret（可选）', 'secret-cannot-upgrade-none')
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByText('无签名')).toBeVisible()
    expect(screen.getByText(/不得用于身份认证或授权/)).toBeVisible()
  })

  it.each(['HS256', 'HS384', 'HS512'] as const)('generates and verifies a %s token from the page', async (algorithm) => {
    const user = userEvent.setup()
    render(<JwtTool />)
    await openGenerate(user)
    setValue('Claims / Payload JSON', '{"sub":"alice","role":"admin"}')
    setValue('生成 Secret（可选）', 'page secret')
    await user.selectOptions(screen.getByLabelText('签名算法'), algorithm)
    const preview = screen.getByLabelText('生成 JWT Header 预览')
    expect(JSON.parse(preview.textContent ?? '')).toEqual({ alg: algorithm, typ: 'JWT' })
    await user.click(screen.getByRole('button', { name: '生成 JWT' }))

    const token = await screen.findByLabelText('生成的 JWT')
    const parsed = parseJwt(token.textContent ?? '')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.header).toEqual(JSON.parse(preview.textContent ?? ''))
    expect(parsed.value.header).toEqual({ alg: algorithm, typ: 'JWT' })
    expect(parsed.value.payload).toEqual({ sub: 'alice', role: 'admin' })
    expect(await verifyJwt(parsed.value, 'page secret')).toBe('valid')
  })

  it('shows an explicit derived header while retaining the selected algorithm across secret changes', async () => {
    const user = userEvent.setup()
    render(<JwtTool />)
    await openGenerate(user)

    const algorithm = screen.getByLabelText('签名算法')
    const preview = screen.getByLabelText('生成 JWT Header 预览')
    expect(JSON.parse(preview.textContent ?? '')).toEqual({ alg: 'none', typ: 'JWT' })
    expect(algorithm).toHaveValue('HS256')

    await user.selectOptions(algorithm, 'HS512')
    expect(algorithm).toHaveValue('HS512')
    expect(JSON.parse(preview.textContent ?? '')).toEqual({ alg: 'none', typ: 'JWT' })

    setValue('生成 Secret（可选）', 'preview secret')
    expect(algorithm).toBeVisible()
    expect(algorithm).toHaveValue('HS512')
    expect(JSON.parse(preview.textContent ?? '')).toEqual({ alg: 'HS512', typ: 'JWT' })

    setValue('生成 Secret（可选）', '')
    expect(algorithm).toBeVisible()
    expect(algorithm).toHaveValue('HS512')
    expect(JSON.parse(preview.textContent ?? '')).toEqual({ alg: 'none', typ: 'JWT' })

    await user.click(screen.getByRole('button', { name: '生成 JWT' }))
    const parsed = parseJwt((await screen.findByLabelText('生成的 JWT')).textContent ?? '')
    expect(parsed.ok && parsed.value.header).toEqual(JSON.parse(preview.textContent ?? ''))
  })

  it('warns but directly generates an unsigned token without confirmation controls', async () => {
    const user = userEvent.setup()
    render(<JwtTool />)
    await openGenerate(user)
    expect(screen.getByText(/当前将生成 alg: none/)).toBeVisible()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '生成 JWT' }))
    const token = await screen.findByLabelText('生成的 JWT')
    expect(token.textContent).toMatch(/\.$/)
    expect(screen.getByText(/无签名 · 不得用于身份认证或授权/)).toBeVisible()
  })

  it('shows, copies, and clears the generation secret with independent state boundaries', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<JwtTool />)
    await openGenerate(user)

    const secret = screen.getByLabelText('生成 Secret（可选）') as HTMLInputElement
    const copy = screen.getByRole('button', { name: '复制 Secret' })
    const clearSecret = screen.getByRole('button', { name: '清除 Secret' })
    expect(secret).toHaveAttribute('type', 'text')
    expect(copy).toBeDisabled()
    expect(clearSecret).toBeDisabled()
    expect(screen.queryByRole('button', { name: /查看 Secret|隐藏 Secret/ })).not.toBeInTheDocument()

    setValue('生成 Secret（可选）', 'sensitive-value')
    setValue('Claims / Payload JSON', '{"sub":"keep-me"}')
    await user.selectOptions(screen.getByLabelText('签名算法'), 'HS512')
    expect(copy).toBeEnabled()
    expect(clearSecret).toBeEnabled()
    expect(secret).toHaveValue('sensitive-value')

    await user.click(copy)
    expect(writeText).toHaveBeenCalledWith('sensitive-value')
    expect(await screen.findByText('Secret 已复制到剪贴板。')).toBeVisible()
    expect(screen.queryByText('sensitive-value')).not.toBeInTheDocument()

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await user.click(copy)
    expect(await screen.findByText('无法访问剪贴板，请手动复制 Secret。')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '生成 JWT' }))
    const token = await screen.findByLabelText('生成的 JWT')
    await user.click(clearSecret)
    expect(secret).toHaveValue('')
    expect(clearSecret).toBeDisabled()
    expect(copy).toBeDisabled()
    expect(token).toBeInTheDocument()
    expect(screen.getByLabelText('Claims / Payload JSON')).toHaveValue('{"sub":"keep-me"}')
    expect(screen.getByLabelText('签名算法')).toHaveValue('HS512')
    expect(screen.queryByText('无法访问剪贴板，请手动复制 Secret。')).not.toBeInTheDocument()

    setValue('生成 Secret（可选）', 'preserved-by-clear-generation')
    await user.click(screen.getByRole('button', { name: '清空生成' }))
    expect(secret).toHaveValue('preserved-by-clear-generation')
    expect(screen.getByLabelText('Claims / Payload JSON')).toHaveValue('')
    expect(screen.queryByLabelText('生成的 JWT')).not.toBeInTheDocument()
  })

  it('generates a new secret, keeps the JWT copy action aligned through feedback, and clears modes independently', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<JwtTool />)

    setValue('JWT', knownToken)
    const generateMode = await openGenerate(user)
    await user.click(within(generateMode).getByRole('button', { name: '生成新 Secret' }))
    const generatedSecret = within(generateMode).getByLabelText('生成 Secret（可选）')
    expect((generatedSecret as HTMLInputElement).value).toMatch(/^[A-Za-z0-9_-]{43}$/)
    await user.click(within(generateMode).getByRole('button', { name: '生成 JWT' }))
    const token = await screen.findByLabelText('生成的 JWT')
    const resultPanel = token.closest('.jwt-result-panel') as HTMLElement
    const resultHeading = resultPanel.querySelector('.panel-heading') as HTMLElement
    const copyJwt = within(resultPanel).getByRole('button', { name: '复制 JWT' })
    expect(resultHeading).toContainElement(copyJwt)
    await user.click(copyJwt)
    expect(writeText).toHaveBeenCalledWith(token.textContent)
    const successFeedback = await screen.findByText('JWT 已复制到剪贴板。')
    expect(successFeedback.closest('.jwt-result-copy-feedback')).not.toBeNull()
    expect(resultHeading).not.toContainElement(successFeedback)
    expect(resultPanel.querySelector('.panel-heading')).toBe(resultHeading)
    expect(within(resultPanel).getByRole('button', { name: '复制 JWT' })).toBe(copyJwt)

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await user.click(copyJwt)
    const errorFeedback = await screen.findByText('无法访问剪贴板，请手动复制 JWT。')
    expect(errorFeedback.closest('.jwt-result-copy-feedback')).not.toBeNull()
    expect(resultHeading).not.toContainElement(errorFeedback)
    expect(resultPanel.querySelector('.panel-heading')).toBe(resultHeading)
    expect(within(resultPanel).getByRole('button', { name: '复制 JWT' })).toBe(copyJwt)

    await user.click(screen.getByRole('radio', { name: '解析' }))
    expect(screen.getByLabelText('JWT')).toHaveValue(knownToken)
    await user.click(screen.getByRole('button', { name: '清空解析' }))
    expect(screen.getByLabelText('JWT')).toHaveValue('')

    await user.click(screen.getByRole('radio', { name: '生成' }))
    expect(screen.getByLabelText('生成 Secret（可选）')).not.toHaveValue('')
    await user.click(screen.getByRole('button', { name: '清空生成' }))
    expect(screen.getByLabelText('Claims / Payload JSON')).toHaveValue('')
    expect(screen.getByLabelText('生成 Secret（可选）')).not.toHaveValue('')
    expect(screen.queryByLabelText('生成的 JWT')).not.toBeInTheDocument()
  })

  it('keeps sensitive operations local and usable with long content on narrow viewports', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const originalUrl = window.location.href
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
    render(<JwtTool />)
    await openGenerate(user)
    setValue('Claims / Payload JSON', JSON.stringify({ sub: 'alice', long: 'x'.repeat(5000) }))
    setValue('生成 Secret（可选）', 'never-log-this-secret')
    await user.click(screen.getByRole('button', { name: '生成 JWT' }))

    const output = await screen.findByLabelText('生成的 JWT')
    const preview = screen.getByLabelText('生成 JWT Header 预览')
    const grid = screen.getByTestId('jwt-generate-mode').querySelector('.jwt-generate-grid')
    const claimsColumn = screen.getByTestId('jwt-generate-mode').querySelector('.jwt-claims-column')
    expect(output).toHaveClass('jwt-token-output')
    expect(preview).toHaveClass('jwt-header-preview-output')
    expect(grid).not.toBeNull()
    expect(grid).toHaveAttribute('data-layout', 'equal-columns')
    expect(claimsColumn).not.toBeNull()
    expect(preview).toBeVisible()
    expect(output.textContent?.length).toBeGreaterThan(5000)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
    expect(logSpy).not.toHaveBeenCalled()
    expect(window.location.href).toBe(originalUrl)
    fetchSpy.mockRestore()
    storageSpy.mockRestore()
    logSpy.mockRestore()
  })
})
