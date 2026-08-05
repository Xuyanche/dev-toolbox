import { useState } from 'react'
import { Panel, StatusMessage, ToolHeader, type StatusState } from '../../shell/ui'
import { defaultDiceConfiguration, emptyDiceConfiguration, formatDiceExpression, parseDiceExpression, rollDice, type DiceConfiguration, type DiceRoll, type DieSides } from './dice'
import { DiceExpressionControl, DicePoolControls } from './DicePoolControls'

export function DiceSimulatorTool() {
  const [configuration, setConfiguration] = useState<DiceConfiguration>(() => defaultDiceConfiguration())
  const [modifierInput, setModifierInput] = useState('')
  const [expression, setExpression] = useState(() => formatDiceExpression(defaultDiceConfiguration()))
  const [roll, setRoll] = useState<DiceRoll | null>(null)
  const [status, setStatus] = useState<StatusState>(null)

  function changeCount(sides: DieSides, next: number) {
    const normalized = Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0
    const updated = { ...configuration, pool: { ...configuration.pool, [sides]: normalized } }
    setConfiguration(updated)
    setExpression(formatDiceExpression(updated))
    setStatus(null)
  }

  function changeModifier(value: string) {
    setModifierInput(value)
    if (!value.trim()) {
      const updated = { ...configuration, modifier: 0 }
      setConfiguration(updated)
      setExpression(formatDiceExpression(updated))
      setStatus(null)
      return
    }
    if (!/^-?\d+$/.test(value)) {
      setStatus({ kind: 'error', message: '补正必须是整数。' })
      return
    }
    const modifier = Number(value)
    if (!Number.isSafeInteger(modifier)) {
      setStatus({ kind: 'error', message: '补正必须是安全整数。' })
      return
    }
    const updated = { ...configuration, modifier }
    setConfiguration(updated)
    setExpression(formatDiceExpression(updated))
    setStatus(null)
  }

  function applyExpression() {
    const parsed = parseDiceExpression(expression)
    if (!parsed.ok) return setStatus({ kind: 'error', message: parsed.message })
    setConfiguration(parsed.value)
    setModifierInput(parsed.value.modifier === 0 ? '' : String(parsed.value.modifier))
    setExpression(formatDiceExpression(parsed.value))
    setStatus({ kind: 'success', message: '骰子组合已更新。' })
  }

  function performRoll() {
    const result = rollDice(configuration)
    if (!result.ok) return setStatus({ kind: 'error', message: result.message })
    setRoll(result.value)
    const count = result.value.groups.reduce((sum, group) => sum + group.values.length, 0)
    setStatus({ kind: 'success', message: `已投掷 ${count} 颗骰子。` })
  }

  function clearResults() {
    setRoll(null)
    setStatus(null)
  }

  function clearDice() {
    setConfiguration(emptyDiceConfiguration())
    setModifierInput('')
    setExpression('')
    setStatus(null)
  }

  return (
    <div className='tool-page'>
      <ToolHeader eyebrow='RANDOM / DICE' title='色子模拟器' description='组合常见多面骰子，查看每颗结果与总点数。随机过程仅在当前浏览器中完成。' />
      <Panel title='选择骰子' aside={<DiceExpressionControl expression={expression} onExpression={setExpression} onApply={applyExpression} onClear={clearDice} />}>
        <DicePoolControls configuration={configuration} modifierInput={modifierInput} onPoolChange={changeCount} onModifierChange={changeModifier} />
        <div className='action-row'><button className='button button-primary' type='button' onClick={performRoll}>投掷</button></div>
        <StatusMessage status={status} />
      </Panel>
      {roll ? (
        <Panel title='投掷结果' aside={<div className='result-actions dice-result-actions'><strong className='dice-total'>总点数：{roll.total}</strong><button className='button button-ghost' type='button' onClick={clearResults}>清空结果</button></div>}>
          <div className='dice-results'>
            {roll.groups.map((group) => <div key={group.sides}><strong>d{group.sides}</strong><span>{group.values.join('、')}</span></div>)}
            {roll.modifier !== 0 ? <div className='dice-modifier-result'><strong>补正</strong><span>{roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier}</span></div> : null}
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
