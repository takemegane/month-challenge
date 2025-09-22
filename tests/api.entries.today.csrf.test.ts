import { describe, it, expect } from 'vitest'
import { POST } from '../app/api/entries/today/route'

// Note: import path relative to project root
// Using dynamic import to avoid TS path confusion in Vitest

describe('POST /api/entries/today CSRF', () => {
  it('returns 400 when CSRF token is missing', async () => {
    const req = new Request('http://localhost/api/entries/today', { method: 'POST' })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error', 'CSRF')
  })
})

