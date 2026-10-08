import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { FieldIconButton, Panel, Segmented, StatusMessage, ToolHeader, type StatusState } from '../../shell/ui'
import { runPrimaryActionShortcut } from '../../shared/keyboard'
import {
  deriveJwtHeader,
  generateJwt,
  generateSecret,
  getRegisteredClaims,
  parseJsonObject,
  parseJwt,
  verifyJwt,
  type HmacAlgorithm,
  type JwtTrustStatus,
  type ParsedJwt,
} from './jwt'

type JwtMode = 'parse' | 'generate'
type ParsedContentView = 'payload' | 'registered'

const AUTO_PROCESS_DELAY = 300

const trustPresentation: Record<JwtTrustStatus, { label: string; tone: string; message: string }> = {
  valid: { label: '签名有效', tone: 'valid', message: '签名与当前 UTF-8 Secret 匹配。' },
  invalid: { label: '签名无效', tone: 'danger', message: '签名与当前 Secret 不匹配，以下内容不可信。' },
  unverified: { label: '签名未校验', tone: 'warning', message: '当前仅完成解码；解码结果不代表内容可信。' },
  unsigned: { label: '无签名', tone: 'danger', message: '这是 alg: none 调试令牌，不得用于身份认证或授权。' },
  unsupported: { label: '不支持的算法', tone: 'warning', message: '仅支持校验 HS256、HS384 和 HS512，以下内容未经验证。' },
}

const formatJson = (value: object) => JSON.stringify(value, null, 2)

function formatClaim(name: string, value: unknown) {
  if (['exp', 'nbf', 'iat'].includes(name) && typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value * 1000)
    return `${value} · ${Number.isNaN(date.getTime()) ? '无效 NumericDate' : date.toISOString()}`
  }
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function JwtCopyButton({
  value,
  copyLabel,
  feedbackLabel,
  onCopy,
}: {
  value: string
  copyLabel: string
  feedbackLabel: string
  onCopy: (value: string, feedbackLabel: string) => void | Promise<void>
}) {
  return (
    <FieldIconButton
      kind="copy"
      className="jwt-heading-icon-button jwt-copy-button"
      iconClassName="jwt-copy-icon"
      label={copyLabel}
      disabled={!value}
      onClick={() => onCopy(value, feedbackLabel)}
    />
  )
}

function JwtDeleteButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <FieldIconButton
      kind="delete"
      className="jwt-heading-icon-button jwt-delete-button"
      iconClassName="jwt-delete-icon"
      label={label}
      disabled={disabled}
      onClick={onClick}
    />
  )
}

function JwtTextRegion({
  label,
  value,
  copyLabel,
  feedbackLabel,
  fieldClassName = '',
  regionClassName = '',
  hint,
  beforeCopy,
  afterCopy,
  onCopy,
  children,
}: {
  label: string
  value: string
  copyLabel: string
  feedbackLabel: string
  fieldClassName?: string
  regionClassName?: string
  hint?: ReactNode
  beforeCopy?: ReactNode
  afterCopy?: ReactNode
  onCopy: (value: string, feedbackLabel: string) => void | Promise<void>
  children: ReactNode
}) {
  return (
    <div className={`field jwt-text-field${fieldClassName ? ` ${fieldClassName}` : ''}`}>
      <div className="field-heading">
        <span className="field-label">{label}</span>
        <div className="jwt-field-actions">
          {beforeCopy}
          <JwtCopyButton value={value} copyLabel={copyLabel} feedbackLabel={feedbackLabel} onCopy={onCopy} />
          {afterCopy}
        </div>
      </div>
      <div className={`jwt-text-region${regionClassName ? ` ${regionClassName}` : ''}`}>{children}</div>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  )
}

