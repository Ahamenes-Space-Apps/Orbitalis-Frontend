import { Navigate } from 'react-router-dom';
import { useUi } from '@/store/useUi';

export function CandidatesPage() {
  const selectedId = useUi((s) => s.selectedId);
  return <Navigate to={`/candidates/${selectedId ?? 42}`} replace />;
}
