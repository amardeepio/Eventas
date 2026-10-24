"use client";

import { useId, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/field";
import { formatIndianCity, searchIndianCities } from "@/lib/domain/indian-cities";
import { cn } from "@/lib/utils/cn";

export function CityCombobox({ value, onChange, error, id = "location" }: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const suggestions = searchIndianCities(value);

  function select(index: number) {
    const item = suggestions[index];
    if (!item) return;
    onChange(formatIndianCity(item));
    setOpen(false);
  }

  return <div className="relative">
    <MapPin className="pointer-events-none absolute top-4 left-4 z-10 text-muted" size={17} aria-hidden="true" />
    <Input
      id={id}
      className="pr-4 pl-11"
      value={value}
      onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(0); }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setOpen(true);
          setActive((current) => Math.min(current + 1, suggestions.length - 1));
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
          setActive((current) => Math.max(current - 1, 0));
        } else if (event.key === "Enter" && open && suggestions[active]) {
          event.preventDefault();
          select(active);
        } else if (event.key === "Escape") {
          setOpen(false);
        }
      }}
      role="combobox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-autocomplete="list"
      aria-activedescendant={open && suggestions[active] ? `${listId}-${active}` : undefined}
      aria-invalid={Boolean(error)}
      autoComplete="off"
      maxLength={120}
      placeholder="Start typing an Indian city, e.g. Jaipur"
    />
    {open && suggestions.length > 0 && <ul id={listId} role="listbox" aria-label="Indian cities" className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-line bg-paper p-1.5 shadow-[0_18px_50px_rgba(45,38,30,.14)]">
      {suggestions.map((item, index) => <li
        key={`${item.city}-${item.state}`}
        id={`${listId}-${index}`}
        role="option"
        aria-selected={index === active}
        onMouseDown={(event) => { event.preventDefault(); select(index); }}
        onMouseEnter={() => setActive(index)}
        className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm", index === active ? "bg-blush text-ink" : "text-ink/80")}
      >
        <span className="font-medium">{item.city}</span>
        <span className="text-[11px] text-muted">{item.state}</span>
      </li>)}
    </ul>}
    <p className="mt-1.5 text-[11px] text-muted">Indian cities only · choose a suggestion or type your town</p>
  </div>;
}
