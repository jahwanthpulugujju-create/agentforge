import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './components/layout/root-layout'
import { ErrorBoundary, RouteErrorFallback } from './components/error-boundary'
import { RequireAuth } from './components/require-auth'
import { HomePage } from './features/home/home-page'
import { SessionsPage } from './features/sessions/sessions-page'
import { SessionDetailPage } from './features/sessions/session-detail-page'
import { CommandsPage } from './features/commands/commands-page'
import { ReviewersPage } from './features/reviewers/reviewers-page'
import { MapRunPage } from './features/map/map-run-page'
import { RoundPage } from './features/reviews/round-page'
import { ReviewerDetailPage } from './features/reviews/reviewer-detail-page'
import { ReviewsPage } from './features/reviews/reviews-page'
import { LoginPage } from './features/auth/login-page'
import { RegisterPage } from './features/auth/register-page'
import { ApiKeysPage } from './features/settings/api-keys-page'
import { SettingsPage } from './features/settings/settings-page'
import { ReviewJobsPage } from './features/jobs/review-jobs-page'

function NotFoundPage() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-zinc-900 dark:text-zinc-100">404</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Page not found.</p>
      </div>
    </div>
  )
}

function withErrorBoundary(element: React.ReactNode) {
  return <ErrorBoundary>{element}</ErrorBoundary>
}

function protected_(element: React.ReactNode) {
  return <RequireAuth>{withErrorBoundary(element)}</RequireAuth>
}

export const router = createBrowserRouter([
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterPage /> },
  {
    element: <RootLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: withErrorBoundary(<HomePage />) },
      { path: 'sessions', element: withErrorBoundary(<SessionsPage />), errorElement: <RouteErrorFallback /> },
      { path: 'sessions/:id', element: withErrorBoundary(<SessionDetailPage />), errorElement: <RouteErrorFallback /> },
      { path: 'sessions/:id/reviews/:round', element: withErrorBoundary(<RoundPage />), errorElement: <RouteErrorFallback /> },
      {
        path: 'sessions/:id/reviews/:round/reviewers/:reviewerId',
        element: withErrorBoundary(<ReviewerDetailPage />),
        errorElement: <RouteErrorFallback />,
      },
      { path: 'sessions/:id/maps/:run', element: withErrorBoundary(<MapRunPage />), errorElement: <RouteErrorFallback /> },
      { path: 'reviews', element: withErrorBoundary(<ReviewsPage />), errorElement: <RouteErrorFallback /> },
      { path: 'commands', element: withErrorBoundary(<CommandsPage />), errorElement: <RouteErrorFallback /> },
      { path: 'reviewers', element: withErrorBoundary(<ReviewersPage />), errorElement: <RouteErrorFallback /> },
      { path: 'jobs', element: protected_(<ReviewJobsPage />) },
      { path: 'settings', element: withErrorBoundary(<SettingsPage />) },
      { path: 'settings/api-keys', element: protected_(<ApiKeysPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
