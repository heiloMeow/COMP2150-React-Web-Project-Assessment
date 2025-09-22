import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE, JWT, USERNAME } from '../../config'
import {
  apiRequest,
  buildQuery,
  countQuestionsForInterview,
  createApplicant,
  listInterviews,
  updateApplicant,
} from '../api'

describe('buildQuery', () => {
  it('serialises search parameters into a PostgREST query string', () => {
    const query = buildQuery({ order: 'id.desc', limit: 10, offset: 0, title: 'ilike.*dev*' })
    expect(query.startsWith('?')).toBe(true)
    const params = new URLSearchParams(query.slice(1))
    expect(params.get('order')).toBe('id.desc')
    expect(params.get('limit')).toBe('10')
    expect(params.get('offset')).toBe('0')
    expect(params.get('title')).toBe('ilike.*dev*')
  })
})

describe('apiRequest helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('performs GET requests with search parameters and auth headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('[]'),
    })

    global.fetch = mockFetch as unknown as typeof fetch

    await listInterviews({ order: 'id.desc', limit: 10, offset: 0 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0] as [string, any]
    expect(url).toBe(`${API_BASE}/interview?order=id.desc&limit=10&offset=0`)
    expect(init.headers).toMatchObject({
      Authorization: `Bearer ${JWT}`,
      'Content-Type': 'application/json',
    })
  })

  it('merges username into POST bodies and sets Prefer header when missing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{}'),
    })

    global.fetch = mockFetch as unknown as typeof fetch

    await createApplicant({
      interview_id: 5,
      title: 'Mr',
      firstname: 'Ada',
      surname: 'Lovelace',
      email_address: 'ada@example.com',
      interview_status: 'Not Started',
    })

    const [, init] = mockFetch.mock.calls[0] as [string, any]
    expect(init.headers).toMatchObject({ Prefer: 'return=representation' })
    const parsed = JSON.parse(init.body as string)
    expect(parsed.username).toBe(USERNAME)
  })

  it('respects caller-provided username in POST bodies', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{}'),
    })

    global.fetch = mockFetch as unknown as typeof fetch

    await createApplicant({
      interview_id: 5,
      title: 'Ms',
      firstname: 'Grace',
      surname: 'Hopper',
      email_address: 'grace@example.com',
      interview_status: 'Not Started',
      username: 'custom-user',
    })

    const [, init] = mockFetch.mock.calls[0] as [string, any]
    const parsed = JSON.parse(init.body as string)
    expect(parsed.username).toBe('custom-user')
  })

  it('appends id filters for PATCH requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{}'),
    })

    global.fetch = mockFetch as unknown as typeof fetch

    await updateApplicant(9, { interview_status: 'Completed' })

    const [url, init] = mockFetch.mock.calls[0] as [string, any]
    expect(url).toBe(`${API_BASE}/applicant?id=eq.9`)
    expect(init.headers).toMatchObject({ Prefer: 'return=representation' })
    const parsed = JSON.parse(init.body as string)
    expect(parsed.username).toBe(USERNAME)
  })

  it('throws errors with status codes on failure responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{"error":"bad request"}'),
    })

    global.fetch = mockFetch as unknown as typeof fetch

    await expect(apiRequest('/interview', { method: 'GET' })).rejects.toThrow(/400/)
  })

  it('returns zero for count helpers when the API responds with 404', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => 'application/json' },
      text: () =>
        Promise.resolve('{"code":"PGRST302","message":"Results contain 0 rows"}'),
    })

    global.fetch = mockFetch as unknown as typeof fetch

    await expect(countQuestionsForInterview(123)).resolves.toBe(0)
  })
})
