# NJC Distribution

NJC Distribution is the Courier’s private, pre-publication release library. It
runs from the existing `njc-web` deployment at
`distribution.thejerseycourier.com`, but uses a separate visual shell,
recipient authorization policy, private storage namespace, and audit trail.
It never publishes material to the public Courier, NJC+, API, or CDN.

## Architecture and access

- Clerk supplies account identity. Recipient access requires a signed-in
  account with a verified email.
- Neon stores packages, immutable advance-story snapshots, private file
  metadata, recipient grants, personal organization, playback progress, and
  audit events.
- Private Vercel Blob stores every distribution binary. Recipient APIs expose
  opaque file IDs and authenticated endpoints, never Blob URLs or pathnames.
- Studio managers are administrators, editors, and producers. Recipients need
  no staff role; an active grant is their authority.
- Recipient delivery requires `DISTRIBUTION_ENABLED=true` and Studio’s
  **Secure distribution** feature switch. Managers may prepare packages while
  delivery is disabled.

## Package lifecycle

1. Create a draft at `/studio/distribution`.
2. Attach an eligible draft, review, or scheduled story. The attachment stores
   an immutable headline, summary, body, category, source update time, and
   capture time, so later edits cannot silently alter the advance copy.
3. Upload supported files to private Blob.
4. Set availability, embargo notice, expiration, terms, and download policy.
5. Find an account by name, username, or email and grant a start/end window.
   The target must have a verified email.
6. Mark the package `available`. Package and grant windows must both be active.
7. Revoke the package or grant to block subsequent requests.

Download policy is explicit: `view_only` disables originals,
`grant_controlled` uses the recipient switch, and `download` permits every
active recipient. Distribution availability never triggers public publishing.

## Domain and configuration

Attach `distribution.thejerseycourier.com` to the existing `njc-web` Vercel
project. Do not attach it to the static CDN. Add the hostname to Clerk’s
production custom/satellite-domain configuration.

```dotenv
NEXT_PUBLIC_DISTRIBUTION_HOST=distribution.thejerseycourier.com
NEXT_PUBLIC_DISTRIBUTION_URL=https://distribution.thejerseycourier.com
DISTRIBUTION_ENABLED=false
PRIVATE_BLOB_READ_WRITE_TOKEN=
```

Keep the operational switch false until DNS, Clerk, migration `0020`, private
Blob, and authorization checks pass. The host is no-index/no-follow/no-archive,
sends no referrer, and must remain outside sitemaps and Search Console.

## Upload, viewer, and player boundaries

The first release accepts JPEG, PNG, WebP, MP4, WebM, MP3, M4A, WAV, Ogg, PDF,
plain text, CSV, and JSON up to 250 MB. HTML, SVG, scripts, executables, and
unknown active formats are rejected. Playback still depends on browser codec
support; a file extension alone does not guarantee compatibility.

The custom player supports private byte-range seeking, keyboard control,
speed, fullscreen video, and progress. The viewer supports images, escaped
text, and sandboxed PDFs. Unsupported files are not rendered inline.

This proprietary viewer is not DRM. Authorization, terms, and view-only
controls cannot prevent photography or screen recording. No malware scanner or
transcoder currently exists; do not claim either or widen the allowlist until
one is implemented and verified. Large streams use Blob and Function transfer,
so validate current account quotas before raising limits.

## Migration, backup, and restore

Migration `0020` creates the Distribution tables and constraints. Story-backed
items require an immutable snapshot at the database layer.

Portable backup explicitly includes Distribution tables. Its private-store
enumeration includes Distribution files when media is selected. A restore must
apply migrations, restore rows in dependency order, restore binaries to a
private store, update pathnames if needed, rotate all secrets, and leave
Distribution disabled until integrity and authorization checks pass.

## Production checklist

- Unauthenticated users cannot see package names.
- Accounts without grants receive an empty library.
- Unauthorized, expired, revoked, and unknown resources return the same 404.
- Attached story content remains unchanged when its source story is edited.
- API responses never reveal Blob URLs or pathnames.
- Range seeking works and new requests stop after revocation.
- All download policies behave as documented.
- Individual content sorts by name, media type, size, and date and filters by
  personal collection/favorite state.
- Upload callback retries do not duplicate files or package items.
- No Distribution URL appears in public metadata, feeds, sitemaps, or CDN.
- Portable export and restore include every Distribution table and selected
  private file.
