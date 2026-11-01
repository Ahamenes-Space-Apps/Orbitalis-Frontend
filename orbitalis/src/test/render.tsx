import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/App';
import { useUi } from '@/store/useUi';

const initial = useUi.getState();

/** Fresh store, fresh query cache, and the built-in sky view (Aladin needs WebGL, which jsdom does not have). */
export function renderApp(path = '/', renderer: 'svg' | 'auto' = 'svg') {
  useUi.setState({ ...initial, renderer }, true);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
