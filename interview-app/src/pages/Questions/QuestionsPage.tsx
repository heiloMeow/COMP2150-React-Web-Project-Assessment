import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  createQuestion,
  deleteQuestion,
  listInterviews,
  listQuestions,
  updateQuestion,
} from '../../lib/api'
import type { Interview, Question } from '../../types'

const DIFFICULTY_OPTIONS: readonly Question['difficulty'][] = [
  'Easy',
  'Intermediate',
  'Advanced',
]

export interface QuestionFormState {
  question: string
  difficulty: Question['difficulty']
  interview_id: number | ''
}

export type QuestionFormErrors = Partial<Record<keyof QuestionFormState, string>>

export interface QuestionSearchOptions {
  interviewId: number | null
  order: 'id.asc' | 'id.desc'
  page: number
  pageSize: number
  searchText: string
}

export function buildQuestionSearchParams(options: QuestionSearchOptions) {
  const search: Record<string, string | number | boolean> = {
    order: options.order,
    limit: options.pageSize,
    offset: options.page * options.pageSize,
  }

  if (options.interviewId !== null) {
    search.interview_id = `eq.${options.interviewId}`
  }

  const trimmedSearch = options.searchText.trim()
  if (trimmedSearch) {
    search.question = `ilike.*${trimmedSearch}*`
  }

  return search
}

export function validateQuestionForm(state: QuestionFormState): QuestionFormErrors {
  const errors: QuestionFormErrors = {}

  if (!state.question.trim()) {
    errors.question = 'Question prompt is required.'
  }

  if (!DIFFICULTY_OPTIONS.includes(state.difficulty)) {
    errors.difficulty = 'Select a difficulty level.'
  }

  if (state.interview_id === '' || Number.isNaN(Number(state.interview_id))) {
    errors.interview_id = 'Select an interview.'
  }

  return errors
}

function getInitialInterviewId(
  locationInterviewId: number | undefined,
  searchParams: URLSearchParams,
): number | null {
  if (typeof locationInterviewId === 'number' && Number.isFinite(locationInterviewId)) {
    return locationInterviewId
  }

  const fromQuery = Number.parseInt(searchParams.get('interview_id') ?? '', 10)
  return Number.isNaN(fromQuery) ? null : fromQuery
}

