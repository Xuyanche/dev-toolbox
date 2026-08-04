import { useState } from 'react'
import { base64ToBytes, bytesToBase64, bytesToHex, bytesToUtf8, hexToBytes, utf8Bytes } from '../../shared/bytes'
import { CopyButton, Panel, Segmented, StatusMessage, TextAreaField, ToolHeader, type StatusState } from '../../shell/ui'
import { getModeCapability, SYMMETRIC_CAPABILITIES, type CipherMode, type PaddingMode, type SymmetricAlgorithm } from './capabilities'
import { executeSymmetric } from './symmetric'

type BinaryEncoding = 'hex' | 'base64'
type Operation = 'encrypt' | 'decrypt'

const encodingOptions = [{ value: 'hex' as const, label: 'HEX' }, { value: 'base64' as const, label: 'Base64' }]

function decodeBinary(value: string, encoding: BinaryEncoding) {
  return encoding === 'hex' ? hexToBytes(value) : base64ToBytes(value)
}

function encodeBinary(value: Uint8Array, encoding: BinaryEncoding) {
  return encoding === 'hex' ? bytesToHex(value) : bytesToBase64(value)
}

export function SymmetricCryptoTool({ algorithm }: { algorithm: SymmetricAlgorithm }) {
  const capability = SYMMETRIC_CAPABILITIES[algorithm]
  const [operation, setOperation] = useState<Operation>('encrypt')
  const [mode, setMode] = useState<CipherMode>(capability.defaultMode)
  const initialMode = getModeCapability(algorithm, capability.defaultMode)!
  const [padding, setPadding] = useState<PaddingMode>(initialMode.paddings[0])
  const [keyEncoding, setKeyEncoding] = useState<BinaryEncoding>('hex')
  const [key, setKey] = useState('')
  const [parameterEncoding, setParameterEncoding] = useState<BinaryEncoding>('hex')
  const [parameter, setParameter] = useState('')
  const [cipherEncoding, setCipherEncoding] = useState<BinaryEncoding>('base64')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState<StatusState>(null)
  const modeCapability = getModeCapability(algorithm, mode)!

  function changeMode(nextMode: CipherMode) {
    const next = getModeCapability(algorithm, nextMode)!
    setMode(nextMode)
    if (!next.paddings.includes(padding)) setPadding(next.paddings[0])
    setParameter('')
    setStatus({ kind: 'info', message: `已切换为 ${algorithm}-${nextMode}，请检查当前参数。` })
  }

  function changeOperation(next: Operation) {
    setOperation(next)
    setInput('')
    setOutput('')
    setStatus(null)
  }

  async function run() {
    const decodedKey = decodeBinary(key, keyEncoding)
    if (!decodedKey.ok) return setStatus({ kind: 'error', message: `密钥：${decodedKey.message}` })
    const decodedInput = operation === 'encrypt' ? { ok: true as const, value: utf8Bytes(input) } : decodeBinary(input, cipherEncoding)
    if (!decodedInput.ok) return setStatus({ kind: 'error', message: `密文：${decodedInput.message}` })
    const decodedParameter = modeCapability.parameter ? decodeBinary(parameter, parameterEncoding) : { ok: true as const, value: undefined }
    if (!decodedParameter.ok) return setStatus({ kind: 'error', message: `${modeCapability.parameter}：${decodedParameter.message}` })
    const result = await executeSymmetric({ operation, algorithm, mode, padding, input: decodedInput.value, key: decodedKey.value, parameter: decodedParameter.value })
    if (!result.ok) return setStatus({ kind: 'error', message: result.message })
    if (operation === 'encrypt') {
      setOutput(encodeBinary(result.value, cipherEncoding))
    } else {
      const text = bytesToUtf8(result.value)
      if (!text.ok) return setStatus({ kind: 'error', message: '解密结果不是有效 UTF-8 文本，请检查全部参数。' })
      setOutput(text.value)
    }
    setStatus({ kind: 'success', message: `${algorithm} ${operation === 'encrypt' ? '加密' : '解密'}完成，结果仅保留在当前页面。` })
  }

  const parameterLabel = modeCapability.parameter === 'IV' ? 'IV / 偏移量' : modeCapability.parameter === 'counter' ? '计数器 / 偏移量' : 'Nonce / 偏移量'
  return (
    <div className='tool-page'>
      <ToolHeader eyebrow={`SYMMETRIC / ${algorithm}`} title={`${algorithm} 加解密`} description='明确设置密钥编码、模式、填充和模式参数；所有处理均在浏览器本地完成。' />
      {algorithm === 'DES' ? <div className='notice notice-warning' role='note'><strong>旧算法警告</strong><span>DES 已不适合保护新数据，仅应用于兼容遗留系统。</span></div> : null}
      <Panel title='参数设置'>
        <div className='settings-row'>
          <Segmented label='操作' value={operation} options={[{ value: 'encrypt', label: '加密' }, { value: 'decrypt', label: '解密' }]} onChange={changeOperation} />
          <label className='select-field'><span>加密模式</span><select aria-label='加密模式' value={mode} onChange={(event) => changeMode(event.target.value as CipherMode)}>{capability.modes.map((entry) => <option key={entry.mode}>{entry.mode}</option>)}</select></label>
          <label className='select-field'><span>填充模式</span><select aria-label='填充模式' value={padding} onChange={(event) => setPadding(event.target.value as PaddingMode)} disabled={modeCapability.paddings.length === 1}>{modeCapability.paddings.map((entry) => <option value={entry} key={entry}>{entry === 'pkcs7' ? 'PKCS#7' : '无填充'}</option>)}</select></label>
        </div>
        <div className='crypto-fields'>
          <div><Segmented label='密钥格式' value={keyEncoding} options={encodingOptions} onChange={setKeyEncoding} /><label className='field'><span className='field-label'>密钥</span><input value={key} onChange={(event) => setKey(event.target.value)} placeholder={`允许 ${capability.keyBytes.join(' / ')} 字节`} /></label></div>
          {modeCapability.parameter ? <div><Segmented label={`${parameterLabel}格式`} value={parameterEncoding} options={encodingOptions} onChange={setParameterEncoding} /><label className='field'><span className='field-label'>{parameterLabel}</span><input value={parameter} onChange={(event) => setParameter(event.target.value)} placeholder={`${modeCapability.parameterBytes} 字节`} /></label></div> : <div className='notice notice-info'><strong>无需偏移量</strong><span>{mode} 模式不使用 IV。</span></div>}
          <Segmented label='密文格式' value={cipherEncoding} options={encodingOptions} onChange={setCipherEncoding} />
        </div>
      </Panel>
      <div className='two-column crypto-io'>
        <Panel title={operation === 'encrypt' ? '明文输入' : '密文输入'}><TextAreaField label={operation === 'encrypt' ? '明文（UTF-8）' : `密文（${cipherEncoding === 'hex' ? 'HEX' : 'Base64'}）`} value={input} onChange={setInput} /></Panel>
        <Panel title={operation === 'encrypt' ? '密文结果' : '明文结果'} aside={<CopyButton value={output} />}><TextAreaField label='处理结果' value={output} readOnly /></Panel>
      </div>
      <div className='action-row'><button className='button button-primary' type='button' onClick={run}>开始{operation === 'encrypt' ? '加密' : '解密'}</button></div>
      <StatusMessage status={status} />
    </div>
  )
}
