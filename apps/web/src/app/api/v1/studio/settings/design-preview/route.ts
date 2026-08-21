import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudioUser } from "@/lib/auth";
import { getSiteOrigin } from "@/lib/origin";
import {
  createSiteDesignPreviewToken,
  siteDesignPreviewCookieDomain,
  siteDesignPreviewCookie,
  siteDesignPreviewMaxAge,
  siteDesignPreviewRedirectOrigin,
  siteDesignPreviewTarget,
} from "@/lib/site-design";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  design: z.enum(["legacy", "v2", "production"]),
  returnTo: z.string().max(300).default("/"),
});

export async function GET(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const parsed = inputSchema.safeParse({
    design: url.searchParams.get("design"),
    returnTo: url.searchParams.get("returnTo") || "/",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Choose a supported site design preview" } },
      { status: 400 },
    );
  }

  const redirectOrigin = siteDesignPreviewRedirectOrigin(url, getSiteOrigin());
  const target = siteDesignPreviewTarget(parsed.data.returnTo, redirectOrigin);
  if (!target) {
    return NextResponse.json(
      { error: { code: "invalid_return_path", message: "The preview destination must be a local site path" } },
      { status: 400 },
    );
  }

  const response = NextResponse.redirect(target);
  const cookieDomain = siteDesignPreviewCookieDomain(url.hostname);

  if (parsed.data.design === "production") {
    response.cookies.set(siteDesignPreviewCookie, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      domain: cookieDomain,
      maxAge: 0,
    });
    return response;
  }

  const token = createSiteDesignPreviewToken(parsed.data.design);
  if (!token) {
    return NextResponse.json(
      { error: { code: "preview_unavailable", message: "The authenticated preview signer is not configured" } },
      { status: 503 },
    );
  }

  response.cookies.set(siteDesignPreviewCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: cookieDomain,
    maxAge: siteDesignPreviewMaxAge(),
  });
  return response;
}
