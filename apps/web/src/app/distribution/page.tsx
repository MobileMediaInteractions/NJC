import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { DistributionLibrary } from "@/components/distribution/distribution-library";
import { DistributionContentLibrary } from "@/components/distribution/distribution-content-library";
import {
  getDistributionIdentity,
  getDistributionLibrary,
  getDistributionLibraryItems,
  isDistributionEnabled,
} from "@/lib/distribution";

export default async function DistributionHome() {
  if (!(await isDistributionEnabled())) notFound();
  const identity = await getDistributionIdentity();
  if (!identity) {
    return (
      <main className="distribution-auth">
        <div>
          <p>NJC Distribution</p>
          <h1>Private releases, made clear.</h1>
          <span>
            Sign in with the verified account that received access. Package
            names and files remain hidden until authorization succeeds.
          </span>
          <Link href="/sign-in?redirect_url=/distribution">
            Sign in securely <ArrowRight />
          </Link>
          <small>
            <ShieldCheck /> Access is checked again for every package, preview,
            stream, and download.
          </small>
        </div>
        <LockKeyhole />
      </main>
    );
  }
  const [packages, items] = await Promise.all([
    getDistributionLibrary(identity.clerkId),
    getDistributionLibraryItems(identity.clerkId),
  ]);
  return (
    <main>
      <section className="distribution-hero">
        <div>
          <p>Authorized preview library</p>
          <h1>Everything shared with you, in one private signal.</h1>
          <span>
            Review embargoed stories, video, audio, images, and documents
            before public release. Access windows and download controls are
            enforced by the newsroom.
          </span>
        </div>
        <aside>
          <small>Signed in as</small>
          <strong>{identity.name}</strong>
          <span>{identity.email}</span>
        </aside>
      </section>
      <section className="distribution-library-shell">
        <header>
          <p>Your library</p>
          <h2>Available releases</h2>
        </header>
        <DistributionLibrary packages={packages} />
        <DistributionContentLibrary items={items} />
      </section>
    </main>
  );
}
