import type { KeyboardEvent } from 'react'

export type PrimaryActionShortcut = 'ctrl-enter' | 'enter'

export function runPrimaryActionShortcut(
  event: KeyboardEvent<HTMLElement>,
  shortcut: PrimaryActionShortcut,
  onPrimaryAction?: () => void,
  disabled = false,
) {
  if (
    !onPrimaryAction
    || disabled
    || event.key !== 'Enter'
    || event.repeat
    || event.nativeEvent.isComposing
    || event.altKey
    || event.metaKey
    || event.shiftKey
  ) return false

  if (shortcut === 'ctrl-enter' ? !event.ctrlKey : false) return false

  event.preventDefault()
  onPrimaryAction()
  return true
}
