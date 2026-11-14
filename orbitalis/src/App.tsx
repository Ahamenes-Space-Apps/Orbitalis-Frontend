import { Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppShell } from '@/components/layout/AppShell';
import { UrlStateProvider } from '@/state/urlState';
import { ExplorerPage } from '@/pages/ExplorerPage';
import { CandidatesPage } from '@/pages/CandidatesPage';
import { MethodsPage } from '@/pages/MethodsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <UrlStateProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<ExplorerPage />} />
            <Route path="candidates" element={<CandidatesPage />} />
            <Route path="candidates/:id" element={<Navigate to="/candidates" replace />} />
            <Route path="methods" element={<MethodsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </UrlStateProvider>
    </MotionConfig>
  );
}
