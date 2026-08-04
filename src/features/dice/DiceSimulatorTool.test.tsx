import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiceSimulatorTool } from './DiceSimulatorTool'

describe('DiceSimulatorTool', () => {
  it('starts with the compact 1d6 default', () => {
    render(<DiceSimulatorTool />)
    expect(screen.getByLabelText('d6 数量')).toHaveValue(1)
    expect(screen.getByLabelText('d2 数量')).toHaveValue(0)
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('1d6')
    expect(screen.getByText('当前组合：1d6')).toBeVisible()
    const expressionControl = screen.getByLabelText('骰子表达式').closest('.dice-expression')
    expect(expressionControl?.closest('.panel-heading')).not.toBeNull()
    expect(within(expressionControl as HTMLElement).getAllByRole('button').map((button) => button.textContent)).toEqual(['应用', '清空色子'])
  })

  it('clears the entire dice pool without clearing an existing roll', async () => {
    const user = userEvent.setup()
    render(<DiceSimulatorTool />)
    await user.click(screen.getByRole('button', { name: '投掷' }))
    expect(screen.getByText(/总点数：/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: '清空色子' }))
    for (const input of screen.getAllByRole('spinbutton')) expect(input).toHaveValue(0)
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('')
    expect(screen.getByText('当前组合：尚未选择')).toBeVisible()
    expect(screen.getByText(/总点数：/)).toBeVisible()
  })

  it('synchronizes expressions and visual counts', async () => {
    const user = userEvent.setup()
    render(<DiceSimulatorTool />)
    await user.clear(screen.getByLabelText('骰子表达式'))
    await user.type(screen.getByLabelText('骰子表达式'), '2d6 + 1D20')
    await user.click(screen.getByRole('button', { name: '应用' }))
    expect(screen.getByLabelText('d6 数量')).toHaveValue(2)
    expect(screen.getByLabelText('d20 数量')).toHaveValue(1)
    expect(screen.getByText('当前组合：2d6 + 1d20')).toBeVisible()
  })

  it('keeps the previous pool after invalid text', async () => {
    const user = userEvent.setup()
    render(<DiceSimulatorTool />)
    const input = screen.getByLabelText('骰子表达式')
    await user.clear(input)
    await user.type(input, '2d4')
    await user.click(screen.getByRole('button', { name: '应用' }))
    expect(screen.getByLabelText('d6 数量')).toHaveValue(1)
    expect(screen.getByText(/不支持 d4/)).toBeVisible()
  })

  it('rolls a mixed pool and clears only the result', async () => {
    const user = userEvent.setup()
    render(<DiceSimulatorTool />)
    await user.click(screen.getByRole('button', { name: '增加 d20' }))
    await user.click(screen.getByRole('button', { name: '投掷' }))
    expect(screen.getByText(/总点数：/)).toBeVisible()
    expect(screen.getByText(/已投掷 2 颗骰子/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: '清空结果' }))
    expect(screen.queryByText(/总点数：/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('d6 数量')).toHaveValue(1)
    expect(screen.getByLabelText('d20 数量')).toHaveValue(1)
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('1d6 + 1d20')
  })
})
