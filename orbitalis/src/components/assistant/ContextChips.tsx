import { Clock3, Database, ScanSearch, X } from 'lucide-react';
import type { AssistantContextItem } from '@/data/assistant';

const icons = {
  field: Database,
  candidate: ScanSearch,
  frame: Clock3,
} as const;

export function ContextChips({
  items,
  onRemove,
}: {
  items: AssistantContextItem[];
  onRemove: (item: AssistantContextItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Assistant context"
    >
      <span className="text-[9px] tracking-[0.12em] text-haze uppercase">
        Using
      </span>

      {items.map((item) => {
        const Icon = icons[item.kind];
        return (
          <span
            key={`${item.kind}:${item.id}`}
            className="inline-flex items-center gap-1 border border-line bg-canvas px-1.5 py-0.5 text-[9px] text-mist"
          >
            <Icon className="size-2.5 shrink-0 text-haze" aria-hidden="true" />

            <span className="max-w-[140px] truncate">{item.label}</span>

            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item.label} from context`}
              className="grid size-3.5 shrink-0 cursor-pointer place-items-center text-haze transition-colors hover:text-ink"
            >
              <X className="size-2.5" aria-hidden="true" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
