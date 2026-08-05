import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DIE_SIDES } from './dice'
import { DiceSimulatorTool } from './DiceSimulatorTool'

function setExpression(value: string) {
  fireEvent.change(screen.getByLabelText('骰子表达式'), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: '应用' }))
}

function displayedTotal() {
  return Number(screen.getByText(/^总点数：/).textContent?.split('：')[1])
}

describe('DiceSimulatorTool', () => {
  it('starts with the compact 1d6 default and a right-side modifier control', () => {
    render(<DiceSimulatorTool />)
    expect(screen.getByLabelText('d6 数量')).toHaveValue(1)
    expect(screen.getByLabelText('d2 数量')).toHaveValue(0)
    expect(screen.getByLabelText('补正')).toHaveValue(null)
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('1d6')
    expect(screen.getByText('当前组合：1d6')).toBeVisible()
    const expressionControl = screen.getByLabelText('骰子表达式').closest('.dice-expression')
    expect(expressionControl?.closest('.panel-heading')).not.toBeNull()
    expect(within(expressionControl as HTMLElement).getAllByRole('button').map((button) => button.textContent)).toEqual(['应用', '清空色子'])
    const layout = document.querySelector('.dice-selection-layout') as HTMLElement
    expect(layout.firstElementChild).toHaveClass('dice-grid')
    expect(screen.getByLabelText('补正').closest('.modifier-control')?.parentElement).toBe(layout)
  })

  it('synchronizes expression modifiers and visual modifier edits in both directions', () => {
    render(<DiceSimulatorTool />)
    setExpression('1d6 + 2D6 + 1d20 + 3 - 5')
    expect(screen.getByLabelText('d6 数量')).toHaveValue(3)
    expect(screen.getByLabelText('d20 数量')).toHaveValue(1)
    expect(screen.getByLabelText('补正')).toHaveValue(-2)
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('3d6 + 1d20 - 2')
    expect(screen.getByText('当前组合：3d6 + 1d20 - 2')).toBeVisible()

    fireEvent.change(screen.getByLabelText('补正'), { target: { value: '4' } })
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('3d6 + 1d20 + 4')
    expect(screen.getByText('当前组合：3d6 + 1d20 + 4')).toBeVisible()

    fireEvent.change(screen.getByLabelText('补正'), { target: { value: '' } })
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('3d6 + 1d20')
    expect(screen.getByText('当前组合：3d6 + 1d20')).toBeVisible()
  })

  it('reports invalid visual modifiers without replacing the previous valid configuration', async () => {
    const user = userEvent.setup()
    render(<DiceSimulatorTool />)
    fireEvent.change(screen.getByLabelText('补正'), { target: { value: '2' } })
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('1d6 + 2')

    fireEvent.change(screen.getByLabelText('补正'), { target: { value: '1.5' } })
    expect(screen.getByText('补正必须是整数。')).toBeVisible()
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('1d6 + 2')

    fireEvent.change(screen.getByLabelText('补正'), { target: { value: '9007199254740992' } })
    expect(screen.getByText('补正必须是安全整数。')).toBeVisible()
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('1d6 + 2')

    await user.click(screen.getByRole('button', { name: '投掷' }))
    expect(document.querySelector('.dice-modifier-result')).toHaveTextContent('补正+2')
  })

  it('keeps the previous dice and modifier configuration after invalid expression text', () => {
    render(<DiceSimulatorTool />)
    setExpression('1d6 + 2')
    setExpression('2d6 - 1d20')
    expect(screen.getByLabelText('d6 数量')).toHaveValue(1)
    expect(screen.getByLabelText('补正')).toHaveValue(2)
    expect(screen.getByText(/骰子项只能相加/)).toBeVisible()
  })

  it('adds a signed modifier as the last result row and preserves the rolled snapshot across edits and clear-dice', async () => {
    const user = userEvent.setup()
    render(<DiceSimulatorTool />)
    fireEvent.change(screen.getByLabelText('补正'), { target: { value: '5' } })
    await user.click(screen.getByRole('button', { name: '投掷' }))

    const diceValue = Number(document.querySelector('.dice-results > div:not(.dice-modifier-result) span')?.textContent)
    const firstTotal = displayedTotal()
    const resultRows = Array.from(document.querySelectorAll('.dice-results > div'))
    expect(resultRows.at(-1)).toHaveClass('dice-modifier-result')
    expect(resultRows.at(-1)).toHaveTextContent('补正+5')
    expect(firstTotal).toBe(diceValue + 5)

    fireEvent.change(screen.getByLabelText('补正'), { target: { value: '-3' } })
    expect(document.querySelector('.dice-modifier-result')).toHaveTextContent('补正+5')
    expect(displayedTotal()).toBe(firstTotal)

    await user.click(screen.getByRole('button', { name: '清空色子' }))
    for (const sides of DIE_SIDES) expect(screen.getByLabelText(`d${sides} 数量`)).toHaveValue(0)
    expect(screen.getByLabelText('补正')).toHaveValue(null)
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('')
    expect(screen.getByText('当前组合：尚未选择')).toBeVisible()
    expect(document.querySelector('.dice-modifier-result')).toHaveTextContent('补正+5')
    expect(displayedTotal()).toBe(firstTotal)
  })

  it('omits a zero modifier row and clear-results preserves the current configuration', async () => {
    const user = userEvent.setup()
    render(<DiceSimulatorTool />)
    await user.click(screen.getByRole('button', { name: '增加 d20' }))
    await user.click(screen.getByRole('button', { name: '投掷' }))
    expect(document.querySelector('.dice-modifier-result')).toBeNull()
    expect(screen.getByText(/已投掷 2 颗骰子/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: '清空结果' }))
    expect(screen.queryByText(/^总点数：/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('d6 数量')).toHaveValue(1)
    expect(screen.getByLabelText('d20 数量')).toHaveValue(1)
    expect(screen.getByLabelText('补正')).toHaveValue(null)
    expect(screen.getByLabelText('骰子表达式')).toHaveValue('1d6 + 1d20')
  })

  it('keeps the modifier operable in the narrow layout and rolls without network calls', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
    render(<DiceSimulatorTool />)
    const layout = document.querySelector('.dice-selection-layout') as HTMLElement
    expect(layout.querySelector('.dice-grid')).not.toBeNull()
    expect(layout.querySelector('.modifier-control input')).toBe(screen.getByLabelText('补正'))
    fireEvent.change(screen.getByLabelText('补正'), { target: { value: '-2' } })
    await user.click(screen.getByRole('button', { name: '投掷' }))
    expect(document.querySelector('.dice-modifier-result')).toHaveTextContent('补正-2')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
