import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashTool } from './HashTool'
import { SHA_ALGORITHMS } from './hash'

function setInput(value: string) {
  fireEvent.change(screen.getByLabelText('待摘要文本'), { target: { value } })
}

describe('HashTool SHA mode', () => {
  it('renders and copies four simultaneous SHA digest variants, including empty input', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<HashTool algorithm="SHA" />)

    expect(screen.getByText(/SHA-1 已不适合需要抗碰撞性/)).toBeVisible()
    expect(screen.getByText(/SHA-256、SHA-384 和 SHA-512 也不应直接用于密码存储/)).toBeVisible()
    const grid = document.querySelector('.sha-result-grid') as HTMLElement
    expect(grid).toHaveAttribute('data-layout', 'single-column')
    expect(Array.from(grid.querySelectorAll(':scope > .panel h3')).map((heading) => heading.textContent))
      .toEqual(['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'])
    const copyButtons = screen.getAllByRole('button', { name: /复制 SHA-/ })
    expect(copyButtons).toHaveLength(8)
    expect(copyButtons.every((button) => button.hasAttribute('disabled'))).toBe(true)
    for (const button of copyButtons) {
      expect(button).toHaveTextContent('')
      expect(button.querySelector('svg.sha-copy-icon')).not.toBeNull()
      expect(button).toHaveAttribute('title')
    }

    await user.click(screen.getByRole('button', { name: '计算 SHA' }))
    for (const algorithm of SHA_ALGORITHMS) {
      const lower = screen.getByLabelText(`${algorithm.label} 小写摘要`)
      const upper = screen.getByLabelText(`${algorithm.label} 大写摘要`)
      expect(lower.textContent).toHaveLength(algorithm.hexLength)
      expect(upper.textContent).toHaveLength(algorithm.hexLength)
      expect(upper.textContent).toBe(lower.textContent?.toUpperCase())
      const lowerRow = lower.closest('.sha-digest-row') as HTMLElement
      expect(lowerRow.firstElementChild).toHaveClass('sha-variant-label')
      expect(lowerRow.firstElementChild).toHaveTextContent('小写摘要')
      expect(lower.parentElement).toHaveClass('sha-digest-field')
      expect(lower.nextElementSibling).toHaveClass('sha-copy-button')
    }

    const sha512Upper = screen.getByLabelText('SHA-512 大写摘要').textContent ?? ''
    const sha512Copy = screen.getByRole('button', { name: '复制 SHA-512 大写' })
    const sha512Field = sha512Copy.parentElement
    await user.click(sha512Copy)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(sha512Upper)
    expect(await screen.findByText('SHA-512 大写摘要已复制到剪贴板。')).toBeVisible()
    expect(sha512Copy.parentElement).toBe(sha512Field)

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await user.click(screen.getByRole('button', { name: '复制 SHA-256 小写' }))
    expect(await screen.findByText('无法复制 SHA-256 小写摘要，请手动复制摘要。')).toBeVisible()
    expect(sha512Copy.parentElement).toBe(sha512Field)
    expect(screen.getByLabelText('SHA-256 小写摘要')).toHaveTextContent('e3b0c442')
  })

  it('atomically replaces a batch and clear-all removes input, results, status and copy availability', async () => {
    const user = userEvent.setup()
    render(<HashTool algorithm="SHA" />)
    setInput('first')
    await user.click(screen.getByRole('button', { name: '计算 SHA' }))
    const first = screen.getByLabelText('SHA-256 小写摘要').textContent
    expect(await screen.findByText('SHA 摘要计算完成。')).toBeVisible()

    setInput('second')
    await user.click(screen.getByRole('button', { name: '计算 SHA' }))
    expect(screen.getByLabelText('SHA-256 小写摘要').textContent).not.toBe(first)
    expect(screen.queryAllByText('等待计算')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: '清空' }))
    expect(screen.getByLabelText('待摘要文本')).toHaveValue('')
    expect(screen.getAllByText('等待计算')).toHaveLength(8)
    expect(screen.queryByText('SHA 摘要计算完成。')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /复制 SHA-/ }).every((button) => button.hasAttribute('disabled'))).toBe(true)
  })

  it('clears the previous batch when one digest fails instead of showing partial results', async () => {
    const user = userEvent.setup()
    render(<HashTool algorithm="SHA" />)
    setInput('successful')
    await user.click(screen.getByRole('button', { name: '计算 SHA' }))
    expect(screen.queryByText('等待计算')).not.toBeInTheDocument()

    const originalDigest = crypto.subtle.digest.bind(crypto.subtle)
    vi.spyOn(crypto.subtle, 'digest').mockImplementation((algorithm, data) => {
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name
      return name === 'SHA-384' ? Promise.reject(new Error('failed')) : originalDigest(algorithm, data)
    })
    setInput('failure')
    await user.click(screen.getByRole('button', { name: '计算 SHA' }))
    expect(await screen.findByText(/SHA 摘要批量计算失败/)).toBeVisible()
    expect(screen.getAllByText('等待计算')).toHaveLength(8)
  })

  it('keeps all SHA actions available without page overflow markers at narrow widths and makes no network calls', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
    render(<HashTool algorithm="SHA" />)
    setInput('窄屏 Unicode')
    await user.click(screen.getByRole('button', { name: '计算 SHA' }))

    expect(document.querySelector('.sha-result-grid')).toHaveAttribute('data-layout', 'single-column')
    const copyButtons = screen.getAllByRole('button', { name: /复制 SHA-/ })
    expect(copyButtons).toHaveLength(8)
    expect(copyButtons.every((button) => button.textContent === '' && button.querySelector('svg'))).toBe(true)
    expect(screen.getByLabelText('SHA-512 小写摘要')).toHaveClass('sha-digest-output')
    expect(screen.getByLabelText('SHA-512 小写摘要').closest('.sha-digest-field')).not.toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('HashTool MD5 compatibility', () => {
  it('retains the original two-result layout, warning, calculation and clear semantics', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<HashTool algorithm="MD5" />)

    expect(screen.getByText('MD5 已不适合密码存储、数字签名或要求抗碰撞性的安全场景。')).toBeVisible()
    expect(document.querySelector('.sha-result-grid')).toBeNull()
    expect(screen.getByRole('heading', { name: '小写摘要' })).toBeVisible()
    expect(screen.getByRole('heading', { name: '大写摘要' })).toBeVisible()

    setInput('abc')
    await user.click(screen.getByRole('button', { name: '计算 MD5' }))
    expect(screen.getByText('900150983cd24fb0d6963f7d28e17f72')).toBeVisible()
    expect(screen.getByText('900150983CD24FB0D6963F7D28E17F72')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '清空' }))
    expect(screen.getByLabelText('待摘要文本')).toHaveValue('')
    expect(screen.getAllByText('等待计算')).toHaveLength(2)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
