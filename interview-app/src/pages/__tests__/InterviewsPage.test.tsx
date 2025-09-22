import { describe, expect, it, vi } from 'vitest'
import type { Interview } from '../../types'

vi.mock('../../lib/api', () => ({
  listInterviews: vi.fn(),
  createInterview: vi.fn(),
  updateInterview: vi.fn(),
  deleteInterview: vi.fn(),
  countApplicantsForInterview: vi.fn(),
  countQuestionsForInterview: vi.fn(),
}))

import {
  fetchInterviewsWithCounts,
  saveInterviewAndReload,
  validateInterviewForm,
  type InterviewFormState,
} from '../InterviewsPage'
import * as api from '../../lib/api'

const mockedApi = vi.mocked(api)

describe('validateInterviewForm', () => {
  it('requires all core fields', () => {
    const emptyForm: InterviewFormState = {
      title: '',
      job_role: '',
      description: '',
      status: '' as unknown as Interview['status'],
    }

    const errors = validateInterviewForm(emptyForm)

    expect(errors).toEqual({
      title: 'Title is required.',
      job_role: 'Job role is required.',
      description: 'Description is required.',
      status: 'Status is required.',
    })
  })

  it('rejects unsupported status values', () => {
    const invalidStatusForm: InterviewFormState = {
      title: 'Technical Screen',
      job_role: 'Frontend Engineer',
      description: 'A short screening interview.',
      status: 'Active' as unknown as Interview['status'],
    }

    const errors = validateInterviewForm(invalidStatusForm)

    expect(errors.status).toBe('Status must be Draft, Published, or Archived.')
  })
})

describe('fetchInterviewsWithCounts', () => {
  it('surfaces a helpful error when the API payload is not an array', async () => {
    mockedApi.listInterviews.mockResolvedValue('<!DOCTYPE html>' as any)

    await expect(
      fetchInterviewsWithCounts({ order: 'id.desc', limit: 5, offset: 0 }),
    ).rejects.toThrow(/expected an array response/i)
  })
})

describe('saveInterviewAndReload', () => {
  it('creates a new interview and reloads the listing with counts', async () => {
    const formState: InterviewFormState = {
      title: 'Technical Screen',
      job_role: 'Frontend Engineer',
      description: 'A short screening interview.',
      status: 'Draft',
    }

    const interview: Interview = {
      id: 1,
      title: 'Technical Screen',
      job_role: 'Frontend Engineer',
      description: 'A short screening interview.',
      status: 'Draft',
      username: 'tester',
      created_at: '2025-01-01T00:00:00Z',
    }

    mockedApi.createInterview.mockResolvedValue(interview)
    mockedApi.listInterviews.mockResolvedValue([interview])
    mockedApi.countQuestionsForInterview.mockResolvedValue(2)
    mockedApi.countApplicantsForInterview.mockResolvedValue(3)

    const refreshed = await saveInterviewAndReload({
      formState,
      editingId: null,
      order: 'id.desc',
      page: 0,
      pageSize: 5,
    })

    expect(mockedApi.createInterview).toHaveBeenCalledWith(formState)
    expect(mockedApi.listInterviews).toHaveBeenCalledWith({ order: 'id.desc', limit: 5, offset: 0 })
    expect(mockedApi.countQuestionsForInterview).toHaveBeenCalledWith(interview.id)
    expect(mockedApi.countApplicantsForInterview).toHaveBeenCalledWith(interview.id)
    expect(refreshed).toEqual([
      {
        ...interview,
        questionCount: 2,
        applicantCount: 3,
      },
    ])
  })
})
