// [crm] Queries for our CRM layer (Postgres schema `crm`): organization
// profile and lifecycle, roles and permissions, invitations with a crm role.
// The database enforces every rule; these hooks only read and call it.
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { invokeFunction, supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import type { Database, Json } from "@/supabase/db_types";
import { queryKeys } from "./queryKeys";
import { useCurrentAgent } from "./useAgents";

const crm = () => supabase.schema("crm");

/** The active organization's profile: slug, timezone, locale, status. */
export function useOrgProfile() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.profile(orgId),
    queryFn: async () =>
      await crm()
        .from("organization_profiles")
        .select()
        .eq("organization_id", orgId!)
        .maybeSingle()
        .throwOnError(),
    enabled: !!orgId,
    select: (data) => data.data,
  });
}

export type OrgProfileUpdate = {
  slug: string;
  timezone: string;
  locale: string;
};

export function useUpdateOrgProfile() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (data: OrgProfileUpdate) => {
      if (!orgId) throw new Error("No active organization");
      await crm()
        .from("organization_profiles")
        .update({
          slug: data.slug.trim().toLowerCase(),
          timezone: data.timezone,
          locale: data.locale,
        })
        .eq("organization_id", orgId)
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.profile(orgId),
      });
    },
  });
}

/** The caller's effective permissions in the active organization. */
export function useMyPermissions() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);

  const query = useQuery({
    queryKey: queryKeys.crm.myPermissions(orgId, userId),
    queryFn: async () =>
      await crm()
        .rpc("my_permissions", { p_organization_id: orgId! })
        .throwOnError(),
    enabled: !!orgId && !!userId,
    select: (data) => new Set<string>(data.data ?? []),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    can: (permission: string) => query.data?.has(permission) ?? false,
  };
}

/** Organizations the user belongs to that are suspended or being deleted. */
export function useMyOrgStatuses() {
  const userId = useBoundStore((state) => state.ui.user?.id);

  return useQuery({
    queryKey: queryKeys.crm.statuses(userId),
    queryFn: async () =>
      await crm().rpc("get_my_organization_statuses").throwOnError(),
    enabled: !!userId,
    select: (data) => data.data ?? [],
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useRequestOrgDeletion() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No active organization");
      await crm()
        .rpc("request_organization_deletion", { p_organization_id: orgId })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all(),
      });
    },
  });
}

export function useCancelOrgDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      await crm()
        .rpc("cancel_organization_deletion", {
          p_organization_id: organizationId,
        })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all(),
      });
    },
  });
}

// 2FA (P1-11) ----------------------------------------------------------------------

/**
 * Turning this on needs the caller's OWN session to already be aal2
 * (crm.set_require_mfa_for_admins' own guard) — "enable two-factor
 * authentication on your own account first" is the database's message when
 * it isn't, shown as-is.
 */
export function useSetRequireMfaForAdmins() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (required: boolean) => {
      if (!orgId) throw new Error("No active organization");
      await crm()
        .rpc("set_require_mfa_for_admins", {
          p_organization_id: orgId,
          p_required: required,
        })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.profile(orgId),
      });
    },
  });
}

/**
 * Whether the signed-in member would hold their admin/owner-tier
 * permissions in the active organization if they verified a 2FA code right
 * now — true when they currently don't because the organization requires it
 * and their session is only aal1. Distinguishes "needs a step-up" from
 * "doesn't have this permission at all," which crm.get_permitted_orgs can't
 * (it silently drops the org in both cases).
 */
export function useNeedsMfaStepUp() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.needsMfaStepUp(orgId),
    queryFn: async () =>
      await crm()
        .rpc("needs_mfa_step_up", { p_organization_id: orgId! })
        .throwOnError(),
    enabled: !!orgId,
    select: (data) => data.data === true,
  });
}

export type CrmRole = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  tier: "owner" | "admin" | "member";
  is_locked: boolean;
  sort_order: number;
  permissions: string[];
};