function QuestionsPage() {
  const location = useLocation()
  const locationState = location.state as { interviewId?: number } | null
  const locationInterviewId = locationState?.interviewId
  const [searchParams, setSearchParams] = useSearchParams()

  const [selectedInterviewId, setSelectedInterviewId] = useState<number | null>(() =>
    getInitialInterviewId(locationInterviewId, searchParams),
  )
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const [order, setOrder] = useState<'id.asc' | 'id.desc'>('id.desc')
  const [searchInput, setSearchInput] = useState('')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [formState, setFormState] = useState<QuestionFormState>({
    question: '',
    difficulty: 'Easy',
    interview_id: getInitialInterviewId(locationInterviewId, searchParams) ?? '',
  })
  const [formErrors, setFormErrors] = useState<QuestionFormErrors>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isEditing = editingId !== null

  useEffect(() => {
    if (typeof locationInterviewId === 'number' && Number.isFinite(locationInterviewId)) {
      setSelectedInterviewId(locationInterviewId)
      setFormState((prev) => ({
        ...prev,
        interview_id: locationInterviewId,
      }))
      setPage(0)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('interview_id', String(locationInterviewId))
        return next
      })
    }
    // We intentionally skip searchParams from the deps to avoid infinite loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationInterviewId, setSearchParams])

  const interviewLookup = useMemo(() => {
    return new Map(interviews.map((interview) => [interview.id, interview.title]))
  }, [interviews])

  const paginationLabel = useMemo(() => {
    const start = page * pageSize + 1
    const end = start + questions.length - 1
    return questions.length > 0 ? `${start}–${end}` : '0'
  }, [page, pageSize, questions.length])

  const loadInterviews = useCallback(async () => {
    try {
      const data = await listInterviews({ order: 'title.asc' })
      if (Array.isArray(data)) {
        setInterviews(data)
      } else {
        throw new Error('Interview list response was not an array.')
      }
    } catch (error) {
      setActionError((prev) =>
        prev ?? (error instanceof Error ? error.message : String(error)),
      )
    }
  }, [])

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    setListError(null)

    try {
      const search = buildQuestionSearchParams({
        interviewId: selectedInterviewId,
        order,
        page,
        pageSize,
        searchText,
      })
      const payload = (await listQuestions(search)) as unknown

      if (!Array.isArray(payload)) {
        const preview =
          typeof payload === 'string' ? payload.slice(0, 120) : JSON.stringify(payload).slice(0, 120)
        throw new Error(
          `Unable to load questions: expected an array response from the API. Received: ${preview}`,
        )
      }

      setQuestions(payload as Question[])
    } catch (error) {
      setListError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }, [order, page, pageSize, searchText, selectedInterviewId])

  useEffect(() => {
    loadInterviews()
  }, [loadInterviews])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    if (!isEditing) {
      setFormState((prev) => ({
        ...prev,
        interview_id: selectedInterviewId ?? '',
      }))
    }
  }, [isEditing, selectedInterviewId])

  const handleInterviewFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    const nextId = value ? Number.parseInt(value, 10) : null

    if (nextId === null) {
      setSelectedInterviewId(null)
    } else if (Number.isNaN(nextId)) {
      setSelectedInterviewId(null)
    } else {
      setSelectedInterviewId(nextId)
    }
    setPage(0)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextId === null || Number.isNaN(nextId)) {
        next.delete('interview_id')
      } else {
        next.set('interview_id', String(nextId))
      }
      return next
    })
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

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(0)
    setSearchText(searchInput.trim())
  }

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value)
  }

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target

    if (name === 'interview_id') {
      const parsed = value ? Number.parseInt(value, 10) : NaN
      setFormState((prev) => ({
        ...prev,
        interview_id: Number.isNaN(parsed) ? '' : parsed,
      }))
      return
    }

    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setFormState({
      question: '',
      difficulty: 'Easy',
      interview_id: selectedInterviewId ?? '',
    })
    setFormErrors({})
    setEditingId(null)
  }

  const handleEdit = (question: Question) => {
    setEditingId(question.id)
    setFormErrors({})
    setFormState({
      question: question.question,
      difficulty: question.difficulty,
      interview_id: question.interview_id,
    })
  }

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Delete this question? This action cannot be undone.')

    if (!confirmed) {
      return
    }

    setSubmitting(true)
    setActionError(null)

    try {
      await deleteQuestion(id)
      if (editingId === id) {
        resetForm()
      }
      await loadQuestions()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    resetForm()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setActionError(null)

    const validation = validateQuestionForm(formState)
    setFormErrors(validation)

    if (Object.keys(validation).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        question: formState.question.trim(),
        difficulty: formState.difficulty,
        interview_id: Number(formState.interview_id),
      }

      if (editingId !== null) {
        await updateQuestion(editingId, payload)
      } else {
        if (page !== 0) {
          setPage(0)
        }
        await createQuestion(payload)
      }

      await loadQuestions()
      resetForm()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const canGoBack = page > 0
  const canGoForward = questions.length === pageSize

  return (
    <section className="page" aria-labelledby="questions-heading">
      <div className="page-header">
        <h1 id="questions-heading">Questions</h1>
        <p className="page-description">
          Filter, review, and manage interview questions linked to each interview.
        </p>
      </div>

      <div className="panel">
        <header className="panel-header">
          <h2>Question library</h2>
          <div className="panel-controls">
            <label>
              Interview
              <select
                aria-label="Filter by interview"
                value={selectedInterviewId ?? ''}
                onChange={handleInterviewFilterChange}
              >
                <option value="">All interviews</option>
                {interviews.map((interview) => (
                  <option key={interview.id} value={interview.id}>
                    {interview.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Order
              <select value={order} onChange={handleOrderChange} aria-label="Order questions">
                <option value="id.desc">Newest first</option>
                <option value="id.asc">Oldest first</option>
              </select>
            </label>
            <label>
              Page size
              <select value={pageSize} onChange={handlePageSizeChange} aria-label="Questions per page">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
            <form className="search-form" role="search" onSubmit={handleSearchSubmit}>
              <label htmlFor="question-search">
                Search questions
              </label>
              <input
                id="question-search"
                name="question-search"
                type="search"
                value={searchInput}
                onChange={handleSearchInputChange}
                placeholder="Search questions"
              />
              <button type="submit">Search</button>
            </form>
          </div>
        </header>

        {listError ? (
          <div className="alert alert-error" role="alert">
            {listError}
            <div>
              <button type="button" onClick={loadQuestions} disabled={loading}>
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {actionError ? (
          <div className="alert alert-error" role="alert">
            {actionError}
          </div>
        ) : null}

        {loading ? (
          <p>Loading questions…</p>
        ) : questions.length === 0 ? (
          <p>No questions found for the current filters.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Question</th>
                  <th scope="col">Difficulty</th>
                  <th scope="col">Interview</th>
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id}>
                    <td>{question.question}</td>
                    <td>{question.difficulty}</td>
                    <td>{interviewLookup.get(question.interview_id) ?? question.interview_id}</td>
                    <td className="table-actions">
                      <button type="button" onClick={() => handleEdit(question)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(question.id)} disabled={submitting}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination-controls" role="group" aria-label="Pagination">
          <button type="button" onClick={() => setPage((prev) => Math.max(prev - 1, 0))} disabled={!canGoBack}>
            Previous
          </button>
          <span className="pagination-range" aria-live="polite">
            Showing {paginationLabel}
          </span>
          <button type="button" onClick={() => setPage((prev) => prev + 1)} disabled={!canGoForward}>
            Next
          </button>
        </div>
      </div>

      <div className="panel">
        <header className="panel-header">
          <h2>{isEditing ? 'Edit question' : 'Create question'}</h2>
        </header>

        <form className="stacked-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="question-text">Question</label>
            <textarea
              id="question-text"
              name="question"
              value={formState.question}
              onChange={handleInputChange}
              required
              aria-invalid={formErrors.question ? 'true' : 'false'}
              aria-describedby={formErrors.question ? 'question-error' : undefined}
            />
            {formErrors.question ? (
              <p className="form-error" id="question-error">
                {formErrors.question}
              </p>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="difficulty">Difficulty</label>
            <select
              id="difficulty"
              name="difficulty"
              value={formState.difficulty}
              onChange={handleInputChange}
              required
              aria-invalid={formErrors.difficulty ? 'true' : 'false'}
              aria-describedby={formErrors.difficulty ? 'difficulty-error' : undefined}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {formErrors.difficulty ? (
              <p className="form-error" id="difficulty-error">
                {formErrors.difficulty}
              </p>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="interview-id">Interview</label>
            <select
              id="interview-id"
              name="interview_id"
              value={formState.interview_id === '' ? '' : String(formState.interview_id)}
              onChange={handleInputChange}
              required
              aria-invalid={formErrors.interview_id ? 'true' : 'false'}
              aria-describedby={formErrors.interview_id ? 'interview-error' : undefined}
            >
              <option value="" disabled>
                Select an interview
              </option>
              {interviews.map((interview) => (
                <option key={interview.id} value={interview.id}>
                  {interview.title}
                </option>
              ))}
            </select>
            {formErrors.interview_id ? (
              <p className="form-error" id="interview-error">
                {formErrors.interview_id}
              </p>
            ) : null}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={submitting}>
              {isEditing ? 'Save changes' : 'Create question'}
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

export default QuestionsPage
