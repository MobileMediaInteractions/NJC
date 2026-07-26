# Future Alpha and Beta Access

## Purpose

The New Jersey Courier needs controlled alpha and beta release channels so that unfinished platform releases, features, experiments, and themes can be made available only to selected users. This must work across the website, mobile apps, Apple TV, Android TV, Roku, and future supported platforms.

This document is a future implementation requirement. It does not activate alpha or beta access by itself.

## Core principle

Alpha and beta access should be modeled as release-channel assignments or capabilities associated with an account, not as replacements for newsroom roles such as administrator, editor, producer, or reporter. A person can therefore remain a reader or staff member while separately receiving access to an alpha or beta channel.

The initial channels should be:

- `production`: Stable features available to their intended public or staff audience.
- `beta`: Pre-release features considered usable but still undergoing broader testing.
- `alpha`: Early and potentially incomplete features available to a small, explicitly approved group.

Alpha access should normally include beta access. Administrators must still be explicitly enrolled when testing is desired; administrator status alone should not silently expose unfinished features.

## Selective access requirements

Studio must allow an authorized administrator to:

- Assign or remove alpha and beta access for an individual user.
- Limit an assignment to one or more platforms, such as web, iOS, Android, Apple TV, Android TV, or Roku.
- Grant access to a specific feature, theme, experiment, or complete release channel.
- Set an optional start date, expiration date, and reason for the assignment.
- Review who currently has access and when the access was last used.
- Revoke access immediately.
- Search and filter assignments by user, platform, feature, theme, channel, and status.
- See an audit history of who granted, changed, or revoked access.

Users must not be able to enroll themselves by changing client storage, request parameters, device settings, or application files.

## Feature and theme targeting

Every future-gated item should have a stable identifier and configuration similar to:

- Feature or theme key.
- Display name and internal description.
- Minimum application version.
- Supported platforms.
- Required release channel.
- Optional list of specifically included or excluded accounts.
- Start and end time.
- Enabled, paused, or retired state.
- Safe production fallback.

Themes may be limited independently from functional features. For example, a beta reader could receive a new web theme without gaining access to an unrelated alpha television experience.

If a gated theme is removed, expires, or becomes incompatible, the application must immediately fall back to the user's valid production theme without breaking navigation or making content unreadable.

## Platform behavior

### Website

- Resolve access on the server before rendering protected functionality.
- Do not rely only on hidden buttons, client-side route guards, cookies, or local storage.
- Ensure page metadata, server actions, APIs, and streamed content follow the same access decision.
- Allow a selected user to preview a feature or theme after signing in without exposing it to anonymous visitors.

### Mobile and television applications

- Resolve eligibility from the authenticated account and current device session.
- Return a signed or otherwise server-verifiable capability response containing only the flags needed by that app.
- Respect minimum and maximum compatible app versions.
- Cache the last valid configuration only for a short, defined period so revocation takes effect promptly.
- Fall back safely when offline, when configuration is unavailable, or when the application version does not support the selected feature.
- Never place secret features, credentials, or privileged API data in a public flag response.

Roku, Apple TV, and Android TV access must become active only after the television is linked to an eligible account. Logging out or revoking the linked session must remove gated access. Alpha, beta, and production users should use the same installed application; entitlement controls the in-app assets, flair, themes, and features. Platform launch icons and pre-authentication splash screens that cannot know the current account must remain production-branded.

## Release workflow

A normal rollout should follow this progression:

1. Create the feature or theme in a disabled state.
2. Enable it for internal alpha users on selected platforms.
3. Record feedback, errors, performance, compatibility, and usage.
4. Fix blocking issues and expand to selected beta users.
5. Optionally roll out to a small percentage of eligible production users.
6. Promote it to production after approval and verification.
7. Retire the temporary gate after the transition is complete.

Every feature needs a kill switch that disables it without requiring a new client release. Disabling a feature must preserve a tested production fallback.

## Suggested future data model

The implementation should adapt to the repository schema present at that time, but will likely need records equivalent to:

- Release channels.
- Feature and theme definitions.
- Platform compatibility rules.
- User or account channel assignments.
- Specific feature/theme grants and denials.
- Percentage or cohort rollout rules.
- Assignment expiration and revocation.
- Evaluation and administrative audit events.

Feature evaluation should produce a clear allow or deny result using the account, platform, app version, feature key, current time, and active grants. Sensitive decisions must be enforced by the backend rather than trusted from the client.

## Studio experience

Studio should include a dedicated **Releases** or **Alpha & Beta** configuration area with:

- A summary of active alpha, beta, and production releases.
- User enrollment and revocation controls.
- Platform and version targeting.
- Feature and theme targeting.
- Scheduled activation and expiration.
- A preview of the exact audience that will receive a change.
- A warning before enabling an experimental release for a larger audience.
- Rollback and emergency-disable controls.
- Audit logs and rollout health indicators.

Destructive or broad rollout changes should require confirmation. Emergency disablement should remain fast and must not require typing a confirmation phrase if that delay could leave a broken experience live.

## Security and privacy

- Authenticate every evaluation request.
- Authorize Studio changes using a specific release-management capability.
- Rate-limit evaluation and management endpoints.
- Validate feature keys, platform names, application versions, dates, and user identifiers.
- Prevent account enumeration through eligibility responses.
- Do not reveal the names of restricted internal experiments to ineligible users.
- Audit all grants, denials, revocations, rollout changes, and emergency actions.
- Do not use alpha or beta enrollment as permission to access unrelated newsroom or administrative functions.

## Notifications and feedback

Selected testers should be clearly told that they are using a pre-release experience. The interface should provide:

- A visible alpha or beta indicator that does not obstruct normal use.
- A feedback and bug-report action carrying the platform, app version, feature key, and non-sensitive diagnostic context.
- Release notes describing known limitations.
- An option to leave an optional beta program when policy permits it.

Alpha users may be intentionally managed only by administrators. Leaving a program must never grant access to another channel.

## Testing requirements

Before this system is considered complete, tests must cover:

- Production, beta, and alpha inheritance behavior.
- Individual grants and explicit denials.
- Platform-specific and theme-specific targeting.
- Version compatibility and required-upgrade states.
- Start times, expiration, revocation, and clock boundaries.
- Server-rendered web access and API authorization.
- Linked and unlinked television accounts.
- Offline caching and safe fallback behavior.
- A user losing eligibility while an application is open.
- Kill switches and rollback.
- Attempts to forge flags, roles, account IDs, or client versions.
- Audit-log creation for sensitive changes.

## Completion criteria

This future work is complete only when selected users can reliably receive a designated feature or theme on designated platforms, non-selected users always receive the stable fallback, access can be revoked promptly, and every privileged change is enforced server-side and auditable.
