import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { padId } from "@/lib/coords";
import { cn } from "@/lib/utils";
import { useRankedCandidates } from "@/data/hooks";
import { useUi, type ClassFilter } from "@/store/useUi";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const classColor = (cls: "moving" | "variable") =>
  cls === "moving" ? "#F2B544" : "#A596FF";

export function CandidateQueue() {
  const [collapsed, setCollapsed] = useState(false);

  const { ranked, visible, isLoading, isError } = useRankedCandidates();

  const selectedId = useUi((s) => s.selectedId);
  const select = useUi((s) => s.select);
  const classFilter = useUi((s) => s.classFilter);
  const setClassFilter = useUi((s) => s.setClassFilter);
  const hideKnown = useUi((s) => s.hideKnown);
  const setHideKnown = useUi((s) => s.setHideKnown);
  const bandRange = useUi((s) => s.bandRange);

  const counts = {
    all: ranked.length,
    moving: ranked.filter((c) => c.cls === "moving").length,
    variable: ranked.filter((c) => c.cls === "variable").length,
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-line bg-bar transition-all duration-200",
        collapsed ? "w-14" : "w-80",
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-line p-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
         <div className="flex items-baseline justify-between px-1">
            <h2 className="m-0 text-lg font-semibold text-white">
              Candidate queue
            </h2>

            <span className="font-mono text-xs text-haze">
              ranked by score S
            </span>
          </div>
          
        )}

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={
            collapsed
              ? "Expand candidate queue"
              : "Collapse candidate queue"
          }
          aria-expanded={!collapsed}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-white transition-colors hover:bg-panel-2"
        >
          {collapsed ? (
            <ChevronRight className="size-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="m-0 text-lg font-semibold text-white">
              Candidate queue
            </h2>

            <span className="font-mono text-xs text-haze">
              ranked by score S
            </span>
          </div>

          <Tabs
            value={classFilter}
            onValueChange={(value) =>
              setClassFilter(value as ClassFilter)
            }
            className="px-1"
          >
            <TabsList aria-label="Filter by class">
              <TabsTrigger value="all">
                All {counts.all}
              </TabsTrigger>

              <TabsTrigger value="moving">
                Moving {counts.moving}
              </TabsTrigger>

              <TabsTrigger value="variable">
                Variable {counts.variable}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <label className="flex items-center justify-between gap-3 px-1 text-[13px] text-mist">
            Hide known objects

            <Switch
              checked={hideKnown}
              onCheckedChange={setHideKnown}
              aria-label="Hide known objects"
            />
          </label>

          {isLoading && (
            <div className="px-1 text-sm text-haze">
              Loading candidates…
            </div>
          )}

          {isError && (
            <div role="alert" className="px-1 text-sm text-amber">
              Could not load candidates.
            </div>
          )}

          <ol
            className="m-0 flex list-none flex-col gap-2 p-0"
            aria-label="Ranked candidates"
          >
            {visible.slice(0, 7).map((candidate) => {
              const selected = candidate.id === selectedId;

              const inBand =
                bandRange &&
                candidate.flaggedBands &&
                candidate.flaggedBands[0] <= bandRange[1] &&
                candidate.flaggedBands[1] >= bandRange[0];

              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => select(candidate.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 border px-3.5 py-3 text-left text-inherit transition-colors",
                      selected
                        ? "border-[#3b4c78] bg-[#17203a]"
                        : "border-[#1b2438] bg-transparent hover:bg-panel",
                    )}
                  >
                    <span className="w-4 font-mono text-xs text-haze">
                      {candidate.rank}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-white">
                          #{padId(candidate.id)}
                        </span>

                        <span
                          className="text-xs"
                          style={{
                            color: classColor(candidate.cls),
                          }}
                        >
                          {candidate.cls === "moving"
                            ? "Moving"
                            : "Variable"}
                        </span>

                        {candidate.knownMatch && (
                          <Badge
                            tone="quiet"
                            className="px-2 py-0.5 text-[11px]"
                          >
                            Known object
                          </Badge>
                        )}

                        {inBand && (
                          <Badge
                            tone="violet"
                            className="px-2 py-0.5 text-[11px]"
                          >
                            In band range
                          </Badge>
                        )}
                      </span>

                      <span className="block h-1 rounded-sm bg-line">
                        <span
                          className="block h-1 rounded-sm bg-white"
                          style={{
                            width: `${Math.round(
                              candidate.score * 100,
                            )}%`,
                          }}
                        />
                      </span>
                    </span>

                    <span className="font-mono text-sm font-medium text-white">
                      {candidate.score.toFixed(2)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {!isLoading && visible.length === 0 && (
            <div className="px-1 text-sm text-haze">
              No candidates match these filters.
            </div>
          )}

          <Link
            to="/candidates"
            className="px-1 py-2 text-[13px] text-white no-underline hover:underline"
          >
            View all {visible.length} candidates and adjust the weights
          </Link>
        </div>
      )}
    </aside>
  );
}