import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonTool } from './JsonTool'

function setValue(value: string) {
  fireEvent.change(screen.getByLabelText('JSON 输入'), { target: { value } })
}

describe('JsonTool', () => {
  it('uses one workspace for five operations and formats or minifies JSON in place', async () => {
    const user = userEvent.setup()
    render(<JsonTool />)

    expect(screen.getByText(/在浏览器本地格式化或压缩 JSON/)).toBeVisible()
    expect(screen.queryByText('本地处理')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('JSON 字符串输出')).not.toBeInTheDocument()
    const workspace = screen.getByTestId('json-workspace')
    expect(workspace).toHaveAttribute('data-layout', 'tree-right')
    expect(screen.getAllByText('JSON 输入')).toHaveLength(2)
    expect(Array.from(workspace.querySelectorAll('.json-action-row .button')).map((button) => button.textContent))
      .toEqual(['格式化 JSON', '压缩 JSON', '转义', '去除转义', '清空'])
    expect(screen.queryByRole('button', { name: '复制格式化结果' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '复制压缩结果' })).not.toBeInTheDocument()

    setValue('{"user":{"name":"Ada"},"count":2}')
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))
    expect(screen.getByLabelText('JSON 输入')).toHaveValue('{\n  "user": {\n    "name": "Ada"\n  },\n  "count": 2\n}')
    expect(screen.getByRole('list', { name: 'JSON 树形结构' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: '压缩 JSON' }))
    expect(screen.getByLabelText('JSON 输入')).toHaveValue('{"user":{"name":"Ada"},"count":2}')
    expect(screen.getByRole('list', { name: 'JSON 树形结构' })).toBeVisible()
    expect(await screen.findByText('JSON 已在输入框内压缩。')).toBeVisible()

    setValue('{"ok":true,}')
    await user.click(screen.getByRole('button', { name: '压缩 JSON' }))
    expect(screen.getByLabelText('JSON 输入')).toHaveValue('{"ok":true,}')
    expect(await screen.findByText(/JSON 解析失败/)).toBeVisible()
    expect(screen.queryByRole('list', { name: 'JSON 树形结构' })).not.toBeInTheDocument()
  })

  it('preserves compact arbitrary-level and global tree folding', async () => {
    const user = userEvent.setup()
    render(<JsonTool />)
    setValue('{"user":{"name":"Ada","roles":["admin",true]},"features":[1,2,3,4,5,6]}')
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))
    const input = screen.getByLabelText('JSON 输入')
    const formatted = (input as HTMLTextAreaElement).value
    const tree = screen.getByRole('list', { name: 'JSON 树形结构' })

    await user.click(within(tree).getByRole('button', { name: '展开 user' }))
    await user.click(within(tree).getByRole('button', { name: '展开 roles' }))
    expect(within(tree).getByText('"admin"')).toBeVisible()
    await user.click(within(tree).getByRole('button', { name: '折叠 roles' }))
    expect(within(tree).getByText('Array[2]')).toHaveClass('json-code-summary')
    await user.click(within(tree).getByRole('button', { name: '折叠 user' }))
    expect(within(tree).getByText('Object{2}')).toHaveClass('json-code-summary')

    await user.click(screen.getByRole('button', { name: '全部折叠' }))
    expect(screen.getByRole('button', { name: '全部展开' })).toBeVisible()
    expect(within(tree).queryByText('"user"')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '全部展开' }))
    expect(within(tree).getByText('"roles"')).toBeVisible()
    expect(within(tree).getByText('"admin"')).toBeVisible()
    expect(input).toHaveValue(formatted)
  })

  it('transforms strings in place, invalidates stale trees and preserves malformed input', async () => {
    const user = userEvent.setup()
    const formattedJson = '{\n  "value": "quoted"\n}'
    render(<JsonTool />)
    setValue('{"value":"quoted"}')
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))
    expect(screen.getByRole('list', { name: 'JSON 树形结构' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: '转义' }))
    expect(screen.getByLabelText('JSON 输入')).toHaveValue(JSON.stringify(formattedJson).slice(1, -1))
    expect(screen.queryByRole('list', { name: 'JSON 树形结构' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '去除转义' }))
    expect(screen.getByLabelText('JSON 输入')).toHaveValue(formattedJson)

    const arbitraryText = 'line 1\n"quoted"'
    setValue(arbitraryText)
    await user.click(screen.getByRole('button', { name: '转义' }))
    expect(screen.getByLabelText('JSON 输入')).toHaveValue(JSON.stringify(arbitraryText).slice(1, -1))
    await user.click(screen.getByRole('button', { name: '去除转义' }))
    expect(screen.getByLabelText('JSON 输入')).toHaveValue(arbitraryText)

    const malformed = String.fromCharCode(92) + 'u12'
    setValue(malformed)
    await user.click(screen.getByRole('button', { name: '去除转义' }))
    expect(screen.getByLabelText('JSON 输入')).toHaveValue(malformed)
    expect(await screen.findByText(/JSON 字符串转义内容无效/)).toBeVisible()

    setValue('{"edited":true}')
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))
    setValue('{"manual":true}')
    expect(screen.queryByRole('list', { name: 'JSON 树形结构' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '清空' }))
    expect(screen.getByLabelText('JSON 输入')).toHaveValue('')
    expect(screen.getByRole('button', { name: '复制 JSON 输入' })).toBeDisabled()
  })

  it('copies current input and tree nodes through accessible icon-only controls with stable feedback', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<JsonTool />)
    setValue('{"user":{"name":"Ada"}}')

    const statusRegion = document.querySelector('.json-status') as HTMLElement
    const inputCopy = screen.getByRole('button', { name: '复制 JSON 输入' })
    expect(inputCopy).toHaveTextContent('')
    expect(inputCopy.querySelector('svg.json-copy-icon')).not.toBeNull()
    expect(inputCopy).toHaveAttribute('title', '复制 JSON 输入')
    const input = screen.getByLabelText('JSON 输入')
    expect(inputCopy.closest('.field-heading')).not.toBeNull()
    expect(inputCopy.closest('.json-input-frame')).toBeNull()
    expect(input.closest('.json-input-frame')?.contains(inputCopy)).toBe(false)
    await user.click(inputCopy)
    expect(writeText).toHaveBeenLastCalledWith('{"user":{"name":"Ada"}}')
    expect(await screen.findByText('JSON 输入已复制到剪贴板。')).toBeVisible()
    expect(document.querySelector('.json-status')).toBe(statusRegion)

    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))
    const tree = screen.getByRole('list', { name: 'JSON 树形结构' })
    const nodeCopy = within(tree).getByRole('button', { name: '复制 对象 节点 user' })
    expect(nodeCopy).toHaveTextContent('')
    expect(nodeCopy.querySelector('svg.json-copy-icon')).not.toBeNull()
    await user.click(nodeCopy)
    expect(writeText).toHaveBeenLastCalledWith('{\n  "name": "Ada"\n}')
    expect(await screen.findByText('已复制节点 user。')).toBeVisible()
    expect(document.querySelector('.json-tree-feedback')).not.toBeInTheDocument()

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await user.click(nodeCopy)
    expect(await screen.findByText('无法访问剪贴板，请手动复制。')).toBeVisible()
    expect(document.querySelector('.json-status')).toBe(statusRegion)
    expect(within(tree).getByText('"user"')).toBeVisible()
  })

  it('exposes desktop and narrow layout hooks while keeping operations local', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
    render(<JsonTool />)

    const workspace = screen.getByTestId('json-workspace')
    expect(workspace).toHaveAttribute('data-layout', 'tree-right')
    expect(workspace.querySelector('.json-text-workspace > .panel')).not.toBeNull()
    expect(workspace.querySelector(':scope > .panel')).not.toBeNull()
    expect(screen.getByLabelText('JSON 输入').closest('.json-input-frame')).not.toBeNull()
    expect(screen.getByRole('button', { name: '复制 JSON 输入' }).closest('.field-heading')).not.toBeNull()
    for (const name of ['格式化 JSON', '压缩 JSON', '转义', '去除转义', '清空']) expect(screen.getByRole('button', { name })).toBeVisible()

    setValue(JSON.stringify({ long: 'x'.repeat(2000), nested: [{ value: true }] }))
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))
    await user.click(screen.getByRole('button', { name: '压缩 JSON' }))
    await user.click(screen.getByRole('button', { name: '转义' }))
    await user.click(screen.getByRole('button', { name: '去除转义' }))
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
    expect(screen.getByRole('heading', { name: '树形结构' })).toBeVisible()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
    storageSpy.mockRestore()
  })
})
