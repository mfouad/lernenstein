import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { useIsMobile } from './hooks/useIsMobile.ts';
import { isLocal, useRoute } from './lib/route.ts';
import './index.css';

const LibraryPage = lazy(() => import('./components/LibraryPage.tsx'));
const Studio = lazy(() => import('./studio/Studio.tsx'));

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

function Root() {
  const route = useRoute();
  const mobile = useIsMobile(); // phones have the library in the app's own tab bar
  if (route.page === 'studio' && isLocal) return <Suspense fallback={null}><Studio slug={route.slug} /></Suspense>;
  if (route.page === 'library' && !mobile) return <Suspense fallback={null}><LibraryPage /></Suspense>;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </StrictMode>,
);
