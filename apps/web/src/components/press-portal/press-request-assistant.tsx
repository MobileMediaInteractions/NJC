"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, Check, Download, FileArchive, LockKeyhole, MessageSquareText, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Asset = { id: string; title: string; description: string; category: string; mimeType: string; version: string; attribution: string | null };
type Profile = {
  name?: string; organization?: string; requesterRole?: string; email?: string; requesterWebsite?: string;
  organizationWebsite?: string; country?: string; projectName?: string; requestDetails?: string;
  whereUsed?: string; expectedReleaseAt?: string; usageClassification?: string;
  requestedAssetIds?: string[]; unmatchedMaterials?: string[];
};
type PortalRequest = { id: string; status: string; profile: Profile; decision: { reasons: string[]; restrictions: string[]; licenseType: string | null; policyVersion: string | null } };
type ChatMessage = { role: "requester" | "assistant"; content: string };
type DownloadPackage = { id: string; filename: string; expiresAt: string; downloadUrl: string; downloadToken: string };

const emptyProfile: Profile = { requestedAssetIds: [], unmatchedMaterials: [], requesterWebsite: "", organizationWebsite: "", expectedReleaseAt: "" };
const useOptions = [
  ["editorial", "Editorial article or reporting"], ["review", "Review or criticism"], ["broadcast", "Broadcast or newscast"],
  ["podcast", "Podcast or radio"], ["research", "Research"], ["educational", "Educational use"],
  ["event", "Event coverage"], ["promotional", "Promotional use"], ["commercial", "Commercial use"], ["unknown", "Not sure"],
];
function toLocalDateTime(value?: string) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.valueOf())) return value.slice(0, 16); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }

