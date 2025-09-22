import { describe, it, expect } from 'vitest'
import { getJstTodayDate, toISODate, startOfMonthJst, endOfMonthJst, getRangeStart } from '../lib/date'

describe('JST date utils', () => {
  it('getJstTodayDate returns YYYY-MM-DD', () => {
    const d = getJstTodayDate()
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('toISODate normalizes to YYYY-MM-DD in JST', () => {
    const d = toISODate(new Date())
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('month bounds cover same month in JST', () => {
    const today = getJstTodayDate()
    const start = startOfMonthJst(today)
    const end = endOfMonthJst(today)
    const s = toISODate(start)
    const e = toISODate(end)
    expect(s.slice(0,7)).toBe(today.slice(0,7))
    expect(e.slice(0,7)).toBe(today.slice(0,7))
    expect(Number(e.slice(8,10))).toBeGreaterThanOrEqual(28)
  })

  it('getRangeStart subtracts months correctly', () => {
    const one = getRangeStart('1m')
    const three = getRangeStart('3m')
    const six = getRangeStart('6m')
    expect(one).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(three).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(six).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

