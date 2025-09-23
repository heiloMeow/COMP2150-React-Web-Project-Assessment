import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { MemoryRouterProps } from 'react-router-dom'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import QuestionsPage from '../QuestionsPage'
import * as api from '../../../lib/api'

vi.mock('../../../lib/api', () => ({
  listInterviews: vi.fn(),
  listQuestions: vi.fn(),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
}))

const mockedApi = vi.mocked(api)

function renderQuestionsRoute(initialEntries: MemoryRouterProps['initialEntries'] = ['/questions']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/questions" element={<QuestionsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const defaultInterviews = [
  { id: 1, title: 'Frontend Screen', job_role: 'FE', description: '', status: 'Draft', username: 'test', created_at: '2024-01-01' },
  { id: 2, title: 'Backend Interview', job_role: 'BE', description: '', status: 'Published', username: 'test', created_at: '2024-01-02' },
] as const

const sampleQuestion = {
  id: 10,
  interview_id: 1,
  question: 'Explain event loop.',
  difficulty: 'Intermediate' as const,
  username: 'test',
  created_at: '2024-01-03',
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  mockedApi.listInterviews.mockResolvedValue([...defaultInterviews])
  mockedApi.listQuestions.mockResolvedValue([])
  mockedApi.createQuestion.mockResolvedValue(sampleQuestion as any)
  mockedApi.updateQuestion.mockResolvedValue(sampleQuestion as any)
  mockedApi.deleteQuestion.mockResolvedValue(null as any)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('QuestionsPage', () => {
  it('loads questions filtered by the selected interview id', async () => {
    renderQuestionsRoute()

    await waitFor(() => expect(mockedApi.listQuestions).toHaveBeenCalled())

    const filterSelect = screen.getByLabelText(/filter by interview/i)
    fireEvent.change(filterSelect, { target: { value: '2' } })

    await waitFor(() =>
      expect(mockedApi.listQuestions).toHaveBeenLastCalledWith(
        expect.objectContaining({ interview_id: 'eq.2', offset: 0, limit: 5, order: 'id.desc' }),
      ),
    )
  })

  it('submits a new question and refreshes the list', async () => {
    renderQuestionsRoute()

    await waitFor(() => expect(mockedApi.listQuestions).toHaveBeenCalledTimes(1))

    screen.getAllByLabelText('Question').forEach((input) =>
      fireEvent.change(input, { target: { value: 'What is React?' } }),
    )

    screen.getAllByLabelText('Difficulty').forEach((select) =>
      fireEvent.change(select, { target: { value: 'Advanced' } }),
    )

    screen
      .getAllByLabelText('Interview', {
        selector: 'select#interview-id',
      })
      .forEach((select) => fireEvent.change(select, { target: { value: '1' } }))

    const submitButton = screen.getAllByRole('button', { name: /create question/i })[0]
    fireEvent.click(submitButton)

    await waitFor(() => expect(mockedApi.createQuestion).toHaveBeenCalledWith({
      question: 'What is React?',
      difficulty: 'Advanced',
      interview_id: 1,
    }))

    await waitFor(() => expect(mockedApi.listQuestions).toHaveBeenCalledTimes(2))
  })

  it('updates an existing question', async () => {
    mockedApi.listQuestions.mockResolvedValueOnce([sampleQuestion as any])
    mockedApi.listQuestions.mockResolvedValueOnce([sampleQuestion as any])

    renderQuestionsRoute()

    await waitFor(() => screen.getByText(sampleQuestion.question))

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[editButtons.length - 1])

    const saveButtons = await screen.findAllByRole('button', { name: /save changes/i })
    const saveButton = saveButtons[saveButtons.length - 1]
    screen
      .getAllByLabelText('Question')
      .forEach((input) => fireEvent.change(input, { target: { value: 'Explain the JS event loop.' } }))

    fireEvent.click(saveButton)

    await waitFor(() => expect(mockedApi.updateQuestion).toHaveBeenCalledTimes(1))

    const call = mockedApi.updateQuestion.mock.calls.at(0)

    expect(call?.[0]).toBe(sampleQuestion.id)
    expect(call?.[1]).toMatchObject({
      difficulty: sampleQuestion.difficulty,
      interview_id: sampleQuestion.interview_id,
    })

    await waitFor(() => expect(mockedApi.listQuestions).toHaveBeenCalledTimes(2))
  })

  it('deletes a question after confirmation', async () => {
    mockedApi.listQuestions.mockResolvedValueOnce([sampleQuestion as any])
    mockedApi.listQuestions.mockResolvedValueOnce([])

    renderQuestionsRoute()

    await waitFor(() => screen.getByText(sampleQuestion.question))

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[deleteButtons.length - 1])

    await waitFor(() => expect(mockedApi.deleteQuestion).toHaveBeenCalledTimes(1))
    expect(mockedApi.deleteQuestion.mock.calls[0][0]).toBe(sampleQuestion.id)
    await waitFor(() => expect(mockedApi.listQuestions).toHaveBeenCalledTimes(2))
  })

  it('applies search and pagination parameters', async () => {
    const pagedQuestions = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      interview_id: 1,
      question: `Question ${index + 1}`,
      difficulty: 'Easy',
      username: 'tester',
      created_at: '2025-01-01T00:00:00Z',
    }))

    mockedApi.listQuestions.mockResolvedValueOnce(pagedQuestions as any)
    mockedApi.listQuestions.mockResolvedValueOnce(pagedQuestions as any)
    mockedApi.listQuestions.mockResolvedValue([])

    renderQuestionsRoute()

    await waitFor(() => expect(mockedApi.listQuestions).toHaveBeenCalledTimes(1))

    const searchInput = screen.getAllByPlaceholderText(/search questions/i)[0]
    fireEvent.change(searchInput, { target: { value: 'loop' } })

    const searchButton = screen.getAllByRole('button', { name: /search/i })[0]
    fireEvent.click(searchButton)

    await waitFor(() =>
      expect(mockedApi.listQuestions).toHaveBeenLastCalledWith(
        expect.objectContaining({ question: 'ilike.*loop*', offset: 0 }),
      ),
    )

    const nextButton = screen.getAllByRole('button', { name: /next/i })[0]
    fireEvent.click(nextButton)

    await waitFor(() =>
      expect(mockedApi.listQuestions).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 5 }),
      ),
    )
  })

  it('blocks submission when required fields are missing', async () => {
    renderQuestionsRoute()

    await waitFor(() => expect(mockedApi.listQuestions).toHaveBeenCalledTimes(1))

    screen
      .getAllByLabelText('Question')
      .forEach((input) => fireEvent.change(input, { target: { value: ' ' } }))

    screen
      .getAllByLabelText('Interview', {
        selector: 'select#interview-id',
      })
      .forEach((select) => fireEvent.change(select, { target: { value: '' } }))

    const submitButton = screen.getAllByRole('button', { name: /create question/i })[0]
    fireEvent.click(submitButton)

    expect(mockedApi.createQuestion).not.toHaveBeenCalled()
    expect(screen.getByText('Question prompt is required.')).toBeTruthy()
    expect(screen.getByText('Select an interview.')).toBeTruthy()
  })

  it('renders an error state and retries loading', async () => {
    mockedApi.listQuestions.mockRejectedValueOnce(new Error('Network error'))
    mockedApi.listQuestions.mockResolvedValueOnce([])

    renderQuestionsRoute()

    await waitFor(() => screen.getByRole('alert'))
    const errorMessage = screen.getByText(/network error/i)
    expect(errorMessage).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => expect(mockedApi.listQuestions).toHaveBeenCalledTimes(2))
  })
})