/** The organization's roles with the permissions each one holds. */
export function useRoles() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.roles(orgId),
    queryFn: async () =>
      await crm()
        .from("roles")
        .select(
          "id, key, name, description, tier, is_locked, sort_order, role_permissions(permission)",
        )
        .eq("organization_id", orgId!)
        .order("sort_order")
        .throwOnError(),
    enabled: !!orgId,
    select: (data): CrmRole[] =>
      data.data.map(({ role_permissions, ...role }) => ({
        ...role,
        permissions: role_permissions.map((rp) => rp.permission),
      })),
  });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: queryKeys.crm.catalog(),
    queryFn: async () =>
      await crm()
        .from("permissions")
        .select("key, category, description, min_tier, sort_order")
        .order("sort_order")
        .throwOnError(),
    select: (data) => data.data,
    staleTime: Infinity,
  });
}

export function useSetRolePermission() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (args: {
      roleId: string;
      permission: string;
      enabled: boolean;
    }) => {
      await crm()
        .rpc("set_role_permission", {
          p_role_id: args.roleId,
          p_permission: args.permission,
          p_enabled: args.enabled,
        })
        .throwOnError();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.roles(orgId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.myPermissionsAll(orgId),
      });
    },
  });
}

export function useResetRolePermissions() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (roleId: string) => {
      await crm()
        .rpc("reset_role_permissions", { p_role_id: roleId })
        .throwOnError();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.roles(orgId),
      });
    },
  });
}

/** agent id → crm role id, for the active organization. */
export function useMemberRoles() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.memberRoles(orgId),
    queryFn: async () =>
      await crm()
        .from("member_roles")
        .select("agent_id, role_id")
        .eq("organization_id", orgId!)
        .throwOnError(),
    enabled: !!orgId,
    select: (data) =>
      new Map<string, string>(data.data.map((r) => [r.agent_id, r.role_id])),
  });
}

/**
 * invitation id → name of the crm role offered, for the signed-in user's own
 * pending invitations (the invitation card). The invitee cannot read the
 * organization's roles yet, so this goes through crm.get_my_invitation_roles.
 */
export function useMyInvitationRoles() {
  const userId = useBoundStore((state) => state.ui.user?.id);

  return useQuery({
    queryKey: queryKeys.crm.myInvitationRoles(userId),
    queryFn: async () =>
      await crm().rpc("get_my_invitation_roles").throwOnError(),
    enabled: !!userId,
    select: (data) =>
      new Map<string, string>(
        (data.data ?? []).map((r) => [r.invitation_id, r.role_name]),
      ),
  });
}

/** invitation id → crm role id, for the active organization. */
export function useInvitationRoles() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.invitationRoles(orgId),
    queryFn: async () =>
      await crm()
        .from("invitation_roles")
        .select("invitation_id, role_id")
        .eq("organization_id", orgId!)
        .throwOnError(),
    enabled: !!orgId,
    select: (data) =>
      new Map<string, string>(
        data.data.map((r) => [r.invitation_id, r.role_id]),
      ),
  });
}

export function useSetMemberRole() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (args: { agentId: string; roleKey: string }) => {
      await crm()
        .rpc("set_member_role", {
          p_agent_id: args.agentId,
          p_role_key: args.roleKey,
        })
        .throwOnError();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.memberRoles(orgId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all(orgId),
      });
    },
  });
}

// [crm] P2-12: the numbers a member is restricted to -- an allowlist. No
// rows means unrestricted (sees every shared number); this is the UI for
// crm.member_address_access, which has existed since Phase 1 but never had
// one until now.
export function useMemberAddressAccess(agentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.crm.memberAddressAccess(agentId),
    queryFn: async () =>
      await crm()
        .from("member_address_access")
        .select("service, address")
        .eq("agent_id", agentId!)
        .throwOnError(),
    enabled: !!agentId,
    select: (data) =>
      new Set(data.data.map((r) => `${r.service}:${r.address}`)),
  });
}

export function useSetMemberAddressAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      agentId: string;
      service: "whatsapp";
      address: string;
      allowed: boolean;
    }) => {
      await crm()
        .rpc("set_member_address_access", {
          p_agent_id: args.agentId,
          p_service: args.service,
          p_address: args.address,
          p_allowed: args.allowed,
        })
        .throwOnError();
    },
    onSuccess: (_data, { agentId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.memberAddressAccess(agentId),
      });
    },
  });
}

