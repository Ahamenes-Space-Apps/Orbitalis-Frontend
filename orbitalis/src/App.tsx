import { useLayoutEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppShell } from '@/components/layout/AppShell';
import { UrlStateProvider } from '@/state/urlState';
import { ExplorerPage } from '@/pages/ExplorerPage';
import { CandidatesPage } from '@/pages/CandidatesPage';
import { DossierPage } from '@/pages/DossierPage';
import { MethodsPage } from '@/pages/MethodsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { LandingPage } from '@/pages/LandingPage';

declare global {
  interface Window {
    __stopOrbitalsLanding?: () => void;
  }
}

function useLandingDocumentMode() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const landing = pathname === '/';
    const hasLandingDom = Boolean(document.getElementById('orbitals-root'));
    if (landing) {
      if (
        document.documentElement.classList.contains('app-mode') &&
        hasLandingDom &&
        !window.location.search
      ) {
        window.location.assign('/');
        return;
      }
      if (window.location.search) return;
      document.documentElement.classList.add('orbitals-mode');
      document.documentElement.classList.remove('app-mode');
      return;
    }

    window.__stopOrbitalsLanding?.();
    document.documentElement.classList.add('app-mode');
    document.documentElement.classList.remove('orbitals-mode');
    document.body.classList.remove('loading');
  }, [pathname]);
}

export function App() {
  useLandingDocumentMode();
  return (
    <MotionConfig reducedMotion="user">
      <UrlStateProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppShell />}>
            <Route path="explorer" element={<ExplorerPage />} />
            <Route path="candidates" element={<CandidatesPage />} />
            <Route path="candidates/:id" element={<DossierPage />} />
            <Route path="methods" element={<MethodsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </UrlStateProvider>
    </MotionConfig>
  );
}
