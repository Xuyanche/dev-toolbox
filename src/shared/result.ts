export type ToolErrorCode =
  | 'invalid-input'
  | 'unsupported'
  | 'too-long'
  | 'crypto-failed'
  | 'clipboard-failed'

export type ToolResult<T> =
  | { ok: true; value: T; warning?: string }
  | { ok: false; code: ToolErrorCode; message: string }

export const success = <T>(value: T, warning?: string): ToolResult<T> =>
  warning ? { ok: true, value, warning } : { ok: true, value }

export const failure = (code: ToolErrorCode, message: string): ToolResult<never> => ({
  ok: false,
  code,
  message,
})