export function PressRequestAssistant() {
  const [requestRecord, setRequestRecord] = useState<PortalRequest | null>(null);
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [downloadPackage, setDownloadPackage] = useState<DownloadPackage | null>(null);

  useEffect(() => {
    fetch("/api/v1/press-portal/assets").then((response) => response.json()).then((payload) => setAssets(payload.assets ?? [])).catch(() => undefined);
    const stored = sessionStorage.getItem("njc-press-request");
    if (!stored) return;
    try {
      const session = JSON.parse(stored) as { version?: number; id?: string; token?: string };
      if (session.version !== 1 || !session.id || !session.token) throw new Error("Unsupported request session");
      const sessionId = session.id;
      const sessionToken = session.token;
      fetch(`/api/v1/press-portal/requests/${sessionId}`, { headers: { "x-press-request-token": sessionToken } })
        .then(async (response) => response.ok ? response.json() : Promise.reject())
        .then((payload) => {
          setRequestRecord(payload.request); setProfile(payload.request.profile); setToken(sessionToken);
          setMessages((payload.messages ?? []).filter((item: { role: string }) => item.role !== "system"));
        }).catch(() => sessionStorage.removeItem("njc-press-request"));
    } catch { sessionStorage.removeItem("njc-press-request"); }
  }, []);

  const requestedAssets = useMemo(() => assets.filter((asset) => profile.requestedAssetIds?.includes(asset.id)), [assets, profile.requestedAssetIds]);
  const terminal = Boolean(requestRecord && ["ready", "downloaded", "denied", "manual_review", "revoked", "expired"].includes(requestRecord.status));

  function saveSession(id: string, nextToken: string) {
    sessionStorage.setItem("njc-press-request", JSON.stringify({ version: 1, id, token: nextToken }));
  }

  async function api(url: string, options: RequestInit = {}) {
    const response = await fetch(url, { ...options, headers: { "content-type": "application/json", ...(token ? { "x-press-request-token": token } : {}), ...(options.headers ?? {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message ?? "The request could not be completed.");
    return payload;
  }

  async function start() {
    if (message.trim().length < 10) return setError("Describe what you are producing and which materials you need.");
    setBusy(true); setError("");
    try {
      const original = message.trim();
      const payload = await api("/api/v1/press-portal/requests", { method: "POST", body: JSON.stringify({ message: original, website: "" }) });
      setToken(payload.accessToken); saveSession(payload.request.id, payload.accessToken);
      setRequestRecord(payload.request); setProfile(payload.request.profile);
      setMessages([{ role: "requester", content: original }, { role: "assistant", content: payload.assistantMessage }]);
      setMessage("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to start the request."); }
    finally { setBusy(false); }
  }

  async function sendMessage() {
    if (!requestRecord || !message.trim()) return;
    setBusy(true); setError("");
    try {
      const original = message.trim();
      const payload = await api(`/api/v1/press-portal/requests/${requestRecord.id}/messages`, { method: "POST", body: JSON.stringify({ message: original }) });
      setRequestRecord(payload.request); setProfile(payload.request.profile);
      setMessages((current) => [...current, { role: "requester", content: original }, { role: "assistant", content: payload.assistantMessage }]);
      setMessage(""); setConfirmed(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to send the message."); }
    finally { setBusy(false); }
  }

  async function saveBrief() {
    if (!requestRecord) return;
    setBusy(true); setError("");
    try {
      const expectedReleaseAt = profile.expectedReleaseAt ? new Date(profile.expectedReleaseAt).toISOString() : "";
      const payload = await api(`/api/v1/press-portal/requests/${requestRecord.id}`, { method: "PATCH", body: JSON.stringify({ ...profile, expectedReleaseAt }) });
      setRequestRecord(payload.request); setProfile(payload.request.profile); setConfirmed(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Complete every required request field."); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!requestRecord || !confirmed) return;
    setBusy(true); setError("");
    try {
      const payload = await api(`/api/v1/press-portal/requests/${requestRecord.id}/submit`, { method: "POST", body: "{}" });
      setRequestRecord(payload.request);
      if (payload.package?.downloadToken) setDownloadPackage(payload.package);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The request could not be evaluated."); }
    finally { setBusy(false); }
  }

  async function download() {
    if (!requestRecord) return;
    setBusy(true); setError("");
    try {
      let current = downloadPackage;
      if (!current) {
        const payload = await api(`/api/v1/press-portal/requests/${requestRecord.id}/download-access`, { method: "POST", body: "{}" });
        current = payload.package; setDownloadPackage(current);
      }
      if (!current) throw new Error("The package is unavailable.");
      const response = await fetch(current.downloadUrl, { headers: { "x-press-download-token": current.downloadToken } });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error?.message ?? "The package could not be downloaded.");
      const href = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = href; anchor.download = current.filename; anchor.click(); URL.revokeObjectURL(href);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The package could not be downloaded."); }
    finally { setBusy(false); }
  }

  function update<K extends keyof Profile>(key: K, value: Profile[K]) { setProfile((current) => ({ ...current, [key]: value })); setConfirmed(false); }
  function toggleAsset(id: string) {
    const selected = new Set(profile.requestedAssetIds ?? []);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    update("requestedAssetIds", [...selected]);
  }

  if (!requestRecord) return (
    <div>
      <section className="overflow-hidden bg-[#102e25] px-5 pb-20 pt-16 text-white sm:px-8 lg:px-12 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-[1180px]"><p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d5a449]">Authorized materials, assembled for your assignment</p><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-7xl">Tell us what your newsroom needs.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/68">Our Press Kit assistant gathers the brief, matches it to the actual asset catalog, and applies the Courier’s existing media-use rules. Ambiguous or sensitive requests go to a person.</p></div>
      </section>
      <section className="relative mx-auto -mt-12 grid max-w-[1180px] gap-6 px-5 pb-20 sm:px-8 lg:grid-cols-[1fr_0.46fr] lg:px-12">
        <div className="border border-[#173e32]/15 bg-white p-5 shadow-2xl shadow-[#173e32]/10 sm:p-8"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-[#e1eee7] text-[#173e32]"><MessageSquareText className="size-5" /></span><div><h2 className="text-xl font-bold">Start with the assignment</h2><p className="text-sm text-[#173e32]/58">One useful paragraph is enough.</p></div></div><Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-6 min-h-44 resize-y border-[#173e32]/20 bg-[#faf8f2] text-base leading-7" placeholder="I’m a reporter with… I’m producing… The materials will appear… I need…" /><div className="mt-5 flex items-center justify-between gap-4"><p className="text-xs text-[#173e32]/55">Do not include confidential personal information.</p><Button onClick={start} disabled={busy} className="bg-[#173e32] text-white hover:bg-[#225542]">{busy ? "Opening request…" : "Begin request"}<ArrowRight className="ml-2 size-4" /></Button></div>{error ? <p className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}</div>
        <div className="space-y-3"><Trust icon={<Bot />} title="AI-assisted, rules-constrained" detail="The assistant interprets the request. Application policy—not the model—authorizes files." /><Trust icon={<ShieldCheck />} title="Request-specific authorization" detail="Approved packages include a PDF, restrictions, versioned manifest, and hashes." /><Trust icon={<LockKeyhole />} title="Private delivery" detail="Packages use expiring, request-bound access and are never permanent public links." /></div>
      </section>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#173e32]/15 pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6b1e]">Request {requestRecord.id.slice(0, 8)}</p><h1 className="mt-2 text-3xl font-black tracking-tight">Press materials brief</h1></div><Status status={requestRecord.status} /></div>
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="flex min-h-[620px] flex-col border border-[#173e32]/15 bg-[#102e25] text-white"><div className="border-b border-white/10 p-5"><h2 className="flex items-center gap-2 font-bold"><Bot className="size-4 text-[#d5a449]" /> Request assistant</h2><p className="mt-1 text-xs text-white/50">Answers are extracted into the brief. You control the final submission.</p></div><div className="flex-1 space-y-4 overflow-y-auto p-5">{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`max-w-[92%] ${item.role === "requester" ? "ml-auto bg-white text-[#173e32]" : "border border-white/12 bg-white/6 text-white/80"} p-4 text-sm leading-6`}><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] opacity-50">{item.role === "requester" ? "You" : "Press assistant"}</p>{item.content}</div>)}</div>{!terminal ? <div className="border-t border-white/10 p-4"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-24 border-white/15 bg-white/5 text-white placeholder:text-white/35" placeholder="Add a missing detail or correct the assistant…" /><Button onClick={sendMessage} disabled={busy || !message.trim()} className="mt-3 w-full bg-[#d5a449] text-[#102e25] hover:bg-[#e1b45d]">Send detail</Button></div> : null}</section>
        <section className="border border-[#173e32]/15 bg-white p-5 sm:p-7"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Structured request</h2><p className="mt-1 text-sm text-[#173e32]/55">Review and correct every field before policy evaluation.</p></div><UserRound className="size-6 text-[#173e32]/35" /></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Professional or legal name" required value={profile.name} onChange={(value) => update("name", value)} /><Field label="Organization or publication" required value={profile.organization} onChange={(value) => update("organization", value)} /><Field label="Role or title" required value={profile.requesterRole} onChange={(value) => update("requesterRole", value)} /><Field label="Professional email" required type="email" value={profile.email} onChange={(value) => update("email", value)} /><Field label="Your website" type="url" value={profile.requesterWebsite} onChange={(value) => update("requesterWebsite", value)} /><Field label="Organization website" type="url" value={profile.organizationWebsite} onChange={(value) => update("organizationWebsite", value)} /><Field label="Country or jurisdiction" required value={profile.country} onChange={(value) => update("country", value)} /><Field label="Project, publication, or event" required value={profile.projectName} onChange={(value) => update("projectName", value)} /><label className="text-sm font-semibold">Use classification <span className="text-red-700">*</span><select value={profile.usageClassification ?? ""} onChange={(event) => update("usageClassification", event.target.value)} className="mt-2 h-10 w-full border border-[#173e32]/20 bg-white px-3 font-normal"><option value="">Choose the closest use</option>{useOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Field label="Expected publication or release" type="datetime-local" value={toLocalDateTime(profile.expectedReleaseAt)} onChange={(value) => update("expectedReleaseAt", value)} /></div>
          <label className="mt-4 block text-sm font-semibold">Intended use <span className="text-red-700">*</span><Textarea value={profile.requestDetails ?? ""} onChange={(event) => update("requestDetails", event.target.value)} className="mt-2 min-h-28" /></label><label className="mt-4 block text-sm font-semibold">Where the materials will appear <span className="text-red-700">*</span><Textarea value={profile.whereUsed ?? ""} onChange={(event) => update("whereUsed", event.target.value)} className="mt-2 min-h-20" /></label>
          <div className="mt-6"><h3 className="font-bold">Requested materials</h3><p className="mt-1 text-xs text-[#173e32]/55">Only catalog items authorized for the confirmed use can enter a package.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{assets.map((asset) => <label key={asset.id} className={`cursor-pointer border p-4 ${profile.requestedAssetIds?.includes(asset.id) ? "border-[#173e32] bg-[#edf4f0]" : "border-[#173e32]/15"}`}><span className="flex items-start gap-3"><input type="checkbox" className="mt-1 accent-[#173e32]" checked={profile.requestedAssetIds?.includes(asset.id) ?? false} onChange={() => toggleAsset(asset.id)} /><span><strong className="block text-sm">{asset.title}</strong><span className="mt-1 block text-xs leading-5 text-[#173e32]/58">{asset.description}</span></span></span></label>)}</div></div>
          {error ? <p className="mt-5 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
          {!terminal ? <div className="mt-7 border-t border-[#173e32]/15 pt-5"><div className="flex flex-wrap gap-3"><Button onClick={saveBrief} disabled={busy} variant="outline">Save and review summary</Button><Button onClick={submit} disabled={busy || !confirmed} className="bg-[#173e32] text-white hover:bg-[#225542]">Confirm and evaluate <ArrowRight className="ml-2 size-4" /></Button></div>{confirmed ? <div className="mt-5 bg-[#f4f0e7] p-4 text-sm"><p className="font-bold">Ready for your confirmation</p><p className="mt-2 leading-6">{profile.name} of {profile.organization} is requesting {requestedAssets.map((asset) => asset.title).join(", ") || "no matched catalog assets"} for {profile.projectName}. The materials will appear at {profile.whereUsed}.</p></div> : null}</div> : <Outcome request={requestRecord} onDownload={download} busy={busy} />}
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value?: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="text-sm font-semibold">{label} {required ? <span className="text-red-700">*</span> : null}<Input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="mt-2 border-[#173e32]/20 font-normal" /></label>; }
function Trust({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) { return <div className="border border-[#173e32]/15 bg-[#e9e4d8] p-5"><span className="text-[#9a6b1e] [&_svg]:size-5">{icon}</span><h3 className="mt-3 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#173e32]/60">{detail}</p></div>; }
function Status({ status }: { status: string }) { return <span className="rounded-full border border-[#173e32]/20 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]">{status.replaceAll("_", " ")}</span>; }
function Outcome({ request, onDownload, busy }: { request: PortalRequest; onDownload: () => void; busy: boolean }) {
  const ready = request.status === "ready" || request.status === "downloaded";
  const title = ready ? "Your authorized package is ready" : request.status === "manual_review" ? "A press representative will review this request" : request.status === "denied" ? "This request is not permitted" : request.status === "revoked" ? "This authorization was revoked" : "This request is no longer active";
  return <div className="mt-7 border-t border-[#173e32]/15 pt-6"><div className={`${ready ? "bg-[#e2eee7]" : "bg-[#f4f0e7]"} p-5`}><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">{ready ? <Check className="size-5 text-emerald-700" /> : <FileArchive className="size-5" />}</span><div><h3 className="font-bold">{title}</h3>{request.decision.reasons.map((reason) => <p key={reason} className="mt-2 text-sm leading-6 text-[#173e32]/65">{reason}</p>)}</div></div>{ready ? <Button onClick={onDownload} disabled={busy} className="mt-5 bg-[#173e32] text-white hover:bg-[#225542]"><Download className="mr-2 size-4" />{busy ? "Preparing…" : "Download authorized ZIP"}</Button> : null}</div></div>;
}
