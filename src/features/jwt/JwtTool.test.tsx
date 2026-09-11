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
  it('omits the standalone local notice while preserving local context and security warnings', async () => {
    const user = userEvent.setup()
    render(<JwtTool />)

    expect(screen.queryByText('本地处理')).not.toBeInTheDocument()
    expect(screen.getByText(/在浏览器本地解析 Claims/)).toBeVisible()
    await openGenerate(user)
    expect(screen.getByText('无签名警告')).toBeVisible()
    expect(screen.getByText(/当前将生成 alg: none 调试令牌/)).toBeVisible()
  })

  it('keeps stable equal-column workspaces with opposite parse and generation flow', async () => {
    const user = userEvent.setup()
    const { container } = render(<JwtTool />)

    const parseMode = screen.getByTestId('jwt-parse-mode')
    expect(container.querySelector('.jwt-tool > .jwt-mode-row')).not.toBeNull()
    expect(parseMode.parentElement).toHaveClass('jwt-tool')
    const parseWorkspace = parseMode.querySelector('.jwt-workspace-panel') as HTMLElement
    const parseGrid = parseMode.querySelector('.jwt-workspace-grid') as HTMLElement
    expect(parseWorkspace).not.toBeNull()
    expect(parseGrid).toHaveAttribute('data-layout', 'equal-columns')
    expect(Array.from(parseGrid.children).map((column) => column.getAttribute('data-column'))).toEqual(['jwt-input', 'parse-result'])
    expect(screen.getByLabelText('JWT Header')).toHaveTextContent('等待解析')
    expect(screen.getByLabelText('JWT Claims/Payload')).toHaveTextContent('等待解析')
    expect(screen.queryByLabelText('JWT 签名算法')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('签名算法')).not.toBeInTheDocument()
    expect(parseMode.querySelector('.jwt-signature-block')).toBeNull()
    expect(parseMode.querySelector('.jwt-algorithm-row')).toBeNull()
    expect(screen.getByLabelText('解析 Secret（可选）')).toHaveAttribute('placeholder', 'UTF-8文本密钥，留空则不做校验')
    expect(screen.getByText('解析后显示签名校验状态。')).toBeVisible()
    expect(screen.getByRole('button', { name: '复制解析 Header' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '复制解析 Payload' })).toBeDisabled()
    expect(screen.getByRole('group', { name: '解析内容视图' })).toBeVisible()
    expect(screen.queryByText('只读结果')).not.toBeInTheDocument()
    expect(screen.queryByText('只读预览')).not.toBeInTheDocument()
    expect(screen.queryByText('完整内容与注册 Claim')).not.toBeInTheDocument()

    const generateMode = await openGenerate(user)
    const generateWorkspace = generateMode.querySelector('.jwt-workspace-panel') as HTMLElement
    const generateGrid = generateMode.querySelector('.jwt-workspace-grid') as HTMLElement
    expect(generateWorkspace).toHaveClass(...parseWorkspace.classList)
    expect(generateGrid).toHaveAttribute('data-layout', 'equal-columns')
    expect(Array.from(generateGrid.children).map((column) => column.getAttribute('data-column'))).toEqual(['generation-settings', 'generated-jwt'])
    expect(screen.getByLabelText('生成的 JWT')).toHaveTextContent('等待生成')
    expect(screen.getByRole('button', { name: '复制生成的 JWT' })).toBeDisabled()
    const algorithm = screen.getByLabelText('签名算法')
    expect(algorithm.closest('.jwt-mode-row')).not.toBeNull()
    expect(generateMode).not.toContainElement(algorithm)
  })

  it('decodes without trust, then reports valid and invalid UTF-8 secrets', async () => {
    const user = userEvent.setup()
    render(<JwtTool />)
    setValue('JWT', knownToken)

    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByText('签名未校验')).toBeVisible()
    expect(screen.queryByLabelText('JWT 签名算法')).not.toBeInTheDocument()
    expect(screen.getByLabelText('JWT Header')).toHaveTextContent('HS256')
    expect(screen.getByLabelText('JWT Claims/Payload')).toHaveTextContent('John Doe')
    expect(screen.getByRole('button', { name: 'Payload' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '注册 Claim' }))
    const registeredClaims = screen.getByLabelText('注册 Claim 摘要')
    expect(within(registeredClaims).getByText(/1516239022 · 2018-01-18T01:30:22.000Z/)).toBeVisible()
    expect(registeredClaims.closest('.jwt-payload-result-field')).not.toBeNull()
    expect(screen.queryByLabelText('JWT Claims/Payload')).not.toBeInTheDocument()

    setValue('解析 Secret（可选）', 'your-256-bit-secret')
    expect(screen.getByText('Secret 已更改，请重新解析以更新签名状态。')).toBeVisible()
    expect(screen.queryByText('签名未校验')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByText('签名有效')).toBeVisible()

    setValue('解析 Secret（可选）', 'wrong secret')
    expect(screen.getByText('Secret 已更改，请重新解析以更新签名状态。')).toBeVisible()
    expect(screen.queryByText('签名有效')).not.toBeInTheDocument()
    expect(screen.getByLabelText('JWT Header')).toHaveTextContent('HS256')
    expect(screen.getByLabelText('JWT Claims/Payload')).toHaveTextContent('John Doe')
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
    expect(screen.getByLabelText('JWT Header')).toHaveTextContent('等待解析')
    expect(screen.getByLabelText('JWT Claims/Payload')).toHaveTextContent('等待解析')
    expect(screen.getByRole('button', { name: '复制解析 Header' })).toBeDisabled()

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

    let algorithm = screen.getByLabelText('签名算法')
    let preview = screen.getByLabelText('生成 JWT Header 预览')
    expect(JSON.parse(preview.textContent ?? '')).toEqual({ alg: 'none', typ: 'JWT' })
    expect(algorithm).toHaveValue('HS256')

    await user.selectOptions(algorithm, 'HS512')
    expect(algorithm).toHaveValue('HS512')
    expect(JSON.parse(preview.textContent ?? '')).toEqual({ alg: 'none', typ: 'JWT' })

    await user.click(screen.getByRole('radio', { name: '解析' }))
    expect(screen.queryByLabelText('签名算法')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '生成' }))
    algorithm = screen.getByLabelText('签名算法')
    preview = screen.getByLabelText('生成 JWT Header 预览')
    expect(algorithm).toHaveValue('HS512')

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
    const copy = screen.getByRole('button', { name: '复制生成 Secret' })
    const clearSecret = screen.getByRole('button', { name: '删除生成 Secret' })
    const secretField = secret.closest('.jwt-text-field') as HTMLElement
    const secretActions = secretField.querySelector('.jwt-field-actions') as HTMLElement
    expect(secret).toHaveAttribute('type', 'text')
    expect(copy).toBeDisabled()
    expect(clearSecret).toBeDisabled()
    expect(Array.from(secretActions.querySelectorAll('button')).map((button) => button.getAttribute('aria-label') ?? button.textContent?.trim()))
      .toEqual(['生成', '复制生成 Secret', '删除生成 Secret'])
    expect(secretField.querySelector('.jwt-secret-actions')).toBeNull()
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
    expect(screen.getByLabelText('生成的 JWT')).toHaveTextContent('等待生成')
    expect(screen.getByRole('button', { name: '复制生成的 JWT' })).toBeDisabled()
  })

  it('generates a new secret, keeps the JWT copy action aligned through feedback, and clears modes independently', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<JwtTool />)

    setValue('JWT', knownToken)
    const generateMode = await openGenerate(user)
    await user.click(within(generateMode).getByRole('button', { name: '生成' }))
    const generatedSecret = within(generateMode).getByLabelText('生成 Secret（可选）')
    expect((generatedSecret as HTMLInputElement).value).toMatch(/^[A-Za-z0-9_-]{43}$/)
    await user.click(within(generateMode).getByRole('button', { name: '生成 JWT' }))
    const token = await screen.findByLabelText('生成的 JWT')
    const resultColumn = token.closest('.jwt-generation-result') as HTMLElement
    const textRegion = token.closest('.jwt-text-region') as HTMLElement
    const fieldHeading = token.closest('.jwt-text-field')?.querySelector('.field-heading') as HTMLElement
    const copyJwt = within(resultColumn).getByRole('button', { name: '复制生成的 JWT' })
    expect(fieldHeading).toContainElement(copyJwt)
    expect(textRegion).not.toContainElement(copyJwt)
    await user.click(copyJwt)
    expect(writeText).toHaveBeenCalledWith(token.textContent)
    const successFeedback = await screen.findByText('JWT 已复制到剪贴板。')
    expect(successFeedback.closest('.jwt-copy-feedback')).not.toBeNull()
    expect(textRegion).not.toContainElement(successFeedback)
    expect(within(resultColumn).getByRole('button', { name: '复制生成的 JWT' })).toBe(copyJwt)

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await user.click(copyJwt)
    const errorFeedback = await screen.findByText('无法访问剪贴板，请手动复制 JWT。')
    expect(errorFeedback.closest('.jwt-copy-feedback')).not.toBeNull()
    expect(textRegion).not.toContainElement(errorFeedback)
    expect(within(resultColumn).getByRole('button', { name: '复制生成的 JWT' })).toBe(copyJwt)

    await user.click(screen.getByRole('radio', { name: '解析' }))
    expect(screen.getByLabelText('JWT')).toHaveValue(knownToken)
    await user.click(screen.getByRole('button', { name: '清空解析' }))
    expect(screen.getByLabelText('JWT')).toHaveValue('')

    await user.click(screen.getByRole('radio', { name: '生成' }))
    expect(screen.getByLabelText('生成 Secret（可选）')).not.toHaveValue('')
    await user.click(screen.getByRole('button', { name: '清空生成' }))
    expect(screen.getByLabelText('Claims / Payload JSON')).toHaveValue('')
    expect(screen.getByLabelText('生成 Secret（可选）')).not.toHaveValue('')
    expect(screen.getByLabelText('生成的 JWT')).toHaveTextContent('等待生成')
  })

  it('copies every text region through icon-only controls and keeps secrets masked and out of feedback', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<JwtTool />)

    const parseSecret = screen.getByLabelText('解析 Secret（可选）') as HTMLInputElement
    expect(parseSecret).toHaveAttribute('type', 'password')
    setValue('JWT', knownToken)
    setValue('解析 Secret（可选）', 'parse-copy-secret')
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))

    const parseTargets = [
      ['复制 JWT 输入', knownToken],
      ['复制解析 Header', screen.getByLabelText('JWT Header').textContent],
      ['复制解析 Payload', screen.getByLabelText('JWT Claims/Payload').textContent],
      ['复制解析 Secret', 'parse-copy-secret'],
    ] as const
    for (const [name, value] of parseTargets) {
      const button = screen.getByRole('button', { name })
      expect(button).toHaveClass('jwt-copy-button')
      expect(button).toHaveTextContent('')
      expect(button.closest('.field-heading')).not.toBeNull()
      expect(button.closest('.jwt-text-region')).toBeNull()
      await user.click(button)
      expect(writeText).toHaveBeenLastCalledWith(value)
    }
    expect(parseSecret).toHaveAttribute('type', 'password')
    expect(await screen.findByText('Secret 已复制到剪贴板。')).toBeVisible()
    expect(screen.queryByText('parse-copy-secret')).not.toBeInTheDocument()

    await openGenerate(user)
    setValue('Claims / Payload JSON', '{"sub":"copy-all"}')
    setValue('生成 Secret（可选）', 'generate-copy-secret')
    await user.click(screen.getByRole('button', { name: '生成 JWT' }))
    const generateTargets = [
      ['复制生成 Header', screen.getByLabelText('生成 JWT Header 预览').textContent],
      ['复制 Claims / Payload', '{"sub":"copy-all"}'],
      ['复制生成 Secret', 'generate-copy-secret'],
      ['复制生成的 JWT', screen.getByLabelText('生成的 JWT').textContent],
    ] as const
    for (const [name, value] of generateTargets) {
      const button = screen.getByRole('button', { name })
      expect(button.closest('.field-heading')).not.toBeNull()
      expect(button.closest('.jwt-text-region')).toBeNull()
      await user.click(button)
      expect(writeText).toHaveBeenLastCalledWith(value)
    }

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await user.click(screen.getByRole('button', { name: '复制生成 Secret' }))
    const failure = await screen.findByText('无法访问剪贴板，请手动复制 Secret。')
    expect(failure.closest('.jwt-copy-feedback')).not.toBeNull()
    expect(failure).not.toHaveTextContent('generate-copy-secret')
  })

  it('switches one stable result region between Payload and registered Claims and copies only the active view', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<JwtTool />)

    setValue('JWT', knownToken)
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    const payloadToggle = screen.getByRole('button', { name: 'Payload' })
    const registeredToggle = screen.getByRole('button', { name: '注册 Claim' })
    const sharedRegion = document.querySelector('.jwt-payload-view') as HTMLElement
    expect(payloadToggle).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('JWT Claims/Payload')).toHaveTextContent('John Doe')
    expect(document.querySelector('.jwt-payload-region')).toBeNull()

    await user.click(registeredToggle)
    expect(registeredToggle).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('.jwt-payload-view')).toBe(sharedRegion)
    const registeredSummary = screen.getByLabelText('注册 Claim 摘要')
    expect(sharedRegion).toContainElement(registeredSummary)
    const copyRegistered = screen.getByRole('button', { name: '复制注册 Claim' })
    await user.click(copyRegistered)
    expect(writeText).toHaveBeenLastCalledWith(
      'sub: 1234567890\niat: 1516239022 · 2018-01-18T01:30:22.000Z',
    )
    expect(await screen.findByText('注册 Claim 已复制到剪贴板。')).toBeVisible()

    await user.click(payloadToggle)
    expect(document.querySelector('.jwt-payload-view')).toBe(sharedRegion)
    expect(screen.getByRole('button', { name: '复制解析 Payload' })).toBeEnabled()

    const noneHeader = bytesToBase64Url(utf8Bytes(JSON.stringify({ alg: 'none', typ: 'JWT' })))
    const customPayload = bytesToBase64Url(utf8Bytes(JSON.stringify({ custom: true })))
    setValue('JWT', `${noneHeader}.${customPayload}.`)
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(payloadToggle).toHaveAttribute('aria-pressed', 'true')
    await user.click(registeredToggle)
    expect(screen.getByText('Payload 中没有常见注册 Claim。')).toBeVisible()
    expect(screen.getByRole('button', { name: '复制注册 Claim' })).toBeDisabled()
  })

  it('deletes only the parsing Secret while retaining parsed input and content', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
    render(<JwtTool />)

    setValue('JWT', knownToken)
    setValue('解析 Secret（可选）', 'your-256-bit-secret')
    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByText('签名有效')).toBeVisible()
    const headerText = screen.getByLabelText('JWT Header').textContent
    const payloadText = screen.getByLabelText('JWT Claims/Payload').textContent
    const copySecret = screen.getByRole('button', { name: '复制解析 Secret' })
    const deleteSecret = screen.getByRole('button', { name: '删除解析 Secret' })
    expect(deleteSecret.querySelector('svg.jwt-delete-icon')).not.toBeNull()
    expect(deleteSecret).toHaveAttribute('title', '删除解析 Secret')

    await user.click(copySecret)
    expect(await screen.findByText('Secret 已复制到剪贴板。')).toBeVisible()
    await user.click(deleteSecret)
    expect(screen.getByLabelText('解析 Secret（可选）')).toHaveValue('')
    expect(copySecret).toBeDisabled()
    expect(deleteSecret).toBeDisabled()
    expect(screen.queryByText('Secret 已复制到剪贴板。')).not.toBeInTheDocument()
    expect(screen.getByLabelText('JWT')).toHaveValue(knownToken)
    expect(screen.getByLabelText('JWT Header').textContent).toBe(headerText)
    expect(screen.getByLabelText('JWT Claims/Payload').textContent).toBe(payloadText)
    expect(screen.queryByText('签名有效')).not.toBeInTheDocument()
    expect(screen.getByText('Secret 已更改，请重新解析以更新签名状态。')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '解析 JWT' }))
    expect(await screen.findByText('签名未校验')).toBeVisible()
    expect(screen.queryByText('Secret 已更改，请重新解析以更新签名状态。')).not.toBeInTheDocument()
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
    const settingsColumn = screen.getByTestId('jwt-generate-mode').querySelector('.jwt-generation-settings')
    expect(output).toHaveClass('jwt-token-output')
    expect(preview).toHaveClass('jwt-header-preview-output')
    expect(grid).not.toBeNull()
    expect(grid).toHaveAttribute('data-layout', 'equal-columns')
    expect(settingsColumn).not.toBeNull()
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
