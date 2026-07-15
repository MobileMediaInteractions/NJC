import { StudioGate } from "@/components/studio/studio-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() { return <StudioGate><div className="max-w-3xl"><h1 className="text-3xl font-bold tracking-tight">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Configure the publication without touching presentation code.</p><Card className="mt-7"><CardHeader><CardTitle>Brand & region</CardTitle><CardDescription>Launch defaults are centralized in src/lib/site.ts.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><Field label="Publication name" value="The New Jersey Courier" /><Field label="Primary city" value="New Brunswick" /><Field label="Region" value="Middlesex County" /><Field label="Desk" value="Middlesex Desk" /><div className="sm:col-span-2"><Button>Save changes</Button></div></CardContent></Card><Card className="mt-6"><CardHeader><CardTitle>Commercial modules</CardTitle><CardDescription>Built in but disabled for launch.</CardDescription></CardHeader><CardContent className="space-y-5"><Toggle label="Advertising placements" /><Toggle label="Membership" /><Toggle label="Donations" /></CardContent></Card></div></StudioGate>; }
function Field({ label, value }: { label: string; value: string }) { return <div className="space-y-2"><Label>{label}</Label><Input defaultValue={value} /></div>; }
function Toggle({ label }: { label: string }) { return <div className="flex items-center justify-between"><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">Disabled in the fictional launch configuration</p></div><Switch /></div>; }
