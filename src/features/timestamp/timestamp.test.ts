import { compileDateFormat, formatTimestamp, parseCustomDate, parseIsoDate } from './timestamp'

describe('timestamp conversion', () => {
  it('validates custom tokens', () => {
    expect(compileDateFormat('YYYY-MM-DD HH:mm:ss.SSS').ok).toBe(true)
    expect(compileDateFormat('YYYY-M-DD')).toMatchObject({ ok: false })
    expect(compileDateFormat('YYYY-YYYY')).toMatchObject({ ok: false })
  })

  it('formats seconds and milliseconds consistently in UTC', () => {
    expect(formatTimestamp('0', 'seconds', 'utc', 'custom', 'YYYY-MM-DD HH:mm:ss')).toMatchObject({
      ok: true, value: { text: '1970-01-01 00:00:00' },
    })
    expect(formatTimestamp('123', 'milliseconds', 'utc', 'custom', 'YYYY-MM-DD HH:mm:ss')).toMatchObject({
      ok: true, warning: expect.stringContaining('毫秒'),
    })
  })

  it('strictly parses custom dates and rejects impossible dates', () => {
    expect(parseCustomDate('2024/02/29 01:02:03.004', 'YYYY/MM/DD HH:mm:ss.SSS', 'utc', 'milliseconds'))
      .toEqual({ ok: true, value: String(Date.UTC(2024, 1, 29, 1, 2, 3, 4)) })
    expect(parseCustomDate('2023-02-29', 'YYYY-MM-DD', 'utc', 'seconds')).toMatchObject({ ok: false })
  })

  it('parses ISO UTC, offsets, no-offset input and dates', () => {
    expect(parseIsoDate('2026-08-04T15:30:45.123Z', 'local', 'milliseconds'))
      .toEqual({ ok: true, value: String(Date.UTC(2026, 7, 4, 15, 30, 45, 123)) })
    expect(parseIsoDate('2026-08-04T15:30:45+08:00', 'utc', 'seconds'))
      .toEqual({ ok: true, value: String(Date.UTC(2026, 7, 4, 7, 30, 45) / 1000) })
    expect(parseIsoDate('2026-08-04T15:30:45', 'utc', 'seconds'))
      .toEqual({ ok: true, value: String(Date.UTC(2026, 7, 4, 15, 30, 45) / 1000) })
    expect(parseIsoDate('2026-08-04', 'utc', 'milliseconds'))
      .toEqual({ ok: true, value: String(Date.UTC(2026, 7, 4)) })
  })

  it('rejects malformed ISO input and round trips ISO milliseconds', () => {
    expect(parseIsoDate('2026-02-30T00:00:00Z', 'utc', 'milliseconds')).toMatchObject({ ok: false })
    expect(parseIsoDate('2026-08-04 15:30:45Z', 'utc', 'milliseconds')).toMatchObject({ ok: false })
    expect(parseIsoDate('2026-08-04T15:30:45+24:00', 'utc', 'milliseconds')).toMatchObject({ ok: false })
    const formatted = formatTimestamp('1785857445123', 'milliseconds', 'utc', 'iso', '')
    expect(formatted.ok).toBe(true)
    if (!formatted.ok) return
    expect(parseIsoDate(formatted.value.text, 'local', 'milliseconds')).toEqual({ ok: true, value: '1785857445123' })
  })
})
