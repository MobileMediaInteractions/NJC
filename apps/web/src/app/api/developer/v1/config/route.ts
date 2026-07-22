import { NextResponse } from "next/server";
import { authorizeDeveloperRequest } from "@/lib/developer-api";
import { getSiteConfiguration } from "@/lib/site-settings";

export async function GET(request: Request) {
  const auth = await authorizeDeveloperRequest(request, "news:read");
  if (auth.response) return auth.response;
  const configuration = await getSiteConfiguration();
  return NextResponse.json({
    data: {
      ...configuration.publication,
      navigation: configuration.navigation,
      features: configuration.features,
    },
    meta: { apiVersion: "1" },
  }, { headers: auth.headers });
}
