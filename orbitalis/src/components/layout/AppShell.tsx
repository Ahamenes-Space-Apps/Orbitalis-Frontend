import { NavLink, Outlet } from 'react-router-dom';
import { formatDec, formatGalactic, formatRa } from '@/lib/coords';
import { useField } from '@/data/hooks';
import { usingMockApi } from '@/data/api';
import { useUi } from '@/store/useUi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'border-b-2 px-3.5 py-2.5 text-sm  text-white no-underline transition-colors',
    isActive
      ? 'border-ink text-ink font-semibold'
      : 'border-transparent text-haze hover:text-ink',
  );

export function AppShell() {
  const { data: field } = useField();
  const frame = useUi((s) => s.frame);
  const setFrame = useUi((s) => s.setFrame);

  return (
    <div className="flex min-h-full flex-col bg-field text-ink">
      <header className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-line bg-field px-6 py-3">
        <NavLink
          to="/"
          className="flex items-center gap-3 text-ink no-underline"
          aria-label="ORBITALIS home"
        >
          <span
            aria-hidden="true"
            className="relative size-6 rounded-full border-[1.5px] border-white"
          >
            <span className="absolute -top-1 right-px size-[7px] rounded-full bg-amber" />
          </span>

          <span className="text-[15px] font-semibold tracking-[0.26em]">
            ORBITALIS
          </span>
        </NavLink>

        <nav className="flex flex-wrap gap-1" aria-label="Main">
          <NavLink to="/" end className={navClass}>
            Explorer
          </NavLink>

          <NavLink to="/candidates" className={navClass}>
            Candidates
          </NavLink>

          <NavLink to="/methods" className={navClass}>
            Methods and limits
          </NavLink>
        </nav>

        <div className="min-w-0 flex-1" />

        {field && (
          <div
            className="flex items-center gap-2  border border-line-2 bg-panel px-3 py-1.5 text-xs text-mist"
            data-testid="field-badge"
          >
           

            <span>
              {field.synthetic
                ? `${field.name} · ground truth known`
                : field.name}
            </span>

            {usingMockApi && (
              <span className="text-slate">· mock API</span>
            )}
          </div>
        )}

        {field && (
          <div
            className="font-mono text-xs text-mist"
            data-testid="coord-readout"
          >
            {frame === 'equatorial'
              ? `RA ${formatRa(field.center.ra)} · Dec ${formatDec(
                  field.center.dec,
                )}`
              : formatGalactic(field.center)}
          </div>
        )}

        <div
          className="flex overflow-hidden rounded-[10px] border border-line-2 bg-panel"
          role="group"
          aria-label="Coordinate frame"
        >
          <Button
            variant="segment"
            data-active={frame === 'equatorial'}
            aria-pressed={frame === 'equatorial'}
            onClick={() => setFrame('equatorial')}
          >
            Equatorial
          </Button>

          <Button
            variant="segment"
            data-active={frame === 'galactic'}
            aria-pressed={frame === 'galactic'}
            onClick={() => setFrame('galactic')}
          >
            Galactic
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 bg-field">
        <Outlet />
      </main>
    </div>
  );
}