# Edits to upstream OpenBSP UI files

Every change we make to a file that came from upstream OpenBSP UI is listed here, so upstream
merges can be resolved quickly. Our own code (no entry needed): `src/queries/useCrm.ts`,
`src/utils/crmRoles.ts`, `src/components/OrgStatusBanner.tsx`,
`src/components/OrgProfileForm.tsx`, `src/utils/auditLog.ts`,
`src/routes/_auth/settings/roles/**`, `src/routes/_auth/settings/activity/**`,
`src/routes/auth.confirm.tsx`, `src/routes/_auth/settings/rules/**`,
`src/components/SettingEditor.tsx`, `src/utils/settings.ts`,
`src/components/BusinessDetailsForm.tsx`, `src/routes/_auth/settings/disclaimer/**`,
`src/components/ContactFieldsForm.tsx`, `src/components/CustomFieldForm.tsx`,
`src/routes/_auth/settings/fields/**`, `docs/`.
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
| 2026-10-21 | `src/routes/_auth/settings/index.tsx` | "Activity log" entry, shown only with `audit.view`. | Audit log page. | P1-08 |
| 2026-10-21 | `src/queries/queryKeys.ts` | `crm.auditLog` key. | Audit log cache key. | P1-08 |
| 2026-10-21 | `public/locales/en.json` | 53 new strings appended. | Activity log sentences and filters. | P1-08 |
| 2026-10-21 | `src/routeTree.gen.ts` | Regenerated: adds `/settings/activity`. | New route. | P1-08 |
| 2026-10-21 | `src/supabase/db_types.ts` | Re-copied from the API (adds `crm.audit_log`, `get_audit_log`, `write_audit`). | Audit types. | P1-08 |
| 2026-10-21 | `src/routes/__root.tsx` | `/auth/confirm` is reachable signed out (added to the login redirect's exceptions). | Email links sign people in there. | P1-03 |
| 2026-10-21 | `src/routes/_auth/conversations/index.tsx` | The invitation card names the crm role offered (via `crm.get_my_invitation_roles`), falling back to the tier. | Card said "Member" for every crm role. | P1-03 |
| 2026-10-21 | `src/queries/queryKeys.ts` | `crm.myInvitationRoles` key. | Cache key. | P1-03 |
| 2026-10-21 | `public/locales/en.json` | 4 new strings appended. | `/auth/confirm` page. | P1-03 |
| 2026-10-21 | `src/routeTree.gen.ts` | Regenerated: adds `/auth/confirm`. | New route. | P1-03 |
| 2026-10-21 | `src/supabase/db_types.ts` | Re-copied from the API (adds `get_my_invitation_roles`). | Types. | P1-03 |
| 2026-10-21 | `src/routes/_auth/settings/index.tsx` | "Rules & modules" entry. | Settings screen. | P1-04 |
| 2026-10-21 | `src/queries/queryKeys.ts` | `crm.settings` key. | Cache key. | P1-04 |
| 2026-10-21 | `public/locales/en.json` | 33 new strings appended. | Settings screen, setting and team activity entries. | P1-04 |
| 2026-10-21 | `src/routeTree.gen.ts` | Regenerated: adds `/settings/rules`. | New route. | P1-04 |
| 2026-10-21 | `src/supabase/db_types.ts` | Re-copied from the API (settings and teams). | Types. | P1-04 |
| 2026-10-21 | `src/routes/_auth/settings/organization/index.tsx` | Adds `BusinessDetailsForm` under the profile. | Business details. | P1-07 |
| 2026-10-21 | `src/routes/_auth/settings/index.tsx` | "Disclaimer" entry. | Disclaimer page. | P1-07 |
| 2026-10-21 | `src/queries/queryKeys.ts` | `crm.disclaimers`, `disclaimerPreview`, `disclaimerTemplates` keys. | Cache keys. | P1-07 |
| 2026-10-21 | `public/locales/en.json` | 41 new strings appended; `completo`/`corto` lowercase. | Business details, disclaimer page, activity sentences. | P1-07 |
| 2026-10-21 | `src/routeTree.gen.ts` | Regenerated: adds `/settings/disclaimer`. | New route. | P1-07 |
| 2026-10-21 | `src/supabase/db_types.ts` | Re-copied from the API (business details, disclaimers). | Types. | P1-07 |
| 2026-10-21 | `src/routes/_auth/contacts/$addressId.tsx` | Adds the `ContactFieldsForm` (Details) section; the contact form gets `grow-0` so Details follows it. | Custom field values on the contact page. | P1-06 |
| 2026-10-21 | `src/routes/_auth/settings/index.tsx` | "Custom fields" entry. | Field definitions screen. | P1-06 |
| 2026-10-21 | `src/queries/queryKeys.ts` | `crm.customFields`, `crm.contactByAddress` keys. | Cache keys. | P1-06 |
| 2026-10-21 | `public/locales/en.json` | 38 new strings appended. | Custom fields screens, contact details, activity sentences. | P1-06 |
| 2026-10-21 | `src/routeTree.gen.ts` | Regenerated: adds `/settings/fields`, `/settings/fields/new`, `/settings/fields/$fieldId`. | New routes. | P1-06 |
| 2026-10-21 | `src/supabase/db_types.ts` | Re-copied from the API (contacts, custom fields). | Types. | P1-06 |
