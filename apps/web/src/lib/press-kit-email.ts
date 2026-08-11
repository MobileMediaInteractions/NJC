import "server-only";

type PressEmailInput = {
  to: string;
  subject: string;
  text: string;
  eventId: string;
};

export async function sendPressKitEmail(input: PressEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.PRESS_EMAIL_FROM?.trim();
  if (!apiKey || !from || !input.to) return { sent: false, reason: "not_configured" } as const;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "Idempotency-Key": `njc-press-${input.eventId}`.slice(0, 256),
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        tags: [{ name: "workflow", value: "press_kit" }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.error("Press Kit email delivery failed", { status: response.status, eventId: input.eventId });
      return { sent: false, reason: "provider_error" } as const;
    }
    return { sent: true } as const;
  } catch (error) {
    console.error("Press Kit email delivery failed", { eventId: input.eventId, error: error instanceof Error ? error.message : "unknown_error" });
    return { sent: false, reason: "provider_error" } as const;
  }
}
