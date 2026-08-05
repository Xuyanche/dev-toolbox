import { DIE_SIDES, formatDiceExpression, type DiceConfiguration } from './dice'

export function DicePoolControls({ configuration, modifierInput, onPoolChange, onModifierChange }: {
  configuration: DiceConfiguration
  modifierInput: string
  onPoolChange: (sides: (typeof DIE_SIDES)[number], count: number) => void
  onModifierChange: (value: string) => void
}) {
  const { pool } = configuration
  return (
    <>
      <div className='dice-selection-layout'>
        <div className='dice-grid'>
          {DIE_SIDES.map((sides) => (
            <div className='die-control' key={sides}>
              <strong>d{sides}</strong>
              <div>
                <button type='button' aria-label={`减少 d${sides}`} onClick={() => onPoolChange(sides, pool[sides] - 1)} disabled={pool[sides] === 0}>−</button>
                <input aria-label={`d${sides} 数量`} type='number' min='0' max='10000' value={pool[sides]} onChange={(event) => onPoolChange(sides, Number(event.target.value))} />
                <button type='button' aria-label={`增加 d${sides}`} onClick={() => onPoolChange(sides, pool[sides] + 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <label className='modifier-control'>
          <strong>补正</strong>
          <input aria-label='补正' type='number' step='1' value={modifierInput} placeholder='0' onChange={(event) => onModifierChange(event.target.value)} />
        </label>
      </div>
      <span className='pool-summary'>当前组合：{formatDiceExpression(configuration) || '尚未选择'}</span>
    </>
  )
}

export function DiceExpressionControl({ expression, onExpression, onApply, onClear }: {
  expression: string
  onExpression: (value: string) => void
  onApply: () => void
  onClear: () => void
}) {
  return (
    <div className='dice-expression'>
      <input aria-label='骰子表达式' value={expression} placeholder='例如 2d6 + 1d20 - 3' onChange={(event) => onExpression(event.target.value)} />
      <button className='button button-secondary' type='button' onClick={onApply}>应用</button>
      <button className='button button-ghost' type='button' onClick={onClear}>清空色子</button>
    </div>
  )
}
