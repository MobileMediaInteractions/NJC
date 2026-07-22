import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultSiteConfiguration,
  isGoogleAdsLive,
  normalizePublisherId,
  parseNavigation,
  siteConfigurationSchema,
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

test("navigation accepts local paths and rejects external destinations", () => {
  const local = { ...configurationCopy(), navigation: parseNavigation("Latest | /latest\nWeather | /weather") };
  assert.equal(siteConfigurationSchema.safeParse(local).success, true);

  const external = { ...configurationCopy(), navigation: parseNavigation("Bad | https://example.com") };
  assert.equal(siteConfigurationSchema.safeParse(external).success, false);
});
