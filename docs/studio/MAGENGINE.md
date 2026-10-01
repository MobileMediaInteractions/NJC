# Studio AdminLTE and MagEngine

## Studio shell

The Studio route tree loads Bootstrap 5 and AdminLTE 4 only from the Studio
layout. A shared AdminLTE application shell wraps existing workspaces, retaining
their current server routes, permissions, navigation, command palette, team
chat, notification controls, role-specific actions and existing feature
components. The shared Studio theme follows the account's system/light/dark
preference. This is a shared presentation migration, not a second copy of the
CMS or its APIs.

AdminLTE and Bootstrap are distributed under the MIT license. Their upstream
source and documentation are [AdminLTE](https://github.com/ColorlibHQ/AdminLTE)
and [Bootstrap](https://getbootstrap.com/). Studio imports pinned AdminLTE and
Bootstrap versions from the `apps/web` package manifest.

## MagEngine scope

MagEngine is a publishing-role-only Studio workspace at `/studio/mag-engine`.
It supports:

- Creating an editorial magazine project with structured pages (kicker,
  headline, copy and an image selected from active public newsroom media).
- Saving drafts, submitting them to internal review, marking them approved, or
  archiving them.
- Uploading a PDF export produced by Blurb BookWright to private Vercel Blob
  storage. The imported source PDF is preserved, not edited or re-exported.
- Opening a protected Studio preview. PDF.js rasterizes the PDF for display and
  StPageFlip supplies page-turn interaction. Preview work starts only when the
  editor requests it, which avoids restarting a large-document render during
  ordinary text entry.

The native composer is an editorial page model, not a general desktop-publishing
replacement. The BookWright import is a PDF import (it does not read native
BookWright project files), and the flipbook is a screen preview, not a print
proof. Source material is never silently altered. At present, even `approved`
is only an internal Studio workflow state: there is no reader-facing issue
route, public download, or scheduled magazine publication in this feature.

## Security and data

- Studio API access requires a Clerk staff identity with the existing
  `admin`, `editor` or `producer` role and the MagEngine configuration module
  enabled. No client-controlled role grants access.
- Source PDFs are private Blob objects. The browser receives neither their
  storage path nor a permanent public URL; the preview endpoint checks staff
  role, feature configuration, database record and asset state before proxying
  the private object with `Cache-Control: private, no-store`.
- Native page imagery is restricted server-side to active, public image records
  from the newsroom media library. Arbitrary filesystem paths and arbitrary
  upload URLs are not accepted.
- Magazine projects are included in encrypted portable database backups. The
  associated PDF file is included only through the existing explicit media
  backup option; the private Blob token value is never exported.
- Create/update actions are written to the existing API audit log.

## Deployment

Apply the generated `studio_magazines` migration before production use. The
production project needs a private Vercel Blob store and
`PRIVATE_BLOB_READ_WRITE_TOKEN`. Keep the feature disabled until the migration
and private-store access have been verified. This module does not require a new
domain or deployment project.

## Follow-up verification

See the MagEngine section in [`TODO.md`](../../TODO.md). In particular, verify
real BookWright PDF exports and page rendering on target browsers, assess large
files and accessibility, capture the protected Studio screen in light and dark
mode, and agree on any future reader publication and licensing workflow before
adding public access.
