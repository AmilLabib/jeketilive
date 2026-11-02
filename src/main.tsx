import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import Layout from './components/Layout'
import './index.css'
import History from './pages/History'
import Home from './pages/Home'
import MemberDetail from './pages/MemberDetail'
import Members from './pages/Members'
import NotFound from './pages/NotFound'

const router = createBrowserRouter([
  {
    element: <Layout />,
    // Shown while a lazy route loads on first visit (e.g. opening /live/... directly).
    HydrateFallback: () => null,
    children: [
      { path: '/', element: <Home /> },
      // Player pages pull in hls.js, so load them on demand.
      { path: '/live/:platform/:roomId', lazy: async () => ({ Component: (await import('./pages/Watch')).default }) },
      { path: '/multi', lazy: async () => ({ Component: (await import('./pages/Multi')).default }) },
      { path: '/riwayat', element: <History /> },
      { path: '/member', element: <Members /> },
      { path: '/member/:slug', element: <MemberDetail /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