export function useDeactivateMember() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (agentId: string) => {
      await crm()
        .rpc("deactivate_member", { p_agent_id: agentId })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all(orgId),
      });
    },
  });
}

export type InviteResult = {
  invitation_id: string;
  email_delivery: "invite" | "magic_link" | "failed";
};

/** Invite by email with a crm role; the edge function also sends the email. */
export function useInviteMember() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (args: { email: string; roleKey: string }) => {
      if (!orgId) throw new Error("No active organization");
      try {
        return await invokeFunction<InviteResult>("crm-invitations", {
          method: "POST",
          body: {
            organization_id: orgId,
            email: args.email,
            role_key: args.roleKey,
          },
        });
      } catch (error) {
        // Surface the function's own message ("already a member…") instead of
        // the client's generic "non-2xx status code".
        if (error instanceof FunctionsHttpError) {
          const body = (await (error.context as Response)
            .json()
            .catch(() => null)) as { message?: string } | null;
          if (body?.message) throw new Error(body.message);
        }
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invitations.all(orgId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.invitationRoles(orgId),
      });
    },
  });
}

export function useRevokeCrmInvitation() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (invitationId: string) => {
      await crm()
        .rpc("revoke_invitation", { p_invitation_id: invitationId })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invitations.all(orgId),
      });
    },
  });
}

// Audit log (P1-08) ------------------------------------------------------------

export type AuditFilters = {
  /** The part of the action before the dot ("member", "role"…), or "". */
  area: string;
  /** The acting member's agent id, or "". */
  actor: string;
  /** "7", "30", "90", or "" for everything. */
  days: string;
};

export type AuditEntry = {
  id: number;
  created_at: string;
  actor_type: "user" | "api_key" | "service" | "system";
  actor_agent_id: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, unknown>;
};

const AUDIT_PAGE_SIZE = 50;

/**
 * The active organization's audit log, newest first, 50 entries a page.
 * Pass `allowed` (the caller holds audit.view) so nobody else fetches it.
 */
export function useAuditLog(filters: AuditFilters, allowed: boolean) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useInfiniteQuery({
    queryKey: queryKeys.crm.auditLog(orgId, filters),
    queryFn: async ({ pageParam }) => {
      const { data } = await crm()
        .rpc("get_audit_log", {
          p_organization_id: orgId!,
          p_limit: AUDIT_PAGE_SIZE,
          ...(pageParam !== null && { p_before_id: pageParam }),
          ...(filters.area && { p_area: filters.area }),
          ...(filters.actor && { p_actor: filters.actor }),
          ...(filters.days && {
            p_from: new Date(
              Date.now() - Number(filters.days) * 24 * 60 * 60 * 1000,
            ).toISOString(),
          }),
        })
        .throwOnError();
      // The generated type marks every column non-null; most can be null.
      return data as unknown as AuditEntry[];
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) =>
      lastPage.length === AUDIT_PAGE_SIZE
        ? lastPage[lastPage.length - 1].id
        : null,
    enabled: !!orgId && allowed,
  });
}

// Settings (P1-04) --------------------------------------------------------------

export type SettingSchema = {
  type?: "boolean" | "integer" | "number" | "string" | "array" | "object";
  properties?: Record<string, SettingSchema>;
  items?: SettingSchema;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  mustContain?: string[];
  required?: string[];
};

export type SettingRow = {
  key: string;
  category: string;
  label: string;
  description: string | null;
  schema: SettingSchema;
  value: unknown;
  /** The layer the value comes from. */
  source: "platform" | "pack" | "tenant" | "team" | "user";
  is_locked: boolean;
  tenant_value: unknown;
  can_edit: boolean;
  team_conflict: boolean;
};

