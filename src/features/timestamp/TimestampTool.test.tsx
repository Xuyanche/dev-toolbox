import { act, fireEvent, render, screen } from '@testing-library/react'
import { TimestampTool } from './TimestampTool'

const INITIAL_TIME = new Date('2026-08-05T05:30:45.123Z')

describe('TimestampTool current-time comparison', () => {
  it('starts with empty single-line conversion fields', () => {
    render(<TimestampTool />)

    const input = screen.getByLabelText('Unix 时间戳')
    const output = screen.getByLabelText('日期时间')
    expect(input).toHaveValue('')
    expect(output).toHaveValue('')
    expect(input.tagName).toBe('INPUT')
    expect(output.tagName).toBe('INPUT')
    expect(input).toHaveAttribute('type', 'text')
    expect(output).toHaveAttribute('type', 'text')
    expect(output).toHaveAttribute('readonly')
  })

  it('preserves complete long values through conversion, copy and swap', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<TimestampTool />)

    const timestamp = '1785857445123'
    const expectedIso = new Date(Number(timestamp)).toISOString()
    fireEvent.click(screen.getByRole('radio', { name: 'UTC' }))
    fireEvent.change(screen.getByLabelText('Unix 时间戳'), { target: { value: timestamp } })
    fireEvent.click(screen.getByRole('button', { name: '开始转换' }))

    expect(screen.getByLabelText('日期时间')).toHaveValue(expectedIso)
    fireEvent.click(screen.getByRole('button', { name: '复制结果' }))
    expect(writeText).toHaveBeenCalledWith(expectedIso)
    expect(await screen.findByText('已复制到剪贴板。')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: '交换' }))
    expect(screen.getByLabelText('ISO 8601 日期时间')).toHaveValue(expectedIso)
    expect(screen.getByLabelText('Unix 时间戳')).toHaveValue(timestamp)
  })

  it('renders and refreshes three coherent values from one clock snapshot and clears its timer', () => {
    vi.useFakeTimers()
    vi.setSystemTime(INITIAL_TIME)
    const { unmount } = render(<TimestampTool />)

    const group = document.querySelector('.current-time-group') as HTMLElement
    const rows = Array.from(group.querySelectorAll('.digest-row'))
    expect(rows.map((row) => row.firstElementChild?.textContent)).toEqual([
      'ISO 格式当前时间（本地）',
      'ISO 格式当前时间（GMT）',
      '时间戳',
    ])

    const localIso = screen.getByLabelText('ISO 格式当前时间（本地）').textContent ?? ''
    const gmtIso = screen.getByLabelText('ISO 格式当前时间（GMT）').textContent ?? ''
    const timestamp = screen.getByLabelText('当前 Unix 毫秒时间戳').textContent ?? ''
    expect(localIso).toMatch(/\.123(?:Z|[+-]\d{2}:\d{2})$/)
    expect(gmtIso).toBe(INITIAL_TIME.toISOString())
    expect(timestamp).toBe(String(INITIAL_TIME.getTime()))
    expect(Date.parse(localIso)).toBe(Number(timestamp))
    expect(Date.parse(gmtIso)).toBe(Number(timestamp))

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByLabelText('当前 Unix 毫秒时间戳')).toHaveTextContent(String(INITIAL_TIME.getTime() + 1000))
    expect(screen.getByLabelText('ISO 格式当前时间（GMT）')).toHaveTextContent('2026-08-05T05:30:46.123Z')

    unmount()
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
  })

  it('copies each exact displayed value and reports success, rejection and unavailable clipboard states in one stable region', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<TimestampTool />)

    const feedback = document.querySelector('.current-time-copy-feedback') as HTMLElement
    const buttons = [
      screen.getByRole('button', { name: '复制 ISO 格式当前时间（本地）' }),
      screen.getByRole('button', { name: '复制 ISO 格式当前时间（GMT）' }),
      screen.getByRole('button', { name: '复制当前 Unix 毫秒时间戳' }),
    ]
    expect(buttons.every((button) => button.textContent === '' && button.querySelector('svg.digest-copy-icon'))).toBe(true)
    expect(buttons.map((button) => button.getAttribute('title'))).toEqual([
      '复制 ISO 格式当前时间（本地）',
      '复制 ISO 格式当前时间（GMT）',
      '复制当前 Unix 毫秒时间戳',
    ])

    const localValue = screen.getByLabelText('ISO 格式当前时间（本地）').textContent ?? ''
    fireEvent.click(buttons[0])
    expect(writeText).toHaveBeenCalledWith(localValue)
    expect(await screen.findByText('ISO 格式当前时间（本地）已复制到剪贴板。')).toBeVisible()
    expect(document.querySelector('.current-time-copy-feedback')).toBe(feedback)

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    fireEvent.click(buttons[1])
    expect(await screen.findByText('无法复制ISO 格式当前时间（GMT），请手动复制。')).toBeVisible()
    expect(document.querySelector('.current-time-copy-feedback')).toBe(feedback)

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    fireEvent.click(buttons[2])
    expect(await screen.findByText('无法复制当前 Unix 毫秒时间戳，请手动复制。')).toBeVisible()
    expect(document.querySelector('.current-time-copy-feedback')).toBe(feedback)
  })

  it('keeps all three value fields and attached icon actions in a compact narrow-screen group', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
    render(<TimestampTool />)

    const conversionGrid = document.querySelector('.timestamp-conversion-grid') as HTMLElement
    expect(conversionGrid).not.toBeNull()
    expect(conversionGrid.querySelectorAll('.panel')).toHaveLength(2)
    expect(screen.getByLabelText('Unix 时间戳').tagName).toBe('INPUT')
    expect(screen.getByLabelText('日期时间').tagName).toBe('INPUT')

    const group = document.querySelector('.current-time-group') as HTMLElement
    expect(group.querySelectorAll('.digest-row')).toHaveLength(3)
    for (const label of ['ISO 格式当前时间（本地）', 'ISO 格式当前时间（GMT）', '当前 Unix 毫秒时间戳']) {
      const output = screen.getByLabelText(label)
      expect(output).toHaveClass('digest-output')
      expect(output.closest('.digest-field')).not.toBeNull()
      expect(output.nextElementSibling).toHaveClass('digest-copy-button')
    }
    expect(group.querySelectorAll('.digest-copy-button')).toHaveLength(3)
  })
})
