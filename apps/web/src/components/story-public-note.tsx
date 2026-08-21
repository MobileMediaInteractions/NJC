import type { StoryNoteType } from "@harborline/contracts";
import { storyNoteLabel } from "@/lib/story-notes";

const noteStyles: Record<StoryNoteType, string> = {
  editors_note: "border-brand-yellow bg-brand-navy text-white",
  reporting_note: "border-emerald-500 bg-emerald-950 text-white",
  update_note: "border-brand-blue bg-blue-950 text-white",
};

export function StoryPublicNote({
  type,
  children,
  className = "",
}: {
  type: StoryNoteType;
  children: string;
  className?: string;
}) {
  return (
    <aside
      aria-label={storyNoteLabel(type)}
      className={`border-l-4 p-5 ${noteStyles[type]} ${className}`}
    >
      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-current/70">
        {storyNoteLabel(type)}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-current/85">{children}</p>
    </aside>
  );
}