/** Every setting with its effective value, for the active organization. */
export function useSettings() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.settings(orgId),
    queryFn: async () => {
      const { data } = await crm()
        .rpc("get_settings", { p_organization_id: orgId! })
        .throwOnError();
      // The generated type marks every column non-null and schema as Json.
      return data as unknown as SettingRow[];
    },
    enabled: !!orgId,
  });
}

/** Sets (value) or resets (null) the organization value of a setting. */
export function useSaveSetting() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      if (!orgId) throw new Error("No active organization");
      if (value === null) {
        await crm()
          .rpc("reset_setting", { p_organization_id: orgId, p_key: key })
          .throwOnError();
      } else {
        await crm()
          .rpc("set_setting", {
            p_organization_id: orgId,
            p_key: key,
            p_value: value as Json,
          })
          .throwOnError();
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.settings(orgId),
      });
    },
  });
}

// Business details and disclaimers (P1-07) ------------------------------------------

export type Registration = { type: string; number: string };

export type BusinessDetails = {
  legal_name: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  support_email: string;
  support_phone: string;
  website: string;
  registrations: Registration[];
};

export function useUpdateBusinessDetails() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (data: BusinessDetails) => {
      if (!orgId) throw new Error("No active organization");
      // Empty address fields are left out; an all-empty address is null.
      const address: Record<string, string> = Object.fromEntries(
        Object.entries(data.address)
          .map(([k, v]): [string, string] => [k, v.trim()])
          .filter(([, v]) => v !== ""),
      );
      await crm()
        .from("organization_profiles")
        .update({
          legal_name: data.legal_name,
          address: Object.keys(address).length ? address : null,
          support_email: data.support_email,
          support_phone: data.support_phone,
          website: data.website,
          registrations: data.registrations.filter((r) => r.number.trim()),
        })
        .eq("organization_id", orgId)
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.profile(orgId),
      });
    },
  });
}

export type Disclaimer = {
  kind: "short" | "full";
  locale: "en" | "hi";
  text: string | null;
  /** 0 = the pack's text. */
  version: number | null;
  source: "tenant" | "pack" | null;
};

/** The four disclaimers in force (short/full × English/Hindi). */
export function useDisclaimers() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.disclaimers(orgId),
    queryFn: async () => {
      const { data } = await crm()
        .rpc("get_disclaimers", { p_organization_id: orgId! })
        .throwOnError();
      return data as unknown as Disclaimer[];
    },
    enabled: !!orgId,
  });
}

/** Every saved version, newest first. */
export function useDisclaimerHistory() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: [...queryKeys.crm.disclaimers(orgId), "history"],
    queryFn: async () =>
      await crm()
        .from("disclaimer_versions")
        .select("id, kind, locale, version, text, created_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .throwOnError(),
    enabled: !!orgId,
    select: (data) => data.data,
  });
}

export function useSaveDisclaimer() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (d: { kind: string; locale: string; text: string }) => {
      if (!orgId) throw new Error("No active organization");
      await crm()
        .rpc("set_disclaimer", {
          p_organization_id: orgId,
          p_kind: d.kind,
          p_locale: d.locale,
          p_text: d.text,
        })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.disclaimers(orgId),
      });
    },
  });
}

export type RenderedMessage = {
  text: string;
  attached: boolean;
  disclaimer_kind: string | null;
  disclaimer_locale: string | null;
  disclaimer_version: number | null;
};

/** What a sender would send: the database's render_with_disclaimer. */
export function useDisclaimerPreview(
  contentType: string,
  locale: string,
  text: string,
) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.disclaimerPreview(orgId, contentType, locale, text),
    queryFn: async () => {
      const { data } = await crm()
        .rpc("render_with_disclaimer", {
          p_organization_id: orgId!,
          p_content_type: contentType,
          p_text: text,
          p_locale: locale,
        })
        .throwOnError();
      return (data as unknown as RenderedMessage[])[0] ?? null;
    },
    enabled: !!orgId && text.trim() !== "",
    retry: false,
  });
}

