import { Clock3, Database, ScanSearch, X } from 'lucide-react';
import type { AssistantContextItem } from '@/store/useAssistant';

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
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Assistant context">
      <span className="text-[10px] tracking-widest text-haze uppercase">Using</span>

      {items.map((item) => {
        const Icon = icons[item.kind];
        return (
          <span
            key={`${item.kind}:${item.id}`}
            className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-panel px-2 py-1 text-[11px] text-mist"
          >
            <Icon className="size-3 shrink-0 text-haze" aria-hidden="true" />

            <span className="max-w-[180px] truncate">{item.label}</span>

            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item.label} from context`}
              className="grid size-4 shrink-0 cursor-pointer place-items-center rounded-full text-haze transition-colors hover:bg-panel-2 hover:text-ink"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
