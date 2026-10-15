import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { footerNavigation } from "../src/lib/footer-navigation";
import { defaultSiteConfiguration } from "../src/lib/site-settings";
import { SiteFooter } from "../src/components/site-footer";
import { SiteFooterV2 } from "../src/components/site-v2/site-footer-v2";

test("footer retains the existing destinations without duplicate navigation links", () => {
  const nav = footerNavigation(defaultSiteConfiguration.features, true);
  const links = [...nav.primary, ...nav.groups.flatMap((group) => group.links)];
  assert.equal(new Set(links.map(([, href]) => href)).size, links.length);
  for (const href of ["/latest", "/community", "/tips", "/newsletter", "/staff", "/standards", "/press", "/developers", "/legal", "/data-requests", "/accessibility", "/20-under-20", "/category/opinion", "/category/jersey-laurels"]) assert.ok(links.some(([, path]) => path === href), href);
});
test("disabled community/newsletters and an empty staff directory stay out of footer navigation", () => {
  const nav = footerNavigation({ ...defaultSiteConfiguration.features, community: false, newsletters: false }, false);
  assert.ok(![...nav.primary, ...nav.groups.flatMap((group) => group.links)].some(([, href]) => ["/community", "/newsletter", "/staff"].includes(href)));
});
test("both designs share collapsed, keyboard-native navigation and persistent privacy controls", () => {
  const props = { publication: defaultSiteConfiguration.publication, features: defaultSiteConfiguration.features, staffPageEnabled: true, easterEggEnabled: true };
  const legacy = renderToStaticMarkup(createElement(SiteFooter, props));
  const v2 = renderToStaticMarkup(createElement(SiteFooterV2, props));
  assert.equal(legacy, v2);
  assert.equal((legacy.match(/<details /g) ?? []).length, 3);
  assert.doesNotMatch(legacy, /<details[^>]*\sopen/);
  for (const text of ["Footer shortcuts", "Explore the Courier", "Change privacy choices", 'href="/privacy"', 'href="/terms"', 'href="#page-top"', 'data-courier-frequency="exit-9"']) assert.ok(legacy.includes(text), text);
});
