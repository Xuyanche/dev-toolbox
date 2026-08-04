import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RandomNumberGeneratorTool } from './RandomNumberGeneratorTool'

describe('RandomNumberGeneratorTool', () => {
  it('renders required defaults and generates replacement results', async () => {
    const user = userEvent.setup()
    render(<RandomNumberGeneratorTool />)
    expect(screen.getByLabelText('最小值')).toHaveValue(1)
    expect(screen.getByLabelText('最大值')).toHaveValue(100)
    expect(screen.getByLabelText('生成数量')).toHaveValue(1)
    expect(screen.getByLabelText('结果唯一')).toBeChecked()
    await user.click(screen.getByRole('button', { name: '生成随机数' }))
    expect(screen.getByLabelText('随机数结果').children).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: '清空结果' }))
    expect(screen.getByLabelText('随机数结果').children).toHaveLength(0)
    expect(screen.getByLabelText('最小值')).toHaveValue(1)
    expect(screen.getByLabelText('最大值')).toHaveValue(100)
    expect(screen.getByLabelText('生成数量')).toHaveValue(1)
    expect(screen.getByRole('button', { name: '清空结果' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '复制全部结果' })).toBeDisabled()
  })

  it('rejects impossible unique integer requests without partial output', async () => {
    const user = userEvent.setup()
    render(<RandomNumberGeneratorTool />)
    await user.clear(screen.getByLabelText('最大值'))
    await user.type(screen.getByLabelText('最大值'), '3')
    await user.clear(screen.getByLabelText('生成数量'))
    await user.type(screen.getByLabelText('生成数量'), '4')
    await user.click(screen.getByRole('button', { name: '生成随机数' }))
    expect(screen.getByText(/只有 3 个整数/)).toBeVisible()
    expect(screen.getByLabelText('随机数结果').children).toHaveLength(0)
  })

  it('switches to floats and allows duplicates', async () => {
    const user = userEvent.setup()
    render(<RandomNumberGeneratorTool />)
    await user.click(screen.getByLabelText('浮点数'))
    await user.click(screen.getByLabelText('结果唯一'))
    expect(screen.getByLabelText('浮点数')).toBeChecked()
    expect(screen.getByLabelText('结果唯一')).not.toBeChecked()
  })
})
