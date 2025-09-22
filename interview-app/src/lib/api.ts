import { API_BASE, JWT, USERNAME } from '../config'
import type {
  Applicant,
  ApplicantAnswer,
  Interview,
  Question,
} from '../types'

type SearchParams = Record<string, string | number | boolean>

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface ApiRequestInit {
  method?: HttpMethod
  search?: SearchParams
  body?: unknown
}

const JSON_METHODS = new Set<HttpMethod>(['POST', 'PATCH'])
const ERROR_SNIPPET_LENGTH = 200

export function buildQuery(search?: SearchParams): string {
  if (!search || Object.keys(search).length === 0) {
    return ''
  }

  const query = Object.entries(search)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')

  return `?${query}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const method = init.method ?? 'GET'
  const url = `${API_BASE}${path}${buildQuery(init.search)}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${JWT}`,
    'Content-Type': 'application/json',
  }

  if (JSON_METHODS.has(method)) {
    headers.Prefer = 'return=representation'
  }

  let bodyToSend = init.body

  if (JSON_METHODS.has(method) && isRecord(bodyToSend)) {
    bodyToSend = { username: USERNAME, ...bodyToSend }
  }

  const fetchInit: RequestInit = {
    method,
    headers,
  }

  if (bodyToSend !== undefined) {
    if (isRecord(bodyToSend) || Array.isArray(bodyToSend)) {
      fetchInit.body = JSON.stringify(bodyToSend)
    } else if (typeof bodyToSend === 'string') {
      fetchInit.body = bodyToSend
    } else {
      fetchInit.body = JSON.stringify(bodyToSend)
    }
  }

  const response = await fetch(url, fetchInit)
  const rawText = await response.text()

  if (!response.ok) {
    const snippet = rawText.slice(0, ERROR_SNIPPET_LENGTH)
    throw new Error(`Request failed with status ${response.status}: ${snippet}`)
  }

  if (!rawText) {
    return null as T
  }

  const contentType = response.headers?.get?.('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return JSON.parse(rawText) as T
  }

  return rawText as unknown as T
}

export function listInterviews(search?: SearchParams) {
  return apiRequest<Interview[]>(`/interview`, { search })
}

export function createInterview(data: Partial<Interview>) {
  return apiRequest<Interview | Interview[]>(`/interview`, { method: 'POST', body: data })
}

export function updateInterview(id: number, patch: Partial<Interview>) {
  return apiRequest<Interview | Interview[]>(`/interview`, {
    method: 'PATCH',
    search: { id: `eq.${id}` },
    body: patch,
  })
}

export function deleteInterview(id: number) {
  return apiRequest<null>(`/interview`, {
    method: 'DELETE',
    search: { id: `eq.${id}` },
  })
}

export function listQuestions(search?: SearchParams) {
  return apiRequest<Question[]>(`/question`, { search })
}

type CountResponse = Array<{ count?: number | string }>

async function fetchCount(path: string, search: SearchParams) {
  try {
    const rows = await apiRequest<CountResponse>(path, {
      search: { ...search, select: 'count' },
    })

    const first = rows[0]?.count

    if (typeof first === 'string') {
      const parsed = Number.parseInt(first, 10)
      return Number.isNaN(parsed) ? 0 : parsed
    }

    if (typeof first === 'number') {
      return first
    }

    return 0
  } catch (error) {
    if (error instanceof Error && /status\s+404/.test(error.message)) {
      return 0
    }

    throw error
  }
}

export function countQuestionsForInterview(interviewId: number) {
  return fetchCount(`/question`, { interview_id: `eq.${interviewId}` })
}

export function createQuestion(data: Partial<Question>) {
  return apiRequest<Question | Question[]>(`/question`, { method: 'POST', body: data })
}

export function updateQuestion(id: number, patch: Partial<Question>) {
  return apiRequest<Question | Question[]>(`/question`, {
    method: 'PATCH',
    search: { id: `eq.${id}` },
    body: patch,
  })
}

export function deleteQuestion(id: number) {
  return apiRequest<null>(`/question`, {
    method: 'DELETE',
    search: { id: `eq.${id}` },
  })
}

export function listApplicants(search?: SearchParams) {
  return apiRequest<Applicant[]>(`/applicant`, { search })
}

export function countApplicantsForInterview(interviewId: number) {
  return fetchCount(`/applicant`, { interview_id: `eq.${interviewId}` })
}

export function createApplicant(data: Partial<Applicant>) {
  return apiRequest<Applicant | Applicant[]>(`/applicant`, { method: 'POST', body: data })
}

export function updateApplicant(id: number, patch: Partial<Applicant>) {
  return apiRequest<Applicant | Applicant[]>(`/applicant`, {
    method: 'PATCH',
    search: { id: `eq.${id}` },
    body: patch,
  })
}

export function deleteApplicant(id: number) {
  return apiRequest<null>(`/applicant`, {
    method: 'DELETE',
    search: { id: `eq.${id}` },
  })
}

export function listApplicantAnswers(search?: SearchParams) {
  return apiRequest<ApplicantAnswer[]>(`/applicant_answer`, { search })
}

export function createApplicantAnswer(data: Partial<ApplicantAnswer>) {
  return apiRequest<ApplicantAnswer | ApplicantAnswer[]>(`/applicant_answer`, {
    method: 'POST',
    body: data,
  })
}

export function updateApplicantAnswer(id: number, patch: Partial<ApplicantAnswer>) {
  return apiRequest<ApplicantAnswer | ApplicantAnswer[]>(`/applicant_answer`, {
    method: 'PATCH',
    search: { id: `eq.${id}` },
    body: patch,
  })
}

export function deleteApplicantAnswer(id: number) {
  return apiRequest<null>(`/applicant_answer`, {
    method: 'DELETE',
    search: { id: `eq.${id}` },
  })
}
