import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCandidate } from '@/data/hooks';
import { ApiError } from '@/data/api';
import { useUi } from '@/store/useUi';
import { padId } from '@/lib/coords';
import { DossierPanel } from '@/components/candidates/DossierPanel';
import { NotFoundPage } from './NotFoundPage';

export function DossierPage() {
  const params = useParams();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;
  const select = useUi((s) => s.select);
  const detail = useCandidate(valid ? id : null);

  useEffect(() => {
    if (valid) select(id);
  }, [id, valid, select]);

  if (!valid) return <NotFoundPage what="candidate" />;

  if (detail.isError) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return notFound ? (
      <NotFoundPage what={`candidate #${padId(id)}`} />
    ) : (
      <div role="alert" className="p-6 text-[11px] text-signal">
        Could not load candidate #{padId(id)}.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-canvas lg:px-4 lg:py-3">
      <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col border-line bg-panel lg:border">
        <DossierPanel candidateId={id} variant="full" />
      </div>
    </div>
  );
}
