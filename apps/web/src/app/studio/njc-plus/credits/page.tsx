import { NjcPlusAccessConsole } from "@/components/studio/njc-plus-access-console";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getStudioUser } from "@/lib/auth";
import { Card,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
export default async function CreditsPage(){const viewer=await getStudioUser();if(viewer?.role!=="admin")return <Card><CardHeader><CardTitle>Credit management is restricted</CardTitle><CardDescription>Administrator access is required for ledger transactions.</CardDescription></CardHeader></Card>;return <><NjcPlusStudioHeading eyebrow="NJC Access Credits" title="Auditable credit ledger" description="Every grant, deduction, redemption, expiration, refund, correction and reversal is a signed transaction. No mutable balance field exists."/><NjcPlusAccessConsole mode="credits"/></>;}