/** How many pack templates carry the disclaimer as their footer. */
export function useDisclaimerTemplateCount() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.disclaimerTemplates(orgId),
    queryFn: async () =>
      await crm()
        .from("organization_pack_items")
        .select("item_key, value")
        .eq("organization_id", orgId!)
        .eq("kind", "message_template")
        .throwOnError(),
    enabled: !!orgId,
    select: (data) =>
      data.data.filter(
        (i) =>
          (i.value as { attach_disclaimer?: boolean } | null)
            ?.attach_disclaimer === true,
      ).length,
  });
}

// Custom fields and person-level contacts (P1-06) -----------------------------------

export type FieldType =
  | "text"
  | "long_text"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "multi_select"
  | "email"
  | "phone"
  | "url";

export type Localized = { en: string; hi?: string };

export type FieldOption = {
  value: string;
  label: Localized;
  archived?: boolean;
};

export type FieldDefinition = {
  key: string;
  entity: "contact" | "deal";
  type: FieldType;
  label: Localized;
  required?: boolean;
  archived?: boolean;
  options?: FieldOption[];
};

export type CustomField = {
  id: string;
  key: string;
  definition: FieldDefinition;
  /** Comes from the pack (false = the organization's own field). */
  fromPack: boolean;
  sortOrder: number;
};

/** The organization's custom field definitions (all entities), in order. */
export function useCustomFields() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.customFields(orgId),
    queryFn: async () =>
      await crm()
        .from("organization_pack_items")
        .select("id, item_key, value, pack_value, sort_order")
        .eq("organization_id", orgId!)
        .eq("kind", "custom_field")
        .order("sort_order")
        .throwOnError(),
    enabled: !!orgId,
    select: (data): CustomField[] =>
      data.data.map((item) => ({
        id: item.id,
        key: item.item_key,
        definition: item.value as unknown as FieldDefinition,
        fromPack: item.pack_value !== null,
        sortOrder: item.sort_order,
      })),
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (f: FieldDefinition) => {
      if (!orgId) throw new Error("No active organization");
      await crm()
        .rpc("create_custom_field", {
          p_organization_id: orgId,
          p_entity: f.entity,
          p_key: f.key,
          p_type: f.type,
          p_label: f.label as unknown as Json,
          p_options: (f.options ?? []) as unknown as Json,
          p_required: f.required ?? false,
        })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.customFields(orgId),
      });
    },
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (f: { id: string } & FieldDefinition) => {
      await crm()
        .rpc("update_custom_field", {
          p_field_id: f.id,
          p_label: f.label as unknown as Json,
          p_options: (f.options ?? []) as unknown as Json,
          p_required: f.required ?? false,
        })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.customFields(orgId),
      });
    },
  });
}

export function useArchiveCustomField() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (f: { id: string; archived: boolean }) => {
      await crm()
        .rpc("archive_custom_field", {
          p_field_id: f.id,
          p_archived: f.archived,
        })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.customFields(orgId),
      });
    },
  });
}

export type CrmContact = {
  id: string;
  display_name: string | null;
  custom_fields: Record<string, unknown>;
};

/** The person behind one address (null when not visible or not linked). */
export function useContactByAddress(service: string, address: string) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.contactByAddress(orgId, service, address),
    queryFn: async () => {
      const { data } = await crm()
        .from("contact_addresses")
        .select("contact_id")
        .eq("organization_id", orgId!)
        .eq("service", service as Database["public"]["Enums"]["service"])
        .eq("address", address)
        .maybeSingle()
        .throwOnError();
      if (!data) return null;
      const { data: contact } = await crm()
        .from("contacts")
        .select("id, display_name, custom_fields")
        .eq("id", data.contact_id)
        .maybeSingle()
        .throwOnError();
      return contact as CrmContact | null;
    },
    enabled: !!orgId && !!address,
  });
}

/** Saves the contact form's field values (null clears a field). */
export function useSaveContactFields() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (c: { id: string; values: Record<string, unknown> }) => {
      await crm()
        .rpc("set_contact_fields", {
          p_contact_id: c.id,
          p_values: c.values as Json,
        })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["crm", orgId, "contact"],
      });
    },
  });
}

// Feature flags and plan entitlements (P1-09) ----------------------------------------

