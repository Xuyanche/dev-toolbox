import { useEffect, useRef, useState } from 'react'

interface Props {
  initialName: string
  initialEol: 'LF' | 'CRLF'
  draft: boolean
  onClose: () => void
  onDownload: (filename: string, eol: 'LF' | 'CRLF') => void
}
export function DownloadDialog({ initialName, initialEol, draft, onClose, onDownload }: Props) {
  const dialog = useRef<HTMLDialogElement>(null), input = useRef<HTMLInputElement>(null)
  const [filename, setFilename] = useState(initialName), [eol, setEol] = useState(initialEol)
  useEffect(() => {
    const element = dialog.current, previous = document.activeElement as HTMLElement | null
    element?.showModal(); input.current?.select()
    return () => { element?.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  return <dialog ref={dialog} className='text-download-dialog' aria-labelledby='text-download-title' onCancel={event => { event.preventDefault(); onClose() }}>
    <form onSubmit={event => { event.preventDefault(); onDownload(filename.trim(), eol) }}>
      <h3 id='text-download-title'>{draft ? '下载融合草稿' : '下载融合结果'}</h3>
      {draft ? <p>当前结果尚未完成确认或校验，将保存完整草稿。</p> : <p>保存完整 YAML 文件，包括当前折叠的内容。</p>}
      <label>文件名<input ref={input} aria-label='结果文件名' value={filename} onChange={event => setFilename(event.target.value)} required maxLength={200} /></label>
      <label>换行符<select aria-label='导出换行风格' value={eol} onChange={event => setEol(event.target.value as 'LF' | 'CRLF')}><option value='LF'>LF（Unix / Linux）</option><option value='CRLF'>CRLF（Windows）</option></select></label>
      <div className='text-download-actions'><button type='button' onClick={onClose}>取消</button><button type='submit' className='button button-primary' disabled={!filename.trim()}>下载文件</button></div>
    </form>
  </dialog>
}
