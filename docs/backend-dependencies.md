# Unresolved backend dependencies

This document tracks only backend contracts that are still unresolved for the
current frontend. The current API specification (`docs/api_spec.json` and
`docs/api_spec_doc.md`) and the current application code are the source of
truth. Historical design notes and prototypes are not API contracts.

Until a dependency below is resolved, the frontend keeps the documented
fallback behavior.

Backend requests raised by the 2026-08-12 UI overhaul are tracked separately in
`docs/backend-requests-2026-08-12.md`.

## `metadata.isLatest`

- **Current fallback:** Daily-page metadata reads `isLatest` defensively as an
  optional boolean. When absent, it remains `null`, and latest/archive context
  comes from the route and page mode.
- **Backend dependency:** Confirm whether `GET /pages/daily/latest` and
  `GET /pages/daily` return `metadata.isLatest: boolean`, then add it to the API
  specification if supported.
- **Frontend follow-up:** Use the server value in the page view model instead
  of relying solely on route context.

## D-06: Multiple versions for one business date

- **Current fallback:** A page can display its `pageId` and `versionNo`, but
  there is no version picker. Lookup prefers an explicit `pageId`; otherwise
  the current daily-page API behavior determines the version.
- **Backend dependency:** Provide a version list for a business date. The
  existing single-page `versionNo` query is not sufficient to discover the
  available versions.
- **Frontend follow-up:** Add a query hook and version selector to the archive
  page header.

## D-11: Advanced trigger-option authorization and audit policy

- **Current fallback:** Users with the existing advanced-trigger capability
  can submit `force` and `rebuildPageOnly`. The UI warns that authorization and
  audit policy for these options is not yet settled.
- **Backend dependency:** Define whether either option needs its own permission
  and specify the audit records required when each option is used.
- **Frontend follow-up:** Split `ops.advancedTriggerOptions` into option-level
  capabilities if required and remove the warning once the policy is explicit.

## D-13: Structured omissions for `PARTIAL` pages

- **Current fallback:** The UI presents `partialMessage` as supplied because it
  cannot identify omitted sections or their causes structurally.
- **Backend dependency:** Add a structured field such as
  `missingSections: [{ section, reasonCode }]`.
- **Frontend follow-up:** Map the field and present section-specific omission
  reasons instead of relying only on free-form text.

## Distinguishing 401 from 403

- **Current fallback:** The API client distinguishes expired authentication
  from insufficient permission using the HTTP status alone.
- **Backend dependency:** Guarantee a stable response-body error code for both
  401 and 403 responses, for example `AUTH_EXPIRED` and `FORBIDDEN`, in addition
  to the correct HTTP status.
- **Frontend follow-up:** Combine status and error code when selecting recovery
  actions and user-facing messages.

## Existing `jobId` in 409 trigger conflicts

- **Current fallback:** For `BATCH_ALREADY_RUNNING`, the UI shows a link to the
  existing job only when a usable job identifier is present in the response.
- **Backend dependency:** Guarantee that the 409 response includes the running
  job's `jobId`.
- **Frontend follow-up:** Make the existing-job link unconditional for this
  conflict type.

## D-16: Refresh interval and completion SLA

- **Current fallback:** React Query polls active batch lists and details every
  five seconds and stops polling once no active job remains. The interval is a
  frontend constant rather than a backend-confirmed policy.
- **Backend dependency:** Define the expected batch-completion SLA and a polling
  interval that the backend can support safely.
- **Frontend follow-up:** Tune or configure `refetchInterval` from that policy
  instead of relying on the fixed five-second fallback.
