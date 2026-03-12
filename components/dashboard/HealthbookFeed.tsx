"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import {
  countHealthbookItemsWithinHours,
  formatHealthbookAbsoluteTimestamp,
  formatHealthbookRelativeTimestamp,
  getHealthbookPublishedDate,
  HEALTHBOOK_CATEGORIES,
  HEALTHBOOK_SOURCE_TYPES,
  type HealthbookCategory,
  type HealthbookFeedItem,
  type HealthbookSourceType,
} from "@/lib/healthbook";
import { cn } from "@/lib/utils";

type HealthbookFeedProps = {
  items: HealthbookFeedItem[];
  initialNow: number;
};

type FilterGroupProps = {
  label: string;
  options: readonly string[];
  activeOption: string;
  onSelect: (option: string) => void;
};

type FeedRowProps = {
  item: HealthbookFeedItem;
  isExpanded: boolean;
  now: number;
  onToggle: () => void;
};

const signalStyles: Record<HealthbookFeedItem["signal"], string> = {
  Lead: "border-primary/25 bg-primary/10 text-primary",
  High: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700",
  Watch: "border-border bg-muted text-muted-foreground",
};

function getLatestPublishedAt(items: HealthbookFeedItem[]) {
  return items.reduce((latest, item) => {
    const timestamp = getHealthbookPublishedDate(item.publishedAt).getTime();
    return timestamp > latest ? timestamp : latest;
  }, 0);
}

function FilterGroup({ label, options, activeOption, onSelect }: FilterGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map((option) => {
          const isActive = option === activeOption;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={isActive}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-foreground",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FeedRow({ item, isExpanded, now, onToggle }: FeedRowProps) {
  return (
    <article className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full text-left transition-colors hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="grid gap-4 px-4 py-4 md:grid-cols-[88px_180px_minmax(0,1fr)_112px]">
          <div className="flex items-start justify-between gap-3 md:block">
            <div>
              <p className="text-lg font-semibold tracking-tight tabular-nums text-foreground">
                {formatHealthbookRelativeTimestamp(item.publishedAt, now)}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {formatHealthbookAbsoluteTimestamp(item.publishedAt)}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] md:hidden",
                signalStyles[item.signal],
              )}
            >
              {item.signal}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {item.category}
              </span>
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {item.sourceType}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{item.source}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {item.sourceLabel}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold leading-6 tracking-tight text-foreground md:text-[1.02rem]">
                {item.title}
              </h3>
              <ChevronDown
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180",
                )}
              />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{item.takeaway}</p>
          </div>

          <div className="hidden justify-end md:flex">
            <span
              className={cn(
                "inline-flex h-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                signalStyles[item.signal],
              )}
            >
              {item.signal}
            </span>
          </div>
        </div>
      </button>

      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border bg-muted/30 px-4 py-4">
            <div className="grid gap-3 md:grid-cols-[88px_180px_minmax(0,1fr)_112px]">
              <div className="hidden md:block" />
              <div className="hidden md:block" />
              <div className="max-w-3xl space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Detail
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.summary}</p>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-foreground"
                >
                  Open source
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function HealthbookFeed({ items, initialNow }: HealthbookFeedProps) {
  const [activeCategory, setActiveCategory] = useState<HealthbookCategory>(HEALTHBOOK_CATEGORIES[0]);
  const [activeSourceType, setActiveSourceType] = useState<HealthbookSourceType>(HEALTHBOOK_SOURCE_TYPES[0]);
  const [expandedId, setExpandedId] = useState("");
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const filteredItems = items.filter((item) => {
    const categoryMatch = activeCategory === "All" || item.category === activeCategory;
    const sourceMatch = activeSourceType === "All Sources" || item.sourceType === activeSourceType;
    return categoryMatch && sourceMatch;
  });

  const leadCount = items.filter((item) => item.signal === "Lead").length;
  const paperCount = items.filter((item) => ["Journals", "Preprints"].includes(item.sourceType)).length;
  const latestPublishedAt = getLatestPublishedAt(items);
  const latestLabel = latestPublishedAt
    ? formatHealthbookRelativeTimestamp(new Date(latestPublishedAt).toISOString(), now)
    : "0m";

  return (
    <section className="overflow-hidden rounded-[1.65rem] border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-primary/[0.04] via-card to-card">
        <div className="grid gap-4 px-4 py-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Healthbook
            </p>
            <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2rem]">
              Latest signal stream
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Latest item landed {latestLabel} ago.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  2h
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                  {countHealthbookItemsWithinHours(items, 2, now)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  6h
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                  {countHealthbookItemsWithinHours(items, 6, now)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Lead
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">{leadCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Papers
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">{paperCount}</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <FilterGroup
                label="Category"
                options={HEALTHBOOK_CATEGORIES}
                activeOption={activeCategory}
                onSelect={(nextCategory) => {
                  setActiveCategory(nextCategory as HealthbookCategory);

                  const nextItems = items.filter((item) => {
                    const categoryMatch = nextCategory === "All" || item.category === nextCategory;
                    const sourceMatch =
                      activeSourceType === "All Sources" || item.sourceType === activeSourceType;
                    return categoryMatch && sourceMatch;
                  });

                  setExpandedId(nextItems.some((item) => item.id === expandedId) ? expandedId : "");
                }}
              />
              <FilterGroup
                label="Source"
                options={HEALTHBOOK_SOURCE_TYPES}
                activeOption={activeSourceType}
                onSelect={(nextSourceType) => {
                  setActiveSourceType(nextSourceType as HealthbookSourceType);

                  const nextItems = items.filter((item) => {
                    const categoryMatch = activeCategory === "All" || item.category === activeCategory;
                    const sourceMatch =
                      nextSourceType === "All Sources" || item.sourceType === nextSourceType;
                    return categoryMatch && sourceMatch;
                  });

                  setExpandedId(nextItems.some((item) => item.id === expandedId) ? expandedId : "");
                }}
              />
            </div>
          </div>
        </div>

        <div className="hidden border-t border-border px-4 py-2 md:grid md:grid-cols-[88px_180px_minmax(0,1fr)_112px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Age
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Source
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Release
          </p>
          <p className="text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Signal
          </p>
        </div>
      </div>

      <div>
        {filteredItems.length ? (
          filteredItems.map((item) => (
            <FeedRow
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              now={now}
              onToggle={() => setExpandedId((currentId) => (currentId === item.id ? "" : item.id))}
            />
          ))
        ) : (
          <div className="px-4 py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              No matches
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              That filter combination is empty in the current stream. Try widening either the category
              or source filter.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
