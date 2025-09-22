import './App.css'
import {
  NavLink,
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom'
import ApplicantsPage from './pages/ApplicantsPage'
import InterviewsPage from './pages/InterviewsPage'
import QuestionsPage from './pages/QuestionsPage'
import TakeInterviewPage from './pages/TakeInterviewPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/interviews" replace />,
      },
      {
        path: 'interviews',
        element: <InterviewsPage />,
      },
      {
        path: 'questions',
        element: <QuestionsPage />,
      },
      {
        path: 'applicants',
        element: <ApplicantsPage />,
      },
      {
        path: 'take/:applicantId',
        element: <TakeInterviewPage />,
      },
    ],
  },
])

function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">ReadySetHire</div>
        <nav className="app-nav" aria-label="Main navigation">
          <NavLink className={({ isActive }) => navClassName(isActive)} to="/interviews">
            Interviews
          </NavLink>
          <NavLink className={({ isActive }) => navClassName(isActive)} to="/questions">
            Questions
          </NavLink>
          <NavLink className={({ isActive }) => navClassName(isActive)} to="/applicants">
            Applicants
          </NavLink>
          <NavLink className={({ isActive }) => navClassName(isActive)} to="/take/demo">
            Take Interview
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <small>ReadySetHire prototype &copy; {new Date().getFullYear()}</small>
      </footer>
    </div>
  )
}

function navClassName(isActive: boolean) {
  return isActive ? 'nav-link nav-link-active' : 'nav-link'
}

function App() {
  return <RouterProvider router={router} />
}

export default App
