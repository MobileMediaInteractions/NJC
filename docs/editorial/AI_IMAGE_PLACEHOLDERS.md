# AI story-image placeholders

Studio can generate a temporary, photorealistic editorial illustration from a
draft's headline, summary, dateline, section and article copy. This feature is
for layout, pitch and review work when approved photography or artwork has not
arrived. It is not a way to manufacture documentary evidence.

## Editorial behavior

- The automatic prompt uses only the current story copy plus an optional visual
  direction of up to 400 characters. Editors do not need to write a prompt.
- The prompt asks for an original horizontal editorial concept with no text,
  logos, named-person likenesses or fabricated depiction of a specific event.
- Every result is stored in the normal Vercel Blob media library with provider,
  model, prompt, seed, story digest, creator and creation time provenance.
- Studio labels the image `Temporary AI illustration` in both the media panel
  and live reader preview.
- Drafts and review submissions may retain a placeholder. Approval, scheduled
  publication, immediate publication and approval of a live-story revision all
  fail closed until the placeholder is replaced with editorial media or
  removed.
- Uploading a replacement resets the lead image to `editorial`, updates media
  usage tracking and invalidates any approval through the existing material-
  change workflow.
- Generation is authenticated, audited and limited to eight attempts per
  Studio account per hour. Cloudflare's own free-plan daily limit remains the
  outer cost control.

AI output can still contain inaccuracies, stereotypes, unsafe details or
misleading visual implications. An editor must inspect every result. The
publication blocker is mandatory and is not represented as a client-side
warning alone.

## Free provider setup

The adapter uses Cloudflare Workers AI's REST API and defaults to
`@cf/black-forest-labs/flux-1-schnell`. Cloudflare documents a free daily
allocation; when it is exhausted, generation fails without attaching media or
falling through to a paid provider. Verify the current provider terms and model
license before production use.

Create a least-privilege Workers AI token with read and edit access, then add
these server-only variables to the Vercel project:

```dotenv
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_WORKERS_AI_TOKEN=
CLOUDFLARE_AI_IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell
```

`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, and Upstash/KV should already be
connected. Never expose the Workers AI token through a `NEXT_PUBLIC_` variable.

After the variables are deployed, an administrator can open **Studio → Site
configuration → Studio**, enable **AI image placeholders**, review the impact,
enter the required change reason and save a new configuration revision. The
feature defaults off for old and new installations.

## Production acceptance

1. Create a draft with a real headline, summary and body.
2. Generate an image without visual direction and confirm the preview, label,
   alt text, audit event and media-library provenance.
3. Regenerate with a short visual direction and confirm the earlier asset
   remains independently auditable.
4. Submit the draft for review and verify approval returns
   `lead_media_temporary_ai_placeholder`.
5. Upload a real replacement, save, repeat independent review and confirm the
   story can then be approved, scheduled and published.
6. Exhaust a test rate window and verify a `429` with a bounded retry time.
7. Disable the feature and remove either provider credential in separate tests;
   Studio must explain the unavailable state and the API must fail closed.
8. Review the generated image and stored prompt for privacy, copyright,
   misinformation and newsroom-policy concerns before enabling the feature for
   staff.

The provider adapter is intentionally isolated from the editor and story
workflow. A future provider can replace Cloudflare without changing the stored
provenance or publication safety contract.
