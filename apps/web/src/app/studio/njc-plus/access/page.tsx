import { NjcPlusAccessConsole } from "@/components/studio/njc-plus-access-console";
import { NjcPlusBetaAccess } from "@/components/studio/njc-plus-beta-access";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getStudioUser } from "@/lib/auth";
import { Card,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
export default async function AccessPage(){const viewer=await getStudioUser();if(viewer?.role!=="admin")return <Card><CardHeader><CardTitle>Access management is restricted</CardTitle><CardDescription>Administrator access is required because grants can unlock paid content.</CardDescription></CardHeader></Card>;return <><NjcPlusStudioHeading eyebrow="Entitlement authority" title="Access & invited beta" description="Manage paid-adjacent grants and a completely separate, temporary Invited Beta Tester entitlement with mandatory reasons and immutable audit history."/><NjcPlusAccessConsole mode="access"/><NjcPlusBetaAccess/></>;}
