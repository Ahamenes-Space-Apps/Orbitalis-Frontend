import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { formatArcsec, formatSigned, padId } from '@/lib/coords';
import { useRankedCandidates } from '@/data/hooks';
import { useUi } from '@/store/useUi';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { classColor } from './CandidateQueue';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] tracking-wide text-haze">{label}</div>
      <div className="mt-1 font-mono text-[15px]">{value}</div>
    </div>
  );
}

export function SelectedSummary() {
  const { ranked } = useRankedCandidates({ applyFilters: false });
  const selectedId = useUi((s) => s.selectedId);
  const c = ranked.find((x) => x.id === selectedId);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!c ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="rounded-2xl border border-line bg-panel-2 p-4 text-sm text-haze"
        >
          Select a candidate in the list or on the sky to see its summary.
        </motion.div>
      ) : (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-panel-2 p-4"
          data-testid="selected-summary"
        >
          <div className="flex items-baseline justify-between">
            <div className="text-[17px] font-semibold">Candidate #{padId(c.id)}</div>
            <div className="text-xs" style={{ color: classColor(c.cls) }}>
              {c.cls === 'moving' ? 'Moving' : 'Variable'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Fact label="DISPLACEMENT" value={formatArcsec(c.displacementArcsec)} />
            <Fact label="FLUX Δ" value={formatSigned(c.fluxChangePct)} />
            <Fact
              label="MOTION CONF."
              value={
                c.motionConfidence === null
                  ? 'n/a'
                  : `${Math.round(c.motionConfidence * 100)}%`
              }
            />
          </div>
          <p className="m-0 text-xs leading-normal text-mist">
            A candidate warrants follow-up observation. It is not a confirmed detection.
          </p>
          <Link
            to={`/candidates/${c.id}`}
            className={cn(
              buttonVariants(),
              'bg-white text-black no-underline hover:text-[#1a1204]',
            )}
          >
            Open dossier
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
