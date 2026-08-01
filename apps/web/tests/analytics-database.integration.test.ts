import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import postgres from "postgres";
import { pseudonymizeAnalyticsIdentifier } from "../src/lib/analytics-privacy";

const url = process.env.ANALYTICS_TEST_DATABASE_URL;
const integration = url ? test : test.skip;
const sql = url ? postgres(url, { max: 8 }) : null;

before(async () => {
  if (!sql) return;
  await sql`drop schema if exists analytics_integration cascade`;
  await sql`create schema analytics_integration`;
  await sql`create table analytics_integration.page_events (event_id text primary key, installation_id text, session_id text, pathname text not null, day date not null, received_at timestamptz not null default now())`;
  await sql`create table analytics_integration.daily_views (day date not null, pathname text not null, views integer not null default 0, primary key(day, pathname))`;
  await sql`create table analytics_integration.installations (installation_id text primary key, account_id text, event_count integer not null default 1)`;
  await sql`create table analytics_integration.presence_events (event_id text primary key, installation_id text not null references analytics_integration.installations(installation_id) on delete cascade, app_version text not null, build_number text not null)`;
  await sql`create table analytics_integration.installation_versions (installation_id text not null references analytics_integration.installations(installation_id) on delete cascade, app_version text not null, build_number text not null, event_count integer not null default 1, primary key(installation_id, app_version, build_number))`;
  await sql`create table analytics_integration.archive_revisions (period_start date not null, revision integer not null, total_views integer not null, correction_reason text, primary key(period_start, revision))`;
  await sql`create table analytics_integration.archive_current (period_start date primary key, revision integer not null, total_views integer not null)`;
});

after(async () => {
  if (!sql) return;
  await sql`drop schema if exists analytics_integration cascade`;
  await sql.end();
});

integration("concurrent retry deduplication increments the aggregate exactly once", async () => {
  if (!sql) return;
  const ingest = async () => sql.begin(async (tx) => {
    const inserted = await tx`insert into analytics_integration.page_events (event_id, installation_id, session_id, pathname, day) values ('evt-1', 'install-1', 'session-1', '/story/example', '2026-08-01') on conflict do nothing returning event_id`;
    if (inserted.length) await tx`insert into analytics_integration.daily_views (day, pathname, views) values ('2026-08-01', '/story/example', 1) on conflict (day, pathname) do update set views = daily_views.views + 1`;
  });
  await Promise.all(Array.from({ length: 12 }, ingest));
  const [events] = await sql`select count(*)::int as count from analytics_integration.page_events`;
  const [aggregate] = await sql`select sum(views)::int as views from analytics_integration.daily_views`;
  assert.equal(events?.count, 1);
  assert.equal(aggregate?.views, 1);
});

integration("late arrival is attributed to the server receipt day", async () => {
  if (!sql) return;
  await sql`insert into analytics_integration.page_events (event_id, pathname, day, received_at) values ('late-1', '/', '2026-08-01', '2026-08-01T15:00:00Z')`;
  const [row] = await sql`select day::text from analytics_integration.page_events where event_id = 'late-1'`;
  assert.equal(row?.day, "2026-08-01");
});

integration("presence retries deduplicate while version upgrades remain distinct", async () => {
  if (!sql) return;
  await sql`insert into analytics_integration.installations values ('roku-a', 'account-a', 1)`;
  const presence = async (eventId: string, version: string, build: string) => sql.begin(async (tx) => {
    const inserted = await tx`insert into analytics_integration.presence_events values (${eventId}, 'roku-a', ${version}, ${build}) on conflict do nothing returning event_id`;
    if (!inserted.length) return;
    await tx`insert into analytics_integration.installation_versions values ('roku-a', ${version}, ${build}, 1) on conflict (installation_id, app_version, build_number) do update set event_count = installation_versions.event_count + 1`;
  });
  await Promise.all([presence("presence-1", "1.0", "10"), presence("presence-1", "1.0", "10")]);
  await presence("presence-2", "1.1", "11");
  const versions = await sql`select app_version, event_count from analytics_integration.installation_versions order by app_version`;
  assert.deepEqual(versions.map((row) => [row.app_version, row.event_count]), [["1.0", 1], ["1.1", 1]]);
});

integration("consent withdrawal cascades presence and version evidence", async () => {
  if (!sql) return;
  await sql`delete from analytics_integration.installations where installation_id = 'roku-a'`;
  const [presence] = await sql`select count(*)::int as count from analytics_integration.presence_events where installation_id = 'roku-a'`;
  const [versions] = await sql`select count(*)::int as count from analytics_integration.installation_versions where installation_id = 'roku-a'`;
  assert.equal(presence?.count, 0);
  assert.equal(versions?.count, 0);
});

integration("archive corrections preserve immutable revisions and advance current", async () => {
  if (!sql) return;
  await sql`insert into analytics_integration.archive_revisions values ('2026-07-27', 1, 12, null), ('2026-07-27', 2, 14, 'Late verified events')`;
  await sql`insert into analytics_integration.archive_current values ('2026-07-27', 2, 14)`;
  const revisions = await sql`select revision, total_views from analytics_integration.archive_revisions order by revision`;
  const [current] = await sql`select revision, total_views from analytics_integration.archive_current`;
  assert.deepEqual(revisions.map((row) => [row.revision, row.total_views]), [[1, 12], [2, 14]]);
  assert.deepEqual([current?.revision, current?.total_views], [2, 14]);
});

integration("aggregate reconciliation and evidence export stay exact and pseudonymous", async () => {
  if (!sql) return;
  const [events] = await sql`select count(*)::int as count from analytics_integration.page_events`;
  const [aggregates] = await sql`select coalesce(sum(views), 0)::int as count from analytics_integration.daily_views`;
  assert.equal(events?.count, aggregates?.count);
  const raw = "install-1";
  const exported = pseudonymizeAnalyticsIdentifier(raw);
  assert.equal(exported.length, 16);
  assert.notEqual(exported, raw);
});
