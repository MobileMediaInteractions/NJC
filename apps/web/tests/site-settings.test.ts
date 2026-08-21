import assert from "node:assert/strict";
import test from "node:test";
import {
  crossesV2ProductionBoundary,
  defaultSiteConfiguration,
  formatDatelines,
  include20Under20Navigation,
  isGoogleAdsLive,
  isGoogleAnalyticsLive,
  normalizePublisherId,
  parseNavigation,
  parseDatelines,
  siteConfigurationSchema,
  studioModuleKeys,
} from "../src/lib/site-settings";

function configurationCopy() {
  return structuredClone(defaultSiteConfiguration);
}

test("default site configuration is valid and advertising is fail-closed", () => {
  assert.equal(siteConfigurationSchema.safeParse(defaultSiteConfiguration).success, true);
  assert.equal(defaultSiteConfiguration.advertising.enabled, false);
  assert.equal(defaultSiteConfiguration.advertising.previewMode, true);
  assert.equal(isGoogleAdsLive(defaultSiteConfiguration), false);
});

test("preview placements do not require external AdSense identifiers", () => {
  const configuration = configurationCopy();
  configuration.advertising.enabled = true;
  configuration.advertising.placements.homepageLeaderboard.enabled = true;
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, true);
  assert.equal(isGoogleAdsLive(configuration), false);
});

test("live advertising requires publisher, consent confirmation and placement IDs", () => {
  const configuration = configurationCopy();
  configuration.advertising.enabled = true;
  configuration.advertising.previewMode = false;
  configuration.advertising.placements.articleInline.enabled = true;
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, false);

  configuration.advertising.publisherId = "ca-pub-1234567890123456";
  configuration.advertising.privacyMessageConfigured = true;
  configuration.advertising.placements.articleInline.slotId = "1234567890";
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, true);
  assert.equal(isGoogleAdsLive(configuration), true);
});

test("publisher IDs normalize to the AdSense client form", () => {
  assert.equal(normalizePublisherId("pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(normalizePublisherId("ca-pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(normalizePublisherId(""), "");
});

test("Google Analytics is disabled by default and requires a valid GA4 measurement ID", () => {
  const configuration = configurationCopy();
  assert.equal(configuration.measurement.googleAnalytics.enabled, false);
  assert.equal(isGoogleAnalyticsLive(configuration), false);

  configuration.measurement.googleAnalytics.enabled = true;
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, false);

  configuration.measurement.googleAnalytics.measurementId = "UA-123456-1";
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, false);

  configuration.measurement.googleAnalytics.measurementId = "G-AB12CD34EF";
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, true);
  assert.equal(isGoogleAnalyticsLive(configuration), true);
});

test("navigation accepts local paths and rejects external destinations", () => {
  const local = { ...configurationCopy(), navigation: parseNavigation("Latest | /latest\nWeather | /weather") };
  assert.equal(siteConfigurationSchema.safeParse(local).success, true);

  const external = { ...configurationCopy(), navigation: parseNavigation("Bad | https://example.com") };
  assert.equal(siteConfigurationSchema.safeParse(external).success, false);
});

test("20 Under 20 replaces the former staff navigation slot", () => {
  assert.deepEqual(
    include20Under20Navigation([
      { label: "Latest", href: "/latest" },
      { label: "Staff", href: "/staff" },
    ]),
    [
      { label: "Latest", href: "/latest" },
      { label: "20 Under 20", href: "/20-under-20" },
    ],
  );
});

test("editorial datelines round trip and reject duplicates", () => {
  const datelines = parseDatelines("New Brunswick\nTrenton\nEdison");
  assert.deepEqual(datelines, ["New Brunswick", "Trenton", "Edison"]);
  assert.equal(formatDatelines(datelines), "New Brunswick\nTrenton\nEdison");

  const configuration = configurationCopy();
  configuration.editorial.datelines = ["Trenton", "trenton"];
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, false);
});

test("older stored configuration receives default datelines", () => {
  const configuration = configurationCopy() as Partial<ReturnType<typeof configurationCopy>>;
  delete configuration.editorial;
  const parsed = siteConfigurationSchema.parse(configuration);
  assert.ok(parsed.editorial.datelines.includes("New Brunswick"));
});

test("older stored configuration keeps external analytics off", () => {
  const configuration = configurationCopy() as Partial<ReturnType<typeof configurationCopy>>;
  delete configuration.measurement;
  const parsed = siteConfigurationSchema.parse(configuration);
  assert.deepEqual(parsed.measurement.googleAnalytics, {
    enabled: false,
    measurementId: "",
  });
  assert.equal(isGoogleAnalyticsLive(parsed), false);
});

test("older stored configuration keeps the unreleased native app handoff off", () => {
  const configuration = configurationCopy() as Partial<ReturnType<typeof configurationCopy>>;
  delete configuration.nativeApps;
  const parsed = siteConfigurationSchema.parse(configuration);
  assert.deepEqual(parsed.nativeApps, {
    handoffPromptEnabled: false,
    iosStoreUrl: "",
    androidStoreUrl: "",
  });
});

