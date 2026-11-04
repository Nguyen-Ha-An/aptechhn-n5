import './styles/app.css';
import { StrictMode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHashHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { routeTree } from './routeTree.gen';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function ThemedToaster() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (document.documentElement.dataset.theme as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = document.documentElement.dataset.theme as 'light' | 'dark';
      if (current && (current === 'light' || current === 'dark')) {
        setTheme(current);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return <Toaster position="bottom-right" theme={theme} />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ThemedToaster />
    </QueryClientProvider>
  );
}

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
