"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EditableList({
  values,
  onChange,
  placeholder,
  addLabel = "Add",
  disabled = false,
  maxItems,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  addLabel?: string;
  disabled?: boolean;
  maxItems?: number;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value || values.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) return;
    if (maxItems && values.length >= maxItems) return;
    onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          disabled={disabled || Boolean(maxItems && values.length >= maxItems)}
        />
        <Button type="button" variant="outline" onClick={add} disabled={disabled || !draft.trim() || Boolean(maxItems && values.length >= maxItems)}>
          <Plus /> {addLabel}
        </Button>
      </div>
      {values.length ? (
        <div className="flex flex-wrap gap-2" aria-live="polite">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 py-1">
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== value))}
                disabled={disabled}
                aria-label={`Remove ${value}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">None added.</p>
      )}
    </div>
  );
}
