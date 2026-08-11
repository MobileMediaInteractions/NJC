import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getInternalEligibility, getInternalViewer } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";

const sections = [
  ["Operations", "System status, incident response and controlled runbooks."],
  ["People & access", "Explicit eligibility, capability grants, reviews and revocation."],
  ["Audit & recovery", "Privileged audit events, exports, restore evidence and compliance records."],
] as const;

export default async function InternalHome() {
  const requestHeaders = await headers();
  const eligibility = await getInternalEligibility(requestHeaders);
  if (!eligibility) notFound();
  const viewer = await getInternalViewer(requestHeaders, eligibility);
  if (!viewer) redirect("/sign-in");
  return <main>
    <header className="mast"><span className="mark">NJC</span><div><p className="eyebrow">Restricted internal service</p><strong>The New Jersey Courier</strong></div></header>
    <p className="eyebrow" style={{ marginTop: 42 }}>Internal operations</p>
    <h1>One quiet place for sensitive work.</h1>
    <p className="intro">Signed in as {viewer.displayName}. This first boundary release intentionally exposes no migrated newsroom data: workflows move here only after section-level authorization and rollback tests pass.</p>
    <div className="grid">{sections.map(([title, body]) => <section className="card" key={title}><span className="status">Boundary ready</span><h2>{title}</h2><p>{body}</p></section>)}</div>
  </main>;
}