export function JwtTool() {
  const [mode, setMode] = useState<JwtMode>('parse')

  const [parseInput, setParseInput] = useState('')
  const [parseSecret, setParseSecret] = useState('')
  const [parsed, setParsed] = useState<ParsedJwt | null>(null)
  const [parsedContentView, setParsedContentView] = useState<ParsedContentView>('payload')
  const [trust, setTrust] = useState<JwtTrustStatus | null>(null)
  const [parseStatus, setParseStatus] = useState<StatusState>(null)
  const [parseCopyStatus, setParseCopyStatus] = useState<StatusState>(null)
  const parseRevisionRef = useRef(0)
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [claimsInput, setClaimsInput] = useState('{\n  "sub": "1234567890"\n}')
  const [generateSecretInput, setGenerateSecretInput] = useState('')
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>('HS256')
  const [generatedToken, setGeneratedToken] = useState('')
  const [generateStatus, setGenerateStatus] = useState<StatusState>(null)
  const [generateCopyStatus, setGenerateCopyStatus] = useState<StatusState>(null)
  const generateRevisionRef = useRef(0)
  const generateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function copyText(value: string, feedbackLabel: string, setCopyStatus: (status: StatusState) => void) {
    if (!value) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setCopyStatus({ kind: 'success', message: `${feedbackLabel} 已复制到剪贴板。` })
    } catch {
      setCopyStatus({ kind: 'error', message: `无法访问剪贴板，请手动复制 ${feedbackLabel}。` })
    }
  }

  const copyParseText = (value: string, feedbackLabel: string) => copyText(value, feedbackLabel, setParseCopyStatus)
  const copyGenerateText = (value: string, feedbackLabel: string) => copyText(value, feedbackLabel, setGenerateCopyStatus)

  const clearParseResult = useCallback(() => {
    setParsed(null)
    setParsedContentView('payload')
    setTrust(null)
    setParseStatus(null)
    setParseCopyStatus(null)
  }, [])

  const executeParse = useCallback(async (input: string, secret: string, revision: number) => {
    const result = parseJwt(input)
    if (revision !== parseRevisionRef.current) return
    if (!result.ok) {
      setParsed(null)
      setParsedContentView('payload')
      setTrust(null)
      setParseStatus({ kind: 'error', message: result.message })
      return
    }

    setParsed(result.value)
    setParsedContentView('payload')
    setTrust(null)
    setParseStatus(null)
    const nextTrust = await verifyJwt(result.value, secret)
    if (revision !== parseRevisionRef.current) return
    setTrust(nextTrust)
  }, [])

  const flushParse = useCallback(() => {
    if (parseTimerRef.current !== null) {
      clearTimeout(parseTimerRef.current)
      parseTimerRef.current = null
    }
    const revision = ++parseRevisionRef.current
    if (!parseInput.trim()) {
      clearParseResult()
      return
    }
    setParseStatus(null)
    setParseCopyStatus(null)
    void executeParse(parseInput, parseSecret, revision)
  }, [clearParseResult, executeParse, parseInput, parseSecret])

  useEffect(() => {
    if (mode !== 'parse') return
    const revision = ++parseRevisionRef.current
    if (!parseInput.trim()) {
      clearParseResult()
      return
    }
    parseTimerRef.current = setTimeout(() => {
      parseTimerRef.current = null
      void executeParse(parseInput, parseSecret, revision)
    }, AUTO_PROCESS_DELAY)
    return () => {
      if (parseTimerRef.current !== null) {
        clearTimeout(parseTimerRef.current)
        parseTimerRef.current = null
      }
      parseRevisionRef.current += 1
    }
  }, [clearParseResult, executeParse, mode, parseInput, parseSecret])

  function clearParseInput() {
    if (parseTimerRef.current !== null) {
      clearTimeout(parseTimerRef.current)
      parseTimerRef.current = null
    }
    parseRevisionRef.current += 1
    setParseInput('')
    clearParseResult()
  }

  function deleteParseSecret() {
    setParseSecret('')
    setTrust(null)
    setParseCopyStatus(null)
  }

  const clearGenerateResult = useCallback(() => {
    setGeneratedToken('')
    setGenerateStatus(null)
    setGenerateCopyStatus(null)
  }, [])

  const executeGenerate = useCallback(async (
    claims: string,
    secret: string,
    selectedAlgorithm: HmacAlgorithm,
    revision: number,
  ) => {
    const payload = parseJsonObject(claims, 'Claims/Payload')
    if (revision !== generateRevisionRef.current) return
    if (!payload.ok) {
      setGeneratedToken('')
      setGenerateStatus({ kind: 'error', message: payload.message })
      return
    }
    const result = await generateJwt(payload.value, secret, selectedAlgorithm)
    if (revision !== generateRevisionRef.current) return
    if (!result.ok) {
      setGeneratedToken('')
      setGenerateStatus({ kind: 'error', message: result.message })
      return
    }
    setGeneratedToken(result.value)
    setGenerateStatus(null)
  }, [])

  const flushGenerate = useCallback(() => {
    if (generateTimerRef.current !== null) {
      clearTimeout(generateTimerRef.current)
      generateTimerRef.current = null
    }
    const revision = ++generateRevisionRef.current
    if (!claimsInput.trim()) {
      clearGenerateResult()
      return
    }
    setGenerateStatus(null)
    setGenerateCopyStatus(null)
    void executeGenerate(claimsInput, generateSecretInput, algorithm, revision)
  }, [algorithm, claimsInput, clearGenerateResult, executeGenerate, generateSecretInput])

  useEffect(() => {
    if (mode !== 'generate') return
    const revision = ++generateRevisionRef.current
    if (!claimsInput.trim()) {
      clearGenerateResult()
      return
    }
    generateTimerRef.current = setTimeout(() => {
      generateTimerRef.current = null
      void executeGenerate(claimsInput, generateSecretInput, algorithm, revision)
    }, AUTO_PROCESS_DELAY)
    return () => {
      if (generateTimerRef.current !== null) {
        clearTimeout(generateTimerRef.current)
        generateTimerRef.current = null
      }
      generateRevisionRef.current += 1
    }
  }, [algorithm, claimsInput, clearGenerateResult, executeGenerate, generateSecretInput, mode])

  function clearClaimsInput() {
    if (generateTimerRef.current !== null) {
      clearTimeout(generateTimerRef.current)
      generateTimerRef.current = null
    }
    generateRevisionRef.current += 1
    setClaimsInput('')
    clearGenerateResult()
  }

  function createSecret() {
    const result = generateSecret()
    if (!result.ok) {
      setGenerateStatus({ kind: 'error', message: result.message })
      return
    }
    setGenerateSecretInput(result.value)
    setGeneratedToken('')
    setGenerateCopyStatus(null)
    setGenerateStatus(null)
  }

  function deleteGenerateSecret() {
    setGenerateSecretInput('')
    setGeneratedToken('')
    setGenerateStatus(null)
    setGenerateCopyStatus(null)
  }

  const claims = parsed ? Object.entries(getRegisteredClaims(parsed.payload)) : []
  const registeredClaimsText = claims.map(([name, value]) => `${name}: ${formatClaim(name, value)}`).join('\n')
  const trustInfo = trust ? trustPresentation[trust] : null
  const parsedHeader = parsed ? formatJson(parsed.header) : ''
  const parsedPayload = parsed ? formatJson(parsed.payload) : ''
  const activeParsedText = parsedContentView === 'payload' ? parsedPayload : registeredClaimsText
  const activeParsedCopyLabel = parsedContentView === 'payload' ? '复制解析 Payload' : '复制注册 Claim'
  const activeParsedFeedbackLabel = parsedContentView === 'payload' ? 'Payload' : '注册 Claim'
  const generatedHeaderText = formatJson(deriveJwtHeader(generateSecretInput, algorithm))

  const parsedViewToggle = (
    <div className="jwt-view-toggle" role="group" aria-label="解析内容视图">
      <button
        type="button"
        aria-pressed={parsedContentView === 'payload'}
        onClick={() => {
          setParsedContentView('payload')
          setParseCopyStatus(null)
        }}
      >
        Payload
      </button>
      <button
        type="button"
        aria-pressed={parsedContentView === 'registered'}
        onClick={() => {
          setParsedContentView('registered')
          setParseCopyStatus(null)
        }}
      >
        注册 Claim
      </button>
    </div>
  )

  return (
    <div className="tool-page jwt-tool">
      <ToolHeader
        eyebrow="JSON WEB TOKEN"
        title="JWT 生成与解析"
        description="在浏览器本地解析 Claims、校验 HMAC 签名或生成调试令牌；Secret 始终按 UTF-8 文本处理。"
      />
      <div className="settings-row jwt-mode-row">
        <Segmented
          label="操作"
          value={mode}
          onChange={setMode}
          options={[{ value: 'parse', label: '解析' }, { value: 'generate', label: '生成' }]}
        />
        {mode === 'generate' ? (
          <label className="select-field jwt-algorithm-control">
            <span>签名算法</span>
            <select
              aria-label="签名算法"
              value={algorithm}
              onChange={(event) => {
                setAlgorithm(event.target.value as HmacAlgorithm)
                setGeneratedToken('')
                setGenerateStatus(null)
                setGenerateCopyStatus(null)
              }}
            >
              <option value="HS256">HS256</option>
              <option value="HS384">HS384</option>
              <option value="HS512">HS512</option>
            </select>
          </label>
        ) : null}
      </div>

      {mode === 'parse' ? (
        <div className="jwt-mode" data-testid="jwt-parse-mode">
          <div className="jwt-workspace-panel">
            <Panel title="解析工作区">
              <div className="jwt-workspace-grid jwt-parse-grid" data-layout="equal-columns">
                <div className="jwt-workspace-column jwt-parse-input-column" data-column="jwt-input">
                  <JwtTextRegion
                    label="JWT"
                    value={parseInput}
                    copyLabel="复制 JWT 输入"
                    feedbackLabel="JWT 输入"
                    onCopy={copyParseText}
                    afterCopy={<JwtDeleteButton label="清空 JWT 输入" disabled={!parseInput} onClick={clearParseInput} />}
                    fieldClassName="jwt-fill-field"
                    regionClassName="jwt-fill-region"
                    hint={parseStatus?.kind === 'error' ? (
                      <span className="jwt-field-error" role="alert">{parseStatus.message}</span>
                    ) : '仅接受严格的三段式、无填充 Base64URL JWT。'}
                  >
                    <textarea
                      aria-label="JWT"
                      value={parseInput}
                      onChange={(event) => {
                        const nextInput = event.target.value
                        setParseInput(nextInput)
                        setParsed(null)
                        setParsedContentView('payload')
                        setTrust(null)
                        setParseStatus(null)
                        setParseCopyStatus(null)
                        if (!nextInput.trim()) clearParseResult()
                      }}
                      rows={10}
                      spellCheck={false}
                      placeholder="粘贴 header.payload.signature"
                      onKeyDown={(event) => runPrimaryActionShortcut(event, 'ctrl-enter', flushParse)}
                    />
                  </JwtTextRegion>
                </div>

                <div className="jwt-workspace-column jwt-parse-result-column" data-column="parse-result">
                  <JwtTextRegion
                    label="Header"
                    value={parsedHeader}
                    copyLabel="复制解析 Header"
                    feedbackLabel="Header"
                    onCopy={copyParseText}
                    fieldClassName="jwt-result-field jwt-header-result-field"
                    regionClassName="jwt-fill-region"
                  >
                    <pre className="jwt-json-output" aria-label="JWT Header">{parsedHeader || '等待解析'}</pre>
                  </JwtTextRegion>

                  <JwtTextRegion
                    label="Claims / Payload"
                    value={activeParsedText}
                    copyLabel={activeParsedCopyLabel}
                    feedbackLabel={activeParsedFeedbackLabel}
                    onCopy={copyParseText}
                    beforeCopy={parsedViewToggle}
                    fieldClassName="jwt-result-field jwt-payload-result-field"
                    regionClassName="jwt-fill-region jwt-payload-view"
                  >
                    {parsedContentView === 'payload' ? (
                      <pre className="jwt-json-output" aria-label="JWT Claims/Payload">{parsedPayload || '等待解析'}</pre>
                    ) : (
                      <div className="jwt-claims-summary-region" aria-label="注册 Claim 摘要">
                        {parsed ? (claims.length ? (
                          <dl className="jwt-claims-summary">
                            {claims.map(([name, value]) => (
                              <div key={name}><dt>{name}</dt><dd>{formatClaim(name, value)}</dd></div>
                            ))}
                          </dl>
                        ) : <p className="jwt-empty">Payload 中没有常见注册 Claim。</p>) : (
                          <p className="jwt-empty">解析后显示注册 Claim 摘要。</p>
                        )}
                      </div>
                    )}
                  </JwtTextRegion>

                  <JwtTextRegion
                    label="Secret（可选）"
                    value={parseSecret}
                    copyLabel="复制解析 Secret"
                    feedbackLabel="Secret"
                    onCopy={copyParseText}
                    fieldClassName="jwt-secret-field"
                    hint={(
                      <span
                        className={`jwt-trust-line${trustInfo ? ` jwt-trust-${trustInfo.tone}` : ''}`}
                        role="status"
                        aria-live="polite"
                      >
                        {trustInfo ? (
                          <><strong>{trustInfo.label}</strong><span>{trustInfo.message}</span></>
                        ) : parsed ? (
                          <span>正在自动校验签名状态…</span>
                        ) : (
                          <span>解析后显示签名校验状态。</span>
                        )}
                      </span>
                    )}
                    afterCopy={<JwtDeleteButton label="删除解析 Secret" disabled={!parseSecret} onClick={deleteParseSecret} />}
                  >
                    <input
                      type="password"
                      aria-label="解析 Secret（可选）"
                      value={parseSecret}
                      onChange={(event) => {
                        setParseSecret(event.target.value)
                        setTrust(null)
                        setParseCopyStatus(null)
                      }}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="UTF-8文本密钥，留空则不做校验"
                    />
                  </JwtTextRegion>
                </div>
              </div>
              <div className="jwt-copy-feedback"><StatusMessage status={parseCopyStatus} /></div>
            </Panel>
          </div>
        </div>
      ) : (
        <div className="jwt-mode" data-testid="jwt-generate-mode">
          <div className="jwt-workspace-panel">
            <Panel title="生成工作区">
              <div className="jwt-workspace-grid jwt-generate-grid" data-layout="equal-columns">
                <div className="jwt-workspace-column jwt-generate-settings-column" data-column="generate-settings">
                  <JwtTextRegion
                    label="JWT Header"
                    value={generatedHeaderText}
                    copyLabel="复制生成 Header"
                    feedbackLabel="Header"
                    onCopy={copyGenerateText}
                    fieldClassName="jwt-result-field jwt-generate-header-field"
                    regionClassName="jwt-fill-region"
                  >
                    <pre className="jwt-json-output jwt-header-preview-output" aria-label="生成 JWT Header 预览">{generatedHeaderText}</pre>
                  </JwtTextRegion>

                  <JwtTextRegion
                    label="Claims / Payload JSON"
                    value={claimsInput}
                    copyLabel="复制 Claims / Payload"
                    feedbackLabel="Claims / Payload"
                    onCopy={copyGenerateText}
                    afterCopy={<JwtDeleteButton label="清空 Claims / Payload" disabled={!claimsInput} onClick={clearClaimsInput} />}
                    fieldClassName="jwt-fill-field jwt-generation-payload-field"
                    regionClassName="jwt-fill-region"
                    hint={generateStatus?.kind === 'error' ? (
                      <span className="jwt-field-error" role="alert">{generateStatus.message}</span>
                    ) : '顶层必须是 JSON 对象；自定义 Claim 会原样保留。'}
                  >
                    <textarea
                      aria-label="Claims / Payload JSON"
                      value={claimsInput}
                      onChange={(event) => {
                        const nextClaims = event.target.value
                        setClaimsInput(nextClaims)
                        setGeneratedToken('')
                        setGenerateStatus(null)
                        setGenerateCopyStatus(null)
                        if (!nextClaims.trim()) clearGenerateResult()
                      }}
                      rows={8}
                      spellCheck={false}
                      placeholder={'{\n  "sub": "1234567890"\n}'}
                      onKeyDown={(event) => runPrimaryActionShortcut(event, 'ctrl-enter', flushGenerate)}
                    />
                  </JwtTextRegion>

                  <JwtTextRegion
                    label="Secret（可选）"
                    value={generateSecretInput}
                    copyLabel="复制生成 Secret"
                    feedbackLabel="Secret"
                    onCopy={copyGenerateText}
                    fieldClassName="jwt-generate-secret"
                    hint={(
                      <span
                        className={`jwt-secret-warning-line${generateSecretInput ? '' : ' jwt-secret-warning-active'}`}
                        role="status"
                        aria-live="polite"
                      >
                        {generateSecretInput ? '\u00a0' : 'Secret 为空，将生成无签名 JWT，不得用于身份认证或授权。'}
                      </span>
                    )}
                    beforeCopy={(
                      <button className="jwt-secret-generate-button" type="button" title="生成新 Secret" onClick={createSecret}>
                        生成
                      </button>
                    )}
                    afterCopy={(
                      <JwtDeleteButton label="删除生成 Secret" disabled={!generateSecretInput} onClick={deleteGenerateSecret} />
                    )}
                  >
                    <input
                      type="text"
                      aria-label="生成 Secret（可选）"
                      value={generateSecretInput}
                      onChange={(event) => {
                        setGenerateSecretInput(event.target.value)
                        setGeneratedToken('')
                        setGenerateStatus(null)
                        setGenerateCopyStatus(null)
                      }}
                      autoComplete="new-password"
                      spellCheck={false}
                      placeholder="输入 UTF-8 Secret"
                    />
                  </JwtTextRegion>
                </div>
                <div className="jwt-workspace-column jwt-generate-token-column" data-column="generated-jwt">
                  <JwtTextRegion
                    label="生成的 JWT"
                    value={generatedToken}
                    copyLabel="复制生成的 JWT"
                    feedbackLabel="JWT"
                    onCopy={copyGenerateText}
                    fieldClassName="jwt-fill-field jwt-generate-token-field"
                    regionClassName="jwt-fill-region"
                  >
                    <output className="code-output jwt-token-output" aria-label="生成的 JWT">{generatedToken || '等待生成'}</output>
                  </JwtTextRegion>
                </div>
              </div>
              <div className="jwt-copy-feedback"><StatusMessage status={generateCopyStatus} /></div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}
