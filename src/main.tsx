import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { isLocal, useRoute } from './lib/route.ts';
import './index.css';

const LibraryPage = lazy(() => import('./components/LibraryPage.tsx'));
const Studio = lazy(() => import('./studio/Studio.tsx'));

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

function Root() {
  const route = useRoute();
  if (route.page === 'studio' && isLocal) return <Suspense fallback={null}><Studio slug={route.slug} /></Suspense>;
  if (route.page === 'library') return <Suspense fallback={null}><LibraryPage /></Suspense>;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </StrictMode>,
);
