import type { ReactNode } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { pageTransition } from '@/lib/motion';
import { formatDec, formatGalactic, formatRa } from '@/lib/coords';
import { useCapabilities, useField } from '@/data/hooks';
import { usingMockApi } from '@/data/api';
import { useSearchPreservingPath, useUrlState } from '@/state/urlState';
import { useUi } from '@/store/useUi';
import { ModeBanner } from '@/components/common/ModeBanner';
import { FieldEntry } from '@/components/explorer/FieldEntry';
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';
import { AssistantPanel } from '@/components/assistant/AssistantPanel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative px-3 py-2 text-[13px] no-underline transition-colors',
    isActive ? 'font-semibold text-ink' : 'text-haze hover:text-ink',
  );

function NavItem({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  const preserve = useSearchPreservingPath();
  return (
    <NavLink to={preserve(to)} end={end} className={navClass}>
      {({ isActive }) => (
        <>
          {children}
          {isActive && (
            <motion.span
              aria-hidden="true"
              layoutId="nav-underline"
              className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-amber"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export function AppShell() {
  const { values, update } = useUrlState();
  const { data: fieldEnvelope } = useField(values.f);
  const { data: capabilities } = useCapabilities();
  // Mock mode has no chat transport, so a dead control is never shown even if
  // the bundled capability snapshot says the assistant is on.
  const assistantEnabled =
    !usingMockApi && Boolean(capabilities?.data.assistant.enabled);
  const frameSystem = values.sys;
  const cursor = useUi((state) => state.cursor);
  const fieldEntryOpen = useUi((state) => state.fieldEntryOpen);
  const setFieldEntryOpen = useUi((state) => state.setFieldEntryOpen);
  const location = useLocation();
  const outlet = useOutlet();
  const field = fieldEnvelope?.data;

  const readout = cursor
    ? frameSystem === 'eq'
      ? `RA ${formatRa(cursor.ra)} · Dec ${formatDec(cursor.dec)}`
      : formatGalactic(cursor)
    : field
      ? frameSystem === 'eq'
        ? `RA ${formatRa(field.grid.ra)} · Dec ${formatDec(field.grid.dec)}`
        : formatGalactic({ ra: field.grid.ra, dec: field.grid.dec })
      : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-field text-ink">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-field px-4 py-2.5 sm:px-6"
      >
        <NavLink to="/" className="flex items-center gap-2.5 text-ink no-underline" aria-label="ORBITALIS home">
          <span aria-hidden="true" className="relative size-5 rounded-full border-[1.5px] border-white">
            <span className="absolute -top-1 right-px size-[6px] rounded-full bg-amber" />
          </span>
          <span className="text-[14px] font-semibold tracking-[0.24em]">ORBITALIS</span>
        </NavLink>

        <nav className="flex flex-wrap gap-0.5" aria-label="Main">
          <NavItem to="/explorer" end>
            Explorer
          </NavItem>
          <NavItem to="/candidates">Candidates</NavItem>
          <NavItem to="/methods">Methods and limits</NavItem>
        </nav>

        <div className="min-w-0 flex-1" />

        {field && (
          <button
            type="button"
            onClick={() => setFieldEntryOpen(true)}
            className="flex max-w-full cursor-pointer items-center gap-2 rounded-lg border border-line-2 bg-panel px-2.5 py-1.5 text-left text-[11px] text-mist transition-colors hover:border-amber/60"
            data-testid="field-chip"
            aria-label="Current field. Open field entry."
          >
            <span className="truncate">
              {formatRa(field.grid.ra)} · {formatDec(field.grid.dec)} · r {field.params.radius_deg}° ·{' '}
              {field.params.release.toUpperCase()}
            </span>
            <span className="shrink-0 text-[10px] text-haze">Change</span>
          </button>
        )}

        {readout && (
          <div className="hidden font-mono text-[11px] text-mist lg:block" data-testid="coord-readout">
            {readout}
          </div>
        )}

        <div
          className="relative flex overflow-hidden rounded-lg border border-line-2 bg-panel"
          role="group"
          aria-label="Coordinate frame"
        >
          <Button
            variant="segment"
            size="sm"
            data-active={frameSystem === 'eq'}
            aria-pressed={frameSystem === 'eq'}
            onClick={() => update({ sys: 'eq' })}
          >
            Equatorial
          </Button>
          <Button
            variant="segment"
            size="sm"
            data-active={frameSystem === 'gal'}
            aria-pressed={frameSystem === 'gal'}
            onClick={() => update({ sys: 'gal' })}
          >
            Galactic
          </Button>
        </div>
      </motion.header>

      <ModeBanner />

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-field">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageTransition}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-0 flex-1 flex-col"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>

        {assistantEnabled && <AssistantPanel />}
      </div>

      {assistantEnabled && <AssistantLauncher />}

      {fieldEntryOpen && <FieldEntry variant="dialog" />}
    </div>
  );
}
