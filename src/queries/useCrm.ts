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
import type { Json } from "@/supabase/db_types";
import { queryKeys } from "./queryKeys";

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
