import { NjcPlusFlags } from "@/components/studio/njc-plus-flags";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getStudioUser } from "@/lib/auth";
import { getNjcPlusFlags } from "@/lib/feature-flags";
export default async function FlagsPage() { const [viewer, flags] = await Promise.all([getStudioUser(), getNjcPlusFlags()]); return <><NjcPlusStudioHeading eyebrow="Release engineering" title="Feature flags" description="Stage individual capabilities safely. The parent beta switch is the single public release boundary." /><NjcPlusFlags initial={flags} canManage={viewer?.role === "admin"} /></>; }
