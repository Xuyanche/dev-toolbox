import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EncodingTool } from './EncodingTool'

describe('EncodingTool Unicode mode', () => {
  it('uses the Base64 workspace flow for encode, copy, swap, decode and clear', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const { container } = render(<EncodingTool kind="unicode" />)

    expect(screen.getByRole('heading', { name: 'Unicode 编解码' })).toBeVisible()
    expect(screen.getByText(/JavaScript\/JSON 兼容的 \\uXXXX/)).toBeVisible()
    expect(screen.getByRole('group', { name: '操作' })).toBeVisible()
    expect(container.querySelector('.encoding-tool > .encoding-workspace')).not.toBeNull()
    expect(screen.queryByRole('group', { name: 'URL 模式' })).not.toBeInTheDocument()
    expect(container.querySelector('.two-column')).not.toBeNull()
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['输入', '输出'])

    const input = screen.getByLabelText('待处理文本')
    const output = screen.getByLabelText('转换结果')
    await user.type(input, 'A中👋')
    await user.click(screen.getByRole('button', { name: '开始编码' }))
    expect(output).toHaveValue('\\u0041\\u4E2D\\uD83D\\uDC4B')

    await user.click(screen.getByRole('button', { name: '复制结果' }))
    expect(writeText).toHaveBeenCalledWith('\\u0041\\u4E2D\\uD83D\\uDC4B')
    expect(await screen.findByText('已复制到剪贴板。')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '交换' }))
    expect(input).toHaveValue('\\u0041\\u4E2D\\uD83D\\uDC4B')
    expect(output).toHaveValue('A中👋')
    expect(screen.getByRole('radio', { name: '解码' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: '开始解码' }))
    expect(output).toHaveValue('A中👋')

    await user.click(screen.getByRole('button', { name: '清空' }))
    expect(input).toHaveValue('')
    expect(output).toHaveValue('')
    expect(screen.queryByText('解码完成。')).not.toBeInTheDocument()
  })

  it('preserves malformed input while clearing stale output and reporting an error', async () => {
    const user = userEvent.setup()
    render(<EncodingTool kind="unicode" />)

    const input = screen.getByLabelText('待处理文本')
    const output = screen.getByLabelText('转换结果')
    await user.type(input, 'A')
    await user.click(screen.getByRole('button', { name: '开始编码' }))
    expect(output).toHaveValue('\\u0041')

    await user.click(screen.getByRole('radio', { name: '解码' }))
    await user.clear(input)
    await user.type(input, '\\uD83D')
    await user.click(screen.getByRole('button', { name: '开始解码' }))

    expect(input).toHaveValue('\\uD83D')
    expect(output).toHaveValue('')
    expect(screen.getByText('Unicode 代理项必须按高代理项、低代理项成对出现。')).toBeVisible()
  })

  it('keeps Base64 and Unicode component state independent', async () => {
    const user = userEvent.setup()
    render(
      <>
        <section aria-label="Unicode"><EncodingTool kind="unicode" /></section>
        <section aria-label="Base64"><EncodingTool kind="base64" /></section>
      </>,
    )

    const unicode = screen.getByRole('region', { name: 'Unicode' })
    const base64 = screen.getByRole('region', { name: 'Base64' })
    await user.type(within(unicode).getByLabelText('待处理文本'), '中')
    await user.click(within(unicode).getByRole('radio', { name: '解码' }))
    await user.type(within(base64).getByLabelText('待处理文本'), 'base64 input')

    expect(within(unicode).getByLabelText('待处理文本')).toHaveValue('中')
    expect(within(unicode).getByRole('radio', { name: '解码' })).toBeChecked()
    expect(within(base64).getByLabelText('待处理文本')).toHaveValue('base64 input')
    expect(within(base64).getByRole('radio', { name: '编码' })).toBeChecked()
  })
})
