# Edits to upstream OpenBSP UI files

Every change we make to a file that came from upstream OpenBSP UI is listed here, so upstream
merges can be resolved quickly. Our own code (no entry needed): `src/queries/useCrm.ts`,
`src/utils/crmRoles.ts`, `src/components/OrgStatusBanner.tsx`,
`src/components/OrgProfileForm.tsx`, `src/routes/_auth/settings/roles/**`, `docs/`.
Edits inside upstream files are marked with a `[crm]` comment.

| Date | File | Change | Why | Task |
|---|---|---|---|---|
| 2026-10-21 | `src/routes/_auth.tsx` | Renders `OrgStatusBanner` as a full-width first grid row when the user has a suspended or pending-deletion organization. | Suspended banner. | P1-01 |
| 2026-10-21 | `src/routes/_auth/settings/organization/index.tsx` | Adds `OrgProfileForm` (slug, timezone, language); delete becomes a deletion request with a 30-day grace period; gating uses crm permissions. | Org profile fields; upstream hard delete is now blocked by policy. | P1-01 |
| 2026-10-21 | `src/routes/_auth/settings/members/new.tsx` | Role picker over the eight crm roles; invites through the `crm-invitations` edge function. | Role picker, email invite. | P1-02, P1-03 |
| 2026-10-21 | `src/routes/_auth/settings/members/$memberId.tsx` | Role picker calls `crm.set_member_role`; removing someone else calls `crm.deactivate_member`; editing the name sends only the name. | Role picker. | P1-02, P1-03 |
| 2026-10-21 | `src/routes/_auth/settings/members/index.tsx` | Shows crm role names; invite/revoke gated on `members.invite`; revoke via `crm.revoke_invitation`. | Role names, permission gating. | P1-02 |
| 2026-10-21 | `src/routes/_auth/settings/index.tsx` | "Roles & permissions" entry. | Permission toggles page. | P1-02 |
| 2026-10-21 | `src/queries/queryKeys.ts` | `crm` key group. | Cache keys for crm queries. | P1-02 |
| 2026-10-21 | `public/locales/en.json` | 35 new strings appended. | Translations for the new UI. | P1-01–P1-03 |
| 2026-10-21 | `src/routeTree.gen.ts` | Regenerated (generated file): adds `/settings/roles` routes. | New routes. | P1-02 |
| 2026-10-21 | `src/supabase/db_types.ts` | Copied from the API's regenerated `_shared/db_types.ts` (now includes `crm`; `billing` kept). | crm types. | P1-02 |
