import assert from "node:assert/strict";
import test from "node:test";
import { resolveStudioAuthRouting } from "../src/lib/studio-auth-routing";

test("Studio custom domain gives Clerk the clean browser-visible path", () => {
  assert.deepEqual(
    resolveStudioAuthRouting("studio.thejerseycourier.com"),
    {
      signInPath: "/sign-in",
      signInUrl: "/sign-in",
      afterSignInUrl: "/",
      usesCleanStudioPaths: true,
    },
  );
});

test("Studio host matching tolerates ports and casing", () => {
  assert.equal(
    resolveStudioAuthRouting("STUDIO.THEJERSEYCOURIER.COM:443")
      .usesCleanStudioPaths,
    true,
  );
});

test("internal and local Studio routes keep their internal Clerk path", () => {
  for (const host of ["localhost:3000", "njc-web.vercel.app", null]) {
    assert.deepEqual(
      resolveStudioAuthRouting(host),
      {
        signInPath: "/studio/sign-in",
        signInUrl: "/studio/sign-in",
        afterSignInUrl: "/studio",
        usesCleanStudioPaths: false,
      },
    );
  }
});

test("configured alternate Studio hosts use clean paths", () => {
  assert.equal(
    resolveStudioAuthRouting("studio.example.test", "studio.example.test")
      .signInPath,
    "/sign-in",
  );
});