test("older stored configuration stays on Legacy until V2 is explicitly released", () => {
  const configuration = configurationCopy() as Partial<ReturnType<typeof configurationCopy>>;
  delete configuration.presentation;
  const parsed = siteConfigurationSchema.parse(configuration);
  assert.equal(parsed.presentation.designMode, "legacy");
  assert.deepEqual(parsed.presentation.v2.homepageModules, [
    "live",
    "lead",
    "secondary",
    "latest",
    "sections",
    "newsletter",
  ]);
});

test("V2 homepage composition rejects duplicate modules", () => {
  const configuration = configurationCopy();
  configuration.presentation.v2.homepageModules = ["lead", "lead"];
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, false);
});

test("only entering or leaving V2 Production crosses the guarded release boundary", () => {
  assert.equal(crossesV2ProductionBoundary("legacy", "v2-preview"), false);
  assert.equal(crossesV2ProductionBoundary("v2-preview", "legacy"), false);
  assert.equal(crossesV2ProductionBoundary("legacy", "v2-production"), true);
  assert.equal(crossesV2ProductionBoundary("v2-preview", "v2-production"), true);
  assert.equal(crossesV2ProductionBoundary("v2-production", "legacy"), true);
  assert.equal(crossesV2ProductionBoundary("v2-production", "v2-preview"), true);
  assert.equal(crossesV2ProductionBoundary("v2-production", "v2-production"), false);
});

test("native app store destinations are restricted to official stores", () => {
  const configuration = configurationCopy();
  configuration.nativeApps.iosStoreUrl = "https://apps.apple.com/us/app/example/id123";
  configuration.nativeApps.androidStoreUrl = "https://play.google.com/store/apps/details?id=com.example";
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, true);

  configuration.nativeApps.iosStoreUrl = "https://example.com/fake-ipa";
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, false);
});

test("older stored configuration receives the enabled Night Courier easter egg", () => {
  const configuration = configurationCopy() as Partial<ReturnType<typeof configurationCopy>>;
  delete configuration.easterEgg;
  const parsed = siteConfigurationSchema.parse(configuration);

  assert.equal(parsed.easterEgg.enabled, true);
  assert.equal(parsed.easterEgg.title, "The Night Courier");
  assert.ok(parsed.easterEgg.message.length >= 20);
});

test("older stored configuration enables pseudonyms, Distribution, Press, and Link in Bio by default", () => {
  const configuration = configurationCopy();
  const features = configuration.features as Partial<typeof configuration.features>;
  delete features.pseudonyms;
  delete features.distribution;
  delete features.pressPortal;
  delete features.linkInBio;

  const parsed = siteConfigurationSchema.parse(configuration);
  assert.equal(parsed.features.pseudonyms, true);
  assert.equal(parsed.features.distribution, true);
  assert.equal(parsed.features.pressPortal, true);
  assert.equal(parsed.features.linkInBio, true);
});

test("older stored configuration receives the complete guarded Studio registry", () => {
  const configuration = configurationCopy() as Partial<ReturnType<typeof configurationCopy>>;
  delete configuration.studio;
  const parsed = siteConfigurationSchema.parse(configuration);
  assert.deepEqual(
    Object.keys(parsed.studio.modules).sort(),
    [...studioModuleKeys].sort(),
  );
  assert.equal(parsed.studio.experience.commandPalette, true);
  assert.equal(parsed.studio.experience.richStoryEditor, true);
  assert.equal(parsed.studio.experience.richStoryEditorDefaultMode, "split");
  assert.equal(parsed.studio.experience.aiImagePlaceholders, false);
  assert.equal(parsed.studio.notifications.requireAudiencePreflight, true);
  assert.equal(parsed.studio.automations.manualVerificationRequired, true);
  assert.equal(parsed.studio.editorialWorkflow.activeStoryRevisions, true);
  assert.equal(parsed.studio.editorialWorkflow.requireIndependentRevisionApproval, true);
  assert.ok(parsed.studio.editorialWorkflow.schedulingEligibleRoles.includes("editor"));
  assert.equal(parsed.registry.schemaVersion, 1);
});

test("manual verification and notification preflight cannot be disabled", () => {
  const configuration = configurationCopy();
  (configuration.studio.automations.manualVerificationRequired as boolean) = false;
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, false);

  const second = configurationCopy();
  (second.studio.notifications.requireAudiencePreflight as boolean) = false;
  assert.equal(siteConfigurationSchema.safeParse(second).success, false);

  const third = configurationCopy();
  (third.studio.editorialWorkflow.requireIndependentRevisionApproval as boolean) = false;
  assert.equal(siteConfigurationSchema.safeParse(third).success, false);
});
