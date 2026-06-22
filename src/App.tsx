import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider, useApp } from './app/context'
import { Layout } from './components/Layout'
import { SchedulePage } from './pages/SchedulePage'
import { ChildrenPage } from './pages/ChildrenPage'
import { SourcesPage } from './pages/SourcesPage'
import { SettingsPage } from './pages/SettingsPage'
import {
  LocalSetupPage,
  LoginPage,
  HouseholdSetupPage,
} from './pages/Onboarding'

const qc = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function AppRoutes() {
  const { status } = useApp()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    )
  }

  if (status === 'needs-local-setup') return <LocalSetupPage />
  if (status === 'needs-auth') return <LoginPage />
  if (status === 'needs-household') return <HouseholdSetupPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SchedulePage />} />
        <Route path="children" element={<ChildrenPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
