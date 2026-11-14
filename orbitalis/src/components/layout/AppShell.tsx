import { useEffect } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import { pageTransition } from '@/lib/motion';
import { useUi } from '@/store/useUi';
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';
import { AssistantPanel } from '@/components/assistant/AssistantPanel';
import { cn } from '@/lib/utils';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative px-3.5 py-2.5 text-sm text-ink no-underline transition-colors',
    isActive ? 'text-ink font-semibold' : 'text-haze hover:text-ink',
  );

function WorkspaceTab({
  to,
  label,
  end,
}: {
  to: string;
  label: string;
  end: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex h-[52px] shrink-0 items-center whitespace-nowrap px-3 text-[12px] font-medium tracking-[0.02em] transition-colors',
          isActive ? 'text-ink' : 'text-haze hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {isActive && (
            <motion.span
              layoutId="workspace-tab"
              aria-hidden="true"
              className="absolute inset-x-3 bottom-0 h-px bg-accent"
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export function AppShell() {
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const toggleTheme = useUi((s) => s.toggleTheme);
  const location = useLocation();
  const outlet = useOutlet();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-ink">
      <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
        <NavLink
          to="/"
          className="flex shrink-0 items-center text-[13px] font-semibold tracking-[0.28em] text-ink no-underline"
          aria-label="ORBITALIS home"
        >
         
             <img src="/image.png" alt="" aria-hidden="true" className="size-8 object-contain" />
         

          <span className="text-[15px] font-semibold tracking-[0.26em]">
            ORBITALIS
          </span>
        </NavLink>

        <nav
          className="console-scroll flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-2"
          aria-label="Workspaces"
        >
          {NAV.map((item) => (
            <WorkspaceTab key={item.to} {...item} />
          ))}
        </nav>

        <button
          type="button"
          onClick={toggleTheme}
          onDoubleClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className="grid size-8 shrink-0 cursor-pointer place-items-center border border-line bg-panel-2 text-mist transition-colors hover:border-accent hover:text-ink"
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-1/2 rounded-[8px] bg-panel-2"
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageTransition}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AssistantPanel />
      <AssistantLauncher />
    </div>
  );
}
