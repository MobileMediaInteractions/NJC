import { useEffect, useState, type FormEvent } from "react";
import { animationTemplates, type AnimationTemplateId } from "../lib/animation-templates";

export function NewAnimationDialog({ open, busy, onClose, onCreate }: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (name: string, template: AnimationTemplateId) => void;
}) {
  const [name, setName] = useState("Local headline");
  const [template, setTemplate] = useState<AnimationTemplateId>("headline");

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [busy, onClose, open]);

  if (!open) return null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) onCreate(name.trim(), template);
  };

  return (
    <div className="dialog-backdrop" onMouseDown={() => !busy && onClose()}>
      <form className="new-animation-dialog" role="dialog" aria-modal="true" aria-labelledby="new-animation-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <header><span className="dialog-mark">NJC</span><div><h2 id="new-animation-title">Create an animation</h2><p>Start with valid source, then refine it in Code, Visual and Timeline.</p></div></header>
        <label className="dialog-field">Animation name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
        <fieldset><legend>Starting point</legend>{animationTemplates.map((item) => <label className={template === item.id ? "selected" : ""} key={item.id}><input type="radio" name="template" value={item.id} checked={template === item.id} onChange={() => setTemplate(item.id)} /><span><strong>{item.label}</strong><small>{item.description}</small></span></label>)}</fieldset>
        <footer><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary" type="submit" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create animation"}</button></footer>
      </form>
    </div>
  );
}
