import { Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppShell } from '@/components/layout/AppShell';
import { ExplorerPage } from '@/pages/ExplorerPage';
import { SpectralPage } from '@/pages/SpectralPage';
import { CandidatesPage } from '@/pages/CandidatesPage';
import { DossierPage } from '@/pages/DossierPage';
import { ArchitecturePage } from '@/pages/ArchitecturePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<ExplorerPage />} />
          <Route path="spectral" element={<SpectralPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="candidates/:id" element={<DossierPage />} />
          <Route path="architecture" element={<ArchitecturePage />} />
          <Route path="methods" element={<Navigate to="/architecture" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </MotionConfig>
  );
}
