import { useState } from 'react'
import { Panel, Segmented, StatusMessage, TextAreaField, ToolHeader, type StatusState } from '../../shell/ui'
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

export function JwtTool() {
  const [mode, setMode] = useState<JwtMode>('parse')

  const [parseInput, setParseInput] = useState('')
  const [parseSecret, setParseSecret] = useState('')
  const [parsed, setParsed] = useState<ParsedJwt | null>(null)
  const [trust, setTrust] = useState<JwtTrustStatus | null>(null)
  const [parseStatus, setParseStatus] = useState<StatusState>(null)

  const [claimsInput, setClaimsInput] = useState('{\n  "sub": "1234567890"\n}')
  const [generateSecretInput, setGenerateSecretInput] = useState('')
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>('HS256')
  const [secretCopyStatus, setSecretCopyStatus] = useState<StatusState>(null)
  const [generatedToken, setGeneratedToken] = useState('')
  const [generateStatus, setGenerateStatus] = useState<StatusState>(null)
  const [jwtCopyStatus, setJwtCopyStatus] = useState<StatusState>(null)

  async function runParse() {
    setParsed(null)
    setTrust(null)
    setParseStatus(null)
    const result = parseJwt(parseInput)
    if (!result.ok) {
      setParseStatus({ kind: 'error', message: result.message })
      return
    }
    const nextTrust = await verifyJwt(result.value, parseSecret)
    setParsed(result.value)
    setTrust(nextTrust)
    setParseStatus({
      kind: nextTrust === 'valid' ? 'success' : 'info',
      message: nextTrust === 'valid' ? '解析及签名校验完成。' : '解析完成，请根据签名状态判断内容可信度。',
    })
  }

  function clearParse() {
    setParseInput('')
    setParseSecret('')
    setParsed(null)
    setTrust(null)
    setParseStatus(null)
  }

  async function runGenerate() {
    setGeneratedToken('')
    setGenerateStatus(null)
    setJwtCopyStatus(null)
    const payload = parseJsonObject(claimsInput, 'Claims/Payload')
    if (!payload.ok) {
      setGenerateStatus({ kind: 'error', message: payload.message })
      return
    }
    const result = await generateJwt(payload.value, generateSecretInput, algorithm)
    if (!result.ok) {
      setGenerateStatus({ kind: 'error', message: result.message })
      return
    }
    setGeneratedToken(result.value)
    setGenerateStatus({
      kind: result.warning ? 'info' : 'success',
      message: result.warning ?? `${algorithm} 签名 JWT 生成完成。`,
    })
  }

  function createSecret() {
    const result = generateSecret()
    if (!result.ok) {
      setGenerateStatus({ kind: 'error', message: result.message })
      return
    }
    setGenerateSecretInput(result.value)
    setSecretCopyStatus(null)
    setGenerateStatus({ kind: 'success', message: '已生成新的 256 位随机 Secret。' })
  }

  async function copySecret() {
    if (!generateSecretInput) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(generateSecretInput)
      setSecretCopyStatus({ kind: 'success', message: 'Secret 已复制到剪贴板。' })
    } catch {
      setSecretCopyStatus({ kind: 'error', message: '无法访问剪贴板，请手动复制 Secret。' })
    }
  }

  function clearSecret() {
    setGenerateSecretInput('')
    setSecretCopyStatus(null)
  }

  async function copyJwt() {
    if (!generatedToken) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(generatedToken)
      setJwtCopyStatus({ kind: 'success', message: 'JWT 已复制到剪贴板。' })
    } catch {
      setJwtCopyStatus({ kind: 'error', message: '无法访问剪贴板，请手动复制 JWT。' })
    }
  }

  function clearGenerate() {
    setClaimsInput('')
    setAlgorithm('HS256')
    setGeneratedToken('')
    setGenerateStatus(null)
    setJwtCopyStatus(null)
  }

  const claims = parsed ? Object.entries(getRegisteredClaims(parsed.payload)) : []
  const trustInfo = trust ? trustPresentation[trust] : null
  const generatedHeader = deriveJwtHeader(generateSecretInput, algorithm)

  return (
    <div className="tool-page jwt-tool">
      <ToolHeader
        eyebrow="JSON WEB TOKEN"
        title="JWT 生成与解析"
        description="在浏览器本地解析 Claims、校验 HMAC 签名或生成调试令牌；Secret 始终按 UTF-8 文本处理。"
      />
      <div className="notice notice-info"><strong>本地处理</strong><span>JWT、Claims 与 Secret 不会上传、记录或写入浏览器持久存储。</span></div>
      <div className="settings-row jwt-mode-row">
        <Segmented
          label="操作"
          value={mode}
          onChange={setMode}
          options={[{ value: 'parse', label: '解析' }, { value: 'generate', label: '生成' }]}
        />
      </div>

      {mode === 'parse' ? (
        <div className="jwt-mode" data-testid="jwt-parse-mode">
          <Panel title="解析设置">
            <TextAreaField
              label="JWT"
              value={parseInput}
              onChange={setParseInput}
              rows={6}
              placeholder="粘贴 header.payload.signature"
              hint="仅接受严格的三段式、无填充 Base64URL JWT。"
            />
            <label className="field jwt-secret-field">
              <span className="field-heading"><span className="field-label">Secret（可选）</span></span>
              <input
                type="password"
                aria-label="解析 Secret（可选）"
                value={parseSecret}
                onChange={(event) => setParseSecret(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="留空则只解码、不校验"
              />
              <span className="field-hint">按 UTF-8 文本使用，不会自动识别 HEX 或 Base64。</span>
            </label>
            <div className="action-row">
              <button className="button button-primary" type="button" onClick={runParse}>解析 JWT</button>
              <button className="button button-ghost" type="button" onClick={clearParse}>清空解析</button>
            </div>
            <StatusMessage status={parseStatus} />
          </Panel>

          {parsed && trustInfo ? (
            <div className="result-stack jwt-results">
              <div className={`jwt-trust jwt-trust-${trustInfo.tone}`} role="status">
                <strong>{trustInfo.label}</strong><span>{trustInfo.message}</span>
              </div>
              <div className="two-column">
                <Panel title="Header">
                  <pre className="jwt-json-output" aria-label="JWT Header">{formatJson(parsed.header)}</pre>
                </Panel>
                <Panel title="Claims / Payload">
                  <pre className="jwt-json-output" aria-label="JWT Claims/Payload">{formatJson(parsed.payload)}</pre>
                </Panel>
              </div>
              <Panel title="注册 Claim 摘要">
                {claims.length ? (
                  <dl className="jwt-claims-summary">
                    {claims.map(([name, value]) => (
                      <div key={name}><dt>{name}</dt><dd>{formatClaim(name, value)}</dd></div>
                    ))}
                  </dl>
                ) : <p className="jwt-empty">Payload 中没有常见注册 Claim。</p>}
              </Panel>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="jwt-mode" data-testid="jwt-generate-mode">
          <Panel title="生成设置">
            <div className="jwt-generate-grid" data-layout="equal-columns">
              <div className="jwt-claims-column">
                <TextAreaField
                  label="Claims / Payload JSON"
                  value={claimsInput}
                  onChange={setClaimsInput}
                  rows={10}
                  placeholder={'{\n  "sub": "1234567890"\n}'}
                  hint="顶层必须是 JSON 对象；自定义 Claim 会原样保留。"
                />
              </div>
              <div className="jwt-signing-settings">
                <div className="field jwt-header-preview">
                  <span className="field-heading">
                    <span className="field-label">JWT Header</span>
                    <span className="field-heading-aside">只读预览</span>
                  </span>
                  <pre className="jwt-json-output jwt-header-preview-output" aria-label="生成 JWT Header 预览">
                    {formatJson(generatedHeader)}
                  </pre>
                  <span className="field-hint">Header 会随 Secret 状态和下方算法选择实时更新。</span>
                </div>
                <label className="select-field">
                  <span>签名算法</span>
                  <select aria-label="签名算法" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as HmacAlgorithm)}>
                    <option value="HS256">HS256</option>
                    <option value="HS384">HS384</option>
                    <option value="HS512">HS512</option>
                  </select>
                </label>
                <div className="field jwt-generate-secret">
                  <span className="field-heading"><span className="field-label">Secret（可选）</span></span>
                  <input
                    type="text"
                    aria-label="生成 Secret（可选）"
                    value={generateSecretInput}
                    onChange={(event) => {
                      setGenerateSecretInput(event.target.value)
                      setSecretCopyStatus(null)
                    }}
                    autoComplete="new-password"
                    spellCheck={false}
                    placeholder="输入 UTF-8 Secret"
                  />
                  <span className="field-hint">留空时只能生成 alg: none 调试令牌。</span>
                  <div className="jwt-secret-actions">
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={clearSecret}
                      disabled={!generateSecretInput}
                    >
                      清除 Secret
                    </button>
                    <button className="button button-secondary" type="button" onClick={copySecret} disabled={!generateSecretInput}>复制 Secret</button>
                    <button className="button button-secondary" type="button" onClick={createSecret}>生成新 Secret</button>
                  </div>
                  <StatusMessage status={secretCopyStatus} />
                </div>
              </div>
            </div>

            {!generateSecretInput ? (
              <div className="jwt-unsigned-warning notice notice-warning">
                <strong>无签名警告</strong>
                <span>当前将生成 alg: none 调试令牌，不得用于身份认证或授权。</span>
              </div>
            ) : null}

            <div className="action-row">
              <button className="button button-primary" type="button" onClick={runGenerate}>生成 JWT</button>
              <button className="button button-ghost" type="button" onClick={clearGenerate}>清空生成</button>
            </div>
            <StatusMessage status={generateStatus} />
          </Panel>

          {generatedToken ? (
            <div className="jwt-result-panel">
              <Panel
                title="生成结果"
                aside={(
                  <div className="jwt-result-copy-action">
                    <button className="button button-secondary" type="button" onClick={copyJwt}>复制 JWT</button>
                  </div>
                )}
              >
                <output className="code-output jwt-token-output" aria-label="生成的 JWT">{generatedToken}</output>
                <div className="jwt-result-copy-feedback"><StatusMessage status={jwtCopyStatus} /></div>
                {!generateSecretInput ? <div className="jwt-result-warning">无签名 · 不得用于身份认证或授权</div> : null}
              </Panel>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
