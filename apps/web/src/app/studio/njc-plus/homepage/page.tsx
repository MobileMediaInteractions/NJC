import { asc, desc } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumContent, premiumHomepageModules } from "@harborline/backend/schema";
import { NjcPlusHomepageComposer } from "@/components/studio/njc-plus-homepage";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getStudioUser } from "@/lib/auth";
export default async function HomepagePage() { const viewer = await getStudioUser(); const [modules, content] = hasDatabase() ? await Promise.all([getDb().select().from(premiumHomepageModules).orderBy(asc(premiumHomepageModules.sortOrder)), getDb().select().from(premiumContent).orderBy(desc(premiumContent.updatedAt)).limit(300)]) : [[], []]; return <><NjcPlusStudioHeading eyebrow="Rundown editor" title="Homepage" description="Compose a live, hierarchical premium front page without a code change or deployment." /><NjcPlusHomepageComposer initial={modules} content={content} canManage={Boolean(viewer && ["admin","editor","producer"].includes(viewer.role))} /></>; }
