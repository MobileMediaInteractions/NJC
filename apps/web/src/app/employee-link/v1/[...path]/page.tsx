import Link from "next/link";
import { notFound } from "next/navigation";
import { parseEmployeeDeepLink } from "@harborline/contracts";
import { getEmployeeViewer } from "@/lib/employee-auth";

export default async function EmployeeLinkFallbackPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const universalUrl = `https://employee-link.invalid/employee-link/v1/${path.map(encodeURIComponent).join("/")}`;
  const parsed = parseEmployeeDeepLink(universalUrl);
  if (!parsed) notFound();
  const viewer = await getEmployeeViewer();
  const eligible = viewer?.capabilities.includes("employee:access");
  const ios = process.env.EMPLOYEE_IOS_INSTALL_URL;
  const android = process.env.EMPLOYEE_ANDROID_INSTALL_URL;
  const internal = process.env.EMPLOYEE_INTERNAL_INSTALL_URL;
  const custom = `njcourier-employee:///v1/${path.map(encodeURIComponent).join("/")}`;
  return <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-20"><section className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm"><p className="text-xs font-black tracking-[0.18em] text-brand-yellow">EMPLOYEE LINK</p><h1 className="mt-2 text-3xl font-black text-foreground">Open in Employee App</h1><p className="mt-3 leading-7 text-muted-foreground">This destination is validated again in the app and on the server. Opening or installing the app does not grant access.</p>{eligible ? <><a className="mt-7 inline-flex rounded-lg bg-brand-navy px-5 py-3 font-bold text-white" href={custom}>Open Employee App</a>{ios || android || internal ? <div className="mt-5 flex flex-wrap gap-3">{ios ? <a className="font-bold text-brand-blue underline" href={ios}>iOS installation</a> : null}{android ? <a className="font-bold text-brand-blue underline" href={android}>Android installation</a> : null}{internal ? <a className="font-bold text-brand-blue underline" href={internal}>Managed installation</a> : null}</div> : <p className="mt-5 text-sm text-muted-foreground">No approved installation URL has been configured yet.</p>}</> : <div className="mt-7 rounded-xl bg-muted p-5"><h2 className="font-black text-foreground">Access required</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Sign in through the reader app and request employee access before installing a restricted application.</p><Link className="mt-3 inline-block font-bold text-brand-blue underline" href="/sign-in">Sign in</Link></div>}</section></main>;
}
