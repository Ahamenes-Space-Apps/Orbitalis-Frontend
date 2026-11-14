import { useCandidates, useField, useStationary } from '@/data/hooks';
import { SkyView } from '@/components/sky/SkyView';
import { CandidateQueue } from '@/components/candidates/CandidateQueue';
import { SelectedSummary } from '@/components/candidates/SelectedSummary';
import { useUi } from '@/store/useUi';
import { cn } from '@/lib/utils';

export function ExplorerPage() {
  const field = useField();
  const stationary = useStationary();
  const candidates = useCandidates();
  const collapsed = useUi((s) => s.queueCollapsed);

  const failed = field.isError || stationary.isError || candidates.isError;
  const ready = field.data && stationary.data && candidates.data;

  return (
    <div className="flex min-h-0 flex-1 flex-wrap">
      {/* This element owns the column width. The queue inside it just fills it. */}
      <aside
        className={cn(
          'flex min-w-0 shrink flex-col border-r border-line bg-bar transition-[flex-basis,padding] duration-200',
          collapsed ? 'basis-14 gap-0 p-0' : 'basis-85 gap-4 p-4 pt-5',
        )}
      >
        <CandidateQueue />
        {!collapsed && (
          <div className="mt-auto">
            <SelectedSummary />
          </div>
        )}
      </aside>

      <main className="relative min-h-[780px] min-w-0 flex-[999_1_560px] overflow-hidden" aria-label="Sky explorer">
        {failed && (
          <div role="alert" className="absolute inset-0 grid place-items-center p-8 text-center text-sm text-ink">
            The sky data could not be loaded. If you set VITE_API_URL, check that the backend is running.
          </div>
        )}
        {!failed && !ready && (
          <div role="status" className="absolute inset-0 grid place-items-center text-sm text-haze">
            Loading the sky…
          </div>
        )}
        {ready && <SkyView field={field.data!} stationary={stationary.data!} candidates={candidates.data!} />}
      </main>
    </div>
  );
}