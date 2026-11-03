import type { ReactNode } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { pageTransition } from '@/lib/motion';
import { formatDec, formatGalactic, formatRa } from '@/lib/coords';
import { useField } from '@/data/hooks';
import { usingMockApi } from '@/data/api';
import { useUi } from '@/store/useUi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative px-3.5 py-2.5 text-sm text-white no-underline transition-colors',
    isActive ? 'text-ink font-semibold' : 'text-haze hover:text-ink',
  );

function NavItem({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: ReactNode;
}) {
  return (
    <NavLink to={to} end={end} className={navClass}>
      {({ isActive }) => (
        <>
          {children}
          {isActive && (
            <motion.span
              aria-hidden="true"
              layoutId="nav-underline"
              className="absolute inset-x-2 -bottom-3 h-0.5 rounded-full bg-ink"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export function AppShell() {
  const { data: field } = useField();
  const frame = useUi((s) => s.frame);
  const setFrame = useUi((s) => s.setFrame);
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <div className="flex min-h-full flex-col bg-field text-ink">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-line bg-field px-6 py-3"
      >
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
          <NavItem to="/" end>
            Explorer
          </NavItem>

          <NavItem to="/candidates">Candidates</NavItem>

          <NavItem to="/methods">Methods and limits</NavItem>
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
          className="relative flex overflow-hidden rounded-[10px] border border-line-2 bg-panel"
          role="group"
          aria-label="Coordinate frame"
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-1/2 rounded-[8px] bg-[#1b2540]"
            initial={false}
            animate={{ x: frame === 'equatorial' ? 0 : '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          />
          <Button
            variant="segment"
            className="relative z-10 data-[active=true]:bg-transparent"
            data-active={frame === 'equatorial'}
            aria-pressed={frame === 'equatorial'}
            onClick={() => setFrame('equatorial')}
          >
            Equatorial
          </Button>

          <Button
            variant="segment"
            className="relative z-10 data-[active=true]:bg-transparent"
            data-active={frame === 'galactic'}
            aria-pressed={frame === 'galactic'}
            onClick={() => setFrame('galactic')}
          >
            Galactic
          </Button>
        </div>
      </motion.header>

      <main className="flex min-h-0 flex-1 flex-col bg-field">
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
    </div>
  );
}