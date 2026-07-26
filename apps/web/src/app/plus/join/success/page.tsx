import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { NjcPlusHeader } from "@/components/njc-plus/brand";
import { resolveNjcPlusSurface } from "@/lib/njc-plus";
export default async function SuccessPage(){if(!(await resolveNjcPlusSurface({feature:"njc_plus_checkout"})).available)notFound();return <><NjcPlusHeader/><main className="plus-empty-hero"><div className="plus-shell"><CheckCircle2/><p>Checkout received</p><h1>Your NJC+ signal is connecting.</h1><span>Payment confirmation is verified by a signed provider webhook. Access will appear automatically; never refresh a payment form or submit twice.</span><Link href="/plus">Return to NJC+</Link></div></main></>;}
