import { escapeJsonString, getJsonNodeCopyValue, parseJson, unescapeJsonString } from './json'

describe('JSON domain', () => {
  it('formats and minifies valid JSON roots', () => {
    expect(parseJson('{"b":[true,null],"a":1}')).toEqual({
      ok: true,
      value: {
        value: { b: [true, null], a: 1 },
        formatted: '{\n  "b": [\n    true,\n    null\n  ],\n  "a": 1\n}',
        minified: '{"b":[true,null],"a":1}',
      },
    })
    expect(parseJson('[1,2]')).toMatchObject({ ok: true, value: { formatted: '[\n  1,\n  2\n]' } })
    expect(parseJson('"text"')).toMatchObject({ ok: true, value: { formatted: '"text"' } })
    expect(parseJson('false')).toMatchObject({ ok: true, value: { formatted: 'false' } })
    expect(parseJson('null')).toMatchObject({ ok: true, value: { formatted: 'null' } })
  })

  it('rejects invalid and non-standard JSON', () => {
    expect(parseJson('{a:1}')).toMatchObject({ ok: false, code: 'invalid-input' })
    expect(parseJson('{"a":1,}')).toMatchObject({ ok: false, code: 'invalid-input' })
    expect(parseJson('// no')).toMatchObject({ ok: false, code: 'invalid-input' })
  })

  it('escapes and unescapes JSON string content', () => {
    const text = 'line 1\n"quoted" \\ slash 你好'
    const escaped = escapeJsonString(text)
    expect(escaped).toEqual({ ok: true, value: 'line 1\\n\\"quoted\\" \\\\ slash 你好' })
    if (!escaped.ok) return
    expect(unescapeJsonString(escaped.value)).toEqual({ ok: true, value: text })
    expect(unescapeJsonString(`"${escaped.value}"`)).toEqual({ ok: true, value: text })
  })

  it('rejects malformed escaped content', () => {
    expect(unescapeJsonString('\\u12')).toMatchObject({ ok: false, code: 'invalid-input' })
    expect(unescapeJsonString('\\x')).toMatchObject({ ok: false, code: 'invalid-input' })
    expect(unescapeJsonString('{"not":"a string"}')).toMatchObject({ ok: false, code: 'invalid-input' })
  })

  it('serializes node copy values by JSON part type', () => {
    expect(getJsonNodeCopyValue({ a: [1, true] })).toBe('{\n  "a": [\n    1,\n    true\n  ]\n}')
    expect(getJsonNodeCopyValue(['x'])).toBe('[\n  "x"\n]')
    expect(getJsonNodeCopyValue('raw text')).toBe('raw text')
    expect(getJsonNodeCopyValue(42)).toBe('42')
    expect(getJsonNodeCopyValue(false)).toBe('false')
    expect(getJsonNodeCopyValue(null)).toBe('null')
  })
})
