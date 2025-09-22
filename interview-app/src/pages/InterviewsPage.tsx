import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  countApplicantsForInterview,
  countQuestionsForInterview,
  createInterview,
  deleteInterview,
  listInterviews,
  updateInterview,
} from '../lib/api'
import type { Interview } from '../types'

export interface InterviewFormState {
  title: string
  job_role: string
  description: string
  status: string
}

export type FormErrors = Partial<Record<keyof InterviewFormState, string>>

type InterviewWithCounts = Interview & {
  applicantCount: number
  questionCount: number
}

const EMPTY_FORM: InterviewFormState = {
  title: '',
  job_role: '',
  description: '',
  status: '',
}

export function validateInterviewForm(state: InterviewFormState): FormErrors {
  const nextErrors: FormErrors = {}

  if (!state.title.trim()) {
    nextErrors.title = 'Title is required.'
  }

  if (!state.job_role.trim()) {
    nextErrors.job_role = 'Job role is required.'
  }

  if (!state.description.trim()) {
    nextErrors.description = 'Description is required.'
  }

  if (!state.status.trim()) {
    nextErrors.status = 'Status is required.'
  }

  return nextErrors
}

export async function fetchInterviewsWithCounts(params: {
  order: string
  limit: number
  offset: number
}): Promise<InterviewWithCounts[]> {
  const interviewPayload = (await listInterviews({
    order: params.order,
    limit: params.limit,
    offset: params.offset,
  })) as unknown

  if (!Array.isArray(interviewPayload)) {
    const preview =
      typeof interviewPayload === 'string'
        ? interviewPayload.slice(0, 120)
        : JSON.stringify(interviewPayload).slice(0, 120)

    throw new Error(
      `Unable to load interviews: expected an array response from the API. ` +
        `Please verify your API_BASE configuration. Received: ${preview}`,
    )
  }

  const interviewList = interviewPayload as Interview[]
  const enriched = await Promise.all(
    interviewList.map(async (interview) => {
      const [questionCount, applicantCount] = await Promise.all([
        countQuestionsForInterview(interview.id),
        countApplicantsForInterview(interview.id),
      ])

      return {
        ...interview,
        questionCount,
        applicantCount,
      }
    }),
  )

  return enriched
}

export async function saveInterviewAndReload(options: {
  formState: InterviewFormState
  editingId: number | null
  order: 'id.asc' | 'id.desc'
  page: number
  pageSize: number
}): Promise<InterviewWithCounts[]> {
  const { formState, editingId, order, page, pageSize } = options

  if (editingId !== null) {
    await updateInterview(editingId, formState)
  } else {
    await createInterview(formState)
  }

  return fetchInterviewsWithCounts({
    order,
    limit: pageSize,
    offset: page * pageSize,
  })
}

function InterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewWithCounts[]>([])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const [order, setOrder] = useState<'id.asc' | 'id.desc'>('id.desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formState, setFormState] = useState<InterviewFormState>({ ...EMPTY_FORM })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isEditing = editingId !== null

  const paginationLabel = useMemo(() => {
    const start = page * pageSize + 1
    const end = start + interviews.length - 1
    return interviews.length > 0 ? `${start}–${end}` : '0'
  }, [interviews.length, page, pageSize])

  const loadInterviews = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const refreshed = await fetchInterviewsWithCounts({
        order,
        limit: pageSize,
        offset: page * pageSize,
      })

      setInterviews(refreshed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [order, page, pageSize])

  useEffect(() => {
    loadInterviews()
  }, [loadInterviews])

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setFormState({ ...EMPTY_FORM })
    setFormErrors({})
    setEditingId(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const validation = validateInterviewForm(formState)
    setFormErrors(validation)

    if (Object.keys(validation).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      const targetPage = isEditing && editingId !== null ? page : 0

      if (!isEditing && page !== 0) {
        setPage(0)
      }

      const refreshed = await saveInterviewAndReload({
        formState,
        editingId,
        order,
        page: targetPage,
        pageSize,
      })

      resetForm()
      setInterviews(refreshed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (interview: InterviewWithCounts) => {
    setEditingId(interview.id)
    setFormState({
      title: interview.title,
      job_role: interview.job_role,
      description: interview.description ?? '',
      status: interview.status,
    })
    setFormErrors({})
  }

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Delete this interview? This action cannot be undone.')

    if (!confirmed) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await deleteInterview(id)
      if (editingId === id) {
        resetForm()
      }
      await loadInterviews()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    resetForm()
  }

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number.parseInt(event.target.value, 10)
    setPageSize(nextSize)
    setPage(0)
  }

  const handleOrderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextOrder = event.target.value === 'id.asc' ? 'id.asc' : 'id.desc'
    setOrder(nextOrder)
    setPage(0)
  }

  const canGoBack = page > 0
  const canGoForward = interviews.length === pageSize

  return (
    <section className="page" aria-labelledby="interviews-heading">
      <div className="page-header">
        <h1 id="interviews-heading">Interviews</h1>
        <p className="page-description">
          Manage interviews, track linked questions and applicants, and create new opportunities.
        </p>
      </div>

      <div className="panel">
        <header className="panel-header">
          <h2>Interview list</h2>
          <div className="panel-controls">
            <label>
              Order
              <select value={order} onChange={handleOrderChange} aria-label="Order interviews">
                <option value="id.desc">Newest first</option>
                <option value="id.asc">Oldest first</option>
              </select>
            </label>
            <label>
              Page size
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                aria-label="Interviews per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
            <div className="pagination-controls" role="group" aria-label="Pagination">
              <button type="button" onClick={() => setPage((prev) => Math.max(prev - 1, 0))} disabled={!canGoBack}>
                Previous
              </button>
              <span className="pagination-range" aria-live="polite">
                Showing {paginationLabel}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!canGoForward}
              >
                Next
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p>Loading interviews…</p>
        ) : interviews.length === 0 ? (
          <p>No interviews found for the current filters.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Job role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Questions</th>
                  <th scope="col">Applicants</th>
                  <th scope="col" aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {interviews.map((interview) => (
                  <tr key={interview.id}>
                    <td>{interview.title}</td>
                    <td>{interview.job_role}</td>
                    <td>{interview.status}</td>
                    <td>{interview.questionCount}</td>
                    <td>{interview.applicantCount}</td>
                    <td className="table-actions">
                      <button type="button" onClick={() => handleEdit(interview)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(interview.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <header className="panel-header">
          <h2>{isEditing ? 'Edit interview' : 'Create interview'}</h2>
        </header>

        <form className="stacked-form" onSubmit={handleSubmit} noValidate data-testid="interview-form">
          <div className="form-field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              value={formState.title}
              onChange={handleInputChange}
              required
              aria-invalid={formErrors.title ? 'true' : 'false'}
              aria-describedby={formErrors.title ? 'title-error' : undefined}
            />
            {formErrors.title ? (
              <p className="field-error" id="title-error" data-testid="title-error">
                {formErrors.title}
              </p>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="job_role">Job role</label>
            <input
              id="job_role"
              name="job_role"
              value={formState.job_role}
              onChange={handleInputChange}
              required
              aria-invalid={formErrors.job_role ? 'true' : 'false'}
              aria-describedby={formErrors.job_role ? 'job-role-error' : undefined}
            />
            {formErrors.job_role ? (
              <p className="field-error" id="job-role-error" data-testid="job-role-error">
                {formErrors.job_role}
              </p>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formState.description}
              onChange={handleInputChange}
              required
              aria-invalid={formErrors.description ? 'true' : 'false'}
              aria-describedby={formErrors.description ? 'description-error' : undefined}
              rows={3}
            />
            {formErrors.description ? (
              <p className="field-error" id="description-error" data-testid="description-error">
                {formErrors.description}
              </p>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="status">Status</label>
            <input
              id="status"
              name="status"
              value={formState.status}
              onChange={handleInputChange}
              required
              aria-invalid={formErrors.status ? 'true' : 'false'}
              aria-describedby={formErrors.status ? 'status-error' : undefined}
            />
            {formErrors.status ? (
              <p className="field-error" id="status-error" data-testid="status-error">
                {formErrors.status}
              </p>
            ) : null}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={submitting}>
              {isEditing ? 'Save changes' : 'Create interview'}
            </button>
            {isEditing ? (
              <button type="button" onClick={handleCancelEdit} disabled={submitting}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  )
}

export default InterviewsPage