export type Feature = {
  key: string;
  category: string;
  label: string;
  description: string | null;
  enabled: boolean;
  /** Why it resolved this way. */
  source: "kill_switch" | "override" | "tier" | "unrestricted";
  override_reason: string | null;
  override_expires_at: string | null;
  /** The lowest tier that includes it, when not already enabled. */
  unlocks_at_tier: string | null;
};

/**
 * Every feature with its effective value for the active organization: what
 * the plan includes, what an override changed, and which tier would unlock
 * something the plan does not have. Overrides and the kill switch are
 * platform-only (crm.set_organization_feature, crm.set_feature_kill_switch) —
 * managed from the super-admin console (P1-10), not here.
 */
export function useFeatures() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.features(orgId),
    queryFn: async () => {
      const { data } = await crm()
        .rpc("get_features", { p_organization_id: orgId! })
        .throwOnError();
      return data as unknown as Feature[];
    },
    enabled: !!orgId,
  });
}

/** The platform's feature catalog (not resolved for any one organization) —
 * what the super-admin console's kill switches act on (P1-10). */
export function useFeatureCatalog() {
  return useQuery({
    queryKey: queryKeys.crm.featureCatalog(),
    queryFn: async () =>
      await crm()
        .from("features")
        .select("key, category, label, description, kill_switch")
        .order("sort_order")
        .throwOnError(),
    select: (data) => data.data,
    staleTime: Infinity,
  });
}

// [crm] P3-06: speed-to-lead. In-app notifications are durable (unlike
// P2-09f's browser-popup-only mechanism), so polling is enough for v1 --
// no new Realtime channel/publication wiring needed.
export type NotificationRow = Database["crm"]["Tables"]["notifications"]["Row"];

export function useNotifications() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const { data: agent } = useCurrentAgent();

  return useQuery({
    queryKey: queryKeys.crm.notifications(orgId, agent?.id),
    queryFn: async () =>
      await crm()
        .from("notifications")
        .select()
        .eq("organization_id", orgId!)
        .eq("agent_id", agent!.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .throwOnError(),
    select: (data) => data.data as NotificationRow[],
    enabled: !!orgId && !!agent?.id,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const { data: agent } = useCurrentAgent();

  return useMutation({
    mutationFn: async (notificationId: string) =>
      await crm()
        .rpc("mark_notification_read", { p_id: notificationId })
        .throwOnError(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.notifications(orgId, agent?.id),
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const { data: agent } = useCurrentAgent();

  return useMutation({
    mutationFn: async () =>
      await crm()
        .rpc("mark_all_notifications_read", { p_organization_id: orgId! })
        .throwOnError(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.notifications(orgId, agent?.id),
      });
    },
  });
}

// [crm] P3-06: the "unanswered leads" triage view -- every lead that has an
// assignee but hasn't gotten its first human reply yet, most overdue
// first. Org-wide (not filtered by crm.roles.lead_scope): that filtering
// is explicitly deferred to the Pipeline UI (P3-07), same as crm.leads'
// own RLS policy today.
export type UnansweredLead = Database["crm"]["Tables"]["leads"]["Row"] & {
  contactName: string | null;
  assigneeName: string | null;
};

export function useUnansweredLeads() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.unansweredLeads(orgId),
    queryFn: async () => {
      const { data: leads } = await crm()
        .from("leads")
        .select()
        .eq("organization_id", orgId!)
        .not("assigned_to", "is", null)
        .is("first_responded_at", null)
        .in("status", ["open", "qualified"])
        .order("first_response_due_at", { ascending: true })
        .throwOnError();

      const contactIds = [...new Set(leads.map((l) => l.contact_id))];
      const agentIds = [
        ...new Set(leads.map((l) => l.assigned_to).filter(Boolean)),
      ] as string[];

      const [{ data: contacts }, { data: agents }] = await Promise.all([
        contactIds.length
          ? crm()
              .from("contacts")
              .select("id, display_name")
              .in("id", contactIds)
              .throwOnError()
          : Promise.resolve({ data: [] }),
        agentIds.length
          ? supabase
              .from("agents")
              .select("id, name")
              .in("id", agentIds)
              .throwOnError()
          : Promise.resolve({ data: [] }),
      ]);

      const contactName = new Map(contacts?.map((c) => [c.id, c.display_name]));
      const agentName = new Map(agents?.map((a) => [a.id, a.name]));

      return leads.map((lead) => ({
        ...lead,
        contactName: contactName.get(lead.contact_id) ?? null,
        assigneeName: lead.assigned_to
          ? (agentName.get(lead.assigned_to) ?? null)
          : null,
      })) as UnansweredLead[];
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });
}

// [crm] P3-07a: Pipeline UI (kanban board). Board read-visibility is
// governed entirely by crm.leads' own RLS (lead_scope) -- a sales_rep's
// 'own' scope simply returns fewer rows at the database level, no extra
// client-side filtering needed for that.
export type LeadStage = Database["crm"]["Tables"]["lead_stages"]["Row"];
export type LeadQuality = Database["crm"]["Tables"]["lead_qualities"]["Row"];

export function useLeadStages() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.leadStages(orgId),
    queryFn: async () =>
      await crm()
        .from("lead_stages")
        .select()
        .eq("organization_id", orgId!)
        .order("sort_order", { ascending: true })
        .throwOnError(),
    select: (data) => data.data as LeadStage[],
    enabled: !!orgId,
  });
}

