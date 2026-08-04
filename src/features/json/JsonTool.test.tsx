import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonTool } from './JsonTool'

function setValue(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('JsonTool', () => {
  it('formats JSON directly in the input box and renders a right-side code tree', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<JsonTool />)

    expect(screen.getByRole('heading', { name: 'JSON 格式化' })).toBeVisible()
    expect(screen.queryByLabelText('格式化结果')).not.toBeInTheDocument()

    const workspace = screen.getByTestId('json-format-mode').querySelector('.json-workspace') as HTMLElement
    expect(workspace).toHaveAttribute('data-layout', 'tree-right')

    setValue('JSON 输入', '{"user":{"name":"Ada","roles":["admin",true]},"count":2}')
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))

    expect(screen.getByLabelText('JSON 输入')).toHaveValue('{\n  "user": {\n    "name": "Ada",\n    "roles": [\n      "admin",\n      true\n    ]\n  },\n  "count": 2\n}')
    const treePanel = screen.getByRole('heading', { name: '树形结构' }).closest('.panel') as HTMLElement
    const tree = within(treePanel).getByRole('list', { name: 'JSON 树形结构' })
    expect(tree).toHaveClass('json-code-tree')
    expect(within(tree).getByText('"user"')).toBeVisible()
    expect(within(tree).getByText('"count"')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '复制格式化结果' }))
    expect(writeText).toHaveBeenLastCalledWith('{\n  "user": {\n    "name": "Ada",\n    "roles": [\n      "admin",\n      true\n    ]\n  },\n  "count": 2\n}')
    await user.click(screen.getByRole('button', { name: '复制压缩结果' }))
    expect(writeText).toHaveBeenLastCalledWith('{"user":{"name":"Ada","roles":["admin",true]},"count":2}')

    await user.click(within(tree).getByRole('button', { name: '复制 对象 节点 user' }))
    expect(writeText).toHaveBeenLastCalledWith('{\n  "name": "Ada",\n  "roles": [\n    "admin",\n    true\n  ]\n}')
    expect(await within(treePanel).findByText('已复制节点 user')).toBeVisible()
    expect(within(tree).queryByText(/已复制/)).not.toBeInTheDocument()

    await user.click(within(tree).getByRole('button', { name: '展开 user' }))
    await user.click(within(tree).getByRole('button', { name: '复制 字符串 节点 name' }))
    expect(writeText).toHaveBeenLastCalledWith('Ada')
  })

  it('collapses arbitrary nested levels into compact Array/Object summaries', async () => {
    const user = userEvent.setup()
    render(<JsonTool />)

    setValue('JSON 输入', '{"user":{"name":"Ada","roles":["admin",true]},"features":[1,2,3,4,5,6],"meta":{"active":true}}')
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))
    const tree = screen.getByRole('list', { name: 'JSON 树形结构' })

    await user.click(within(tree).getByRole('button', { name: '展开 user' }))
    await user.click(within(tree).getByRole('button', { name: '展开 roles' }))
    expect(within(tree).getByText('"admin"')).toBeVisible()

    await user.click(within(tree).getByRole('button', { name: '折叠 roles' }))
    expect(within(tree).getByText('Array[2]')).toHaveClass('json-code-summary')
    expect(within(tree).queryByText('"admin"')).not.toBeInTheDocument()
    expect(within(tree).getByText('"name"')).toBeVisible()

    await user.click(within(tree).getByRole('button', { name: '折叠 user' }))
    expect(within(tree).getByText('Object{2}')).toHaveClass('json-code-summary')
    expect(within(tree).queryByText('"name"')).not.toBeInTheDocument()
    expect(within(tree).getByText('"features"')).toBeVisible()
    expect(within(tree).getByText('Array[6]')).toHaveClass('json-code-summary')
  })

  it('toggles all tree nodes with one button while keeping the text workspace unchanged', async () => {
    const user = userEvent.setup()
    render(<JsonTool />)

    setValue('JSON 输入', '{"user":{"name":"Ada","roles":["admin",true]},"features":[1,2,3,4,5,6]}')
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))

    const input = screen.getByLabelText('JSON 输入')
    const formattedValue = (input as HTMLTextAreaElement).value
    const treePanel = screen.getByRole('heading', { name: '树形结构' }).closest('.panel') as HTMLElement
    const toggleAll = within(treePanel).getByRole('button', { name: '全部折叠' })

    await user.click(toggleAll)
    expect(within(treePanel).getByRole('button', { name: '全部展开' })).toBeVisible()
    expect(within(treePanel).getByText('Object{2}')).toHaveClass('json-code-summary')
    expect(within(treePanel).queryByText('"user"')).not.toBeInTheDocument()
    expect(input).toHaveValue(formattedValue)

    await user.click(within(treePanel).getByRole('button', { name: '全部展开' }))
    expect(within(treePanel).getByRole('button', { name: '全部折叠' })).toBeVisible()
    expect(within(treePanel).getByText('"user"')).toBeVisible()
    expect(within(treePanel).getByText('"roles"')).toBeVisible()
    expect(within(treePanel).getByText('"admin"')).toBeVisible()
    expect(input).toHaveValue(formattedValue)
    expect(treePanel.querySelector('.json-code-feedback')).not.toBeInTheDocument()
  })

  it('clears stale parsed output on invalid JSON with Chinese feedback', async () => {
    const user = userEvent.setup()
    render(<JsonTool />)

    setValue('JSON 输入', '{"ok":true}')
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))
    expect(screen.getByText('"ok"')).toBeVisible()

    setValue('JSON 输入', '{"ok":true,}')
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))
    expect(await screen.findByText(/JSON 解析失败/)).toBeVisible()
    expect(screen.queryByRole('list', { name: 'JSON 树形结构' })).not.toBeInTheDocument()
    expect(screen.getByText('格式化 JSON 后，树形结构会显示在这里。')).toBeVisible()
  })

  it('escapes and unescapes JSON string content with Chinese controls and independent state', async () => {
    const user = userEvent.setup()
    render(<JsonTool />)

    await user.click(screen.getByRole('radio', { name: '转义 / 去除转义' }))
    setValue('JSON 字符串输入', 'line 1\n"quoted"')
    await user.click(screen.getByRole('button', { name: '转义 JSON 字符串' }))
    expect(screen.getByLabelText('JSON 字符串输出')).toHaveValue('line 1\\n\\"quoted\\"')

    await user.click(screen.getByRole('radio', { name: '去除转义' }))
    setValue('JSON 字符串输入', 'line 1\\n\\"quoted\\"')
    await user.click(screen.getByRole('button', { name: '去除 JSON 字符串转义' }))
    expect(screen.getByLabelText('JSON 字符串输出')).toHaveValue('line 1\n"quoted"')

    setValue('JSON 字符串输入', '\\u12')
    await user.click(screen.getByRole('button', { name: '去除 JSON 字符串转义' }))
    expect(await screen.findByText(/JSON 字符串转义内容无效/)).toBeVisible()
    expect(screen.getByLabelText('JSON 字符串输出')).toHaveValue('')
  })

  it('keeps JSON processing local', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<JsonTool />)

    setValue('JSON 输入', JSON.stringify({ long: 'x'.repeat(2000), nested: [{ value: true }] }))
    await user.click(screen.getByRole('button', { name: '格式化 JSON' }))
    expect((screen.getByLabelText('JSON 输入') as HTMLTextAreaElement).value).toContain('"nested"')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
    storageSpy.mockRestore()
  })
})