export function useLeadQualities() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.leadQualities(orgId),
    queryFn: async () =>
      await crm()
        .from("lead_qualities")
        .select()
        .eq("organization_id", orgId!)
        .order("sort_order", { ascending: true })
        .throwOnError(),
    select: (data) => data.data as LeadQuality[],
    enabled: !!orgId,
  });
}

export type PipelineLead = Database["crm"]["Tables"]["leads"]["Row"] & {
  contactName: string | null;
  assigneeName: string | null;
};

export function usePipelineLeads() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.pipelineLeads(orgId),
    queryFn: async () => {
      const { data: leads } = await crm()
        .from("leads")
        .select()
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .throwOnError();

      const contactIds = [...new Set(leads.map((l) => l.contact_id))];
      const agentIds = [
        ...new Set(leads.map((l) => l.assigned_to).filter(Boolean)),
      ] as string[];

      const [{ data: contacts }, { data: agents }] = await Promise.all([
        contactIds.length
          ? crm()
              .from("contacts")
              .select("id, display_name")
              .in("id", contactIds)
              .throwOnError()
          : Promise.resolve({ data: [] }),
        agentIds.length
          ? supabase
              .from("agents")
              .select("id, name")
              .in("id", agentIds)
              .throwOnError()
          : Promise.resolve({ data: [] }),
      ]);

      const contactName = new Map(contacts?.map((c) => [c.id, c.display_name]));
      const agentName = new Map(agents?.map((a) => [a.id, a.name]));

      return leads.map((lead) => ({
        ...lead,
        contactName: contactName.get(lead.contact_id) ?? null,
        assigneeName: lead.assigned_to
          ? (agentName.get(lead.assigned_to) ?? null)
          : null,
      })) as PipelineLead[];
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });
}

export function useSetLeadStage() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (args: { leadId: string; stageId: string | null }) => {
      await crm()
        .rpc("set_lead_stage", {
          p_lead_id: args.leadId,
          // Codegen types a uuid arg with no SQL default as non-nullable
          // even though the function body explicitly allows null (moving
          // a lead back to "no stage").
          p_stage_id: args.stageId as unknown as string,
        })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.pipelineLeads(orgId),
      });
    },
  });
}

export function useSetLeadDealValue() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (args: { leadId: string; value: number | null }) => {
      await crm()
        .rpc("set_lead_deal_value", {
          p_lead_id: args.leadId,
          // Same codegen limitation as set_lead_stage's p_stage_id above --
          // numeric with no SQL default types as non-nullable even though
          // null ("clear the value") is valid.
          p_value: args.value as unknown as number,
        })
        .throwOnError();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.pipelineLeads(orgId),
      });
    },
  });
}
