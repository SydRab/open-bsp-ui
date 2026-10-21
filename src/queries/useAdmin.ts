// [crm] Super-admin console (P1-10). Every mutation and most reads go
// through the crm-admin edge function (never a crm function granted to
// authenticated — see its own file comment); the database is still what
// actually checks the caller is a platform admin. useIsPlatformAdmin is the
// one direct RPC: crm.is_platform_admin is granted to authenticated so the
// UI can decide whether to show the console at all.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { invokeFunction, supabase } from "@/supabase/client";
import { queryKeys } from "./queryKeys";
import type { AuditEntry } from "./useCrm";

const crm = () => supabase.schema("crm");

async function callAdmin<T>(
  action: string,
  body: Record<string, unknown> = {},
): Promise<T | null> {
  try {
    // The edge function always wraps a successful result as { data }: unwrap
    // it here so every hook below gets the value it asked for, not the envelope.
    const result = await invokeFunction<{ data: T }>("crm-admin", {
      method: "POST",
      body: { action, ...body },
    });
    return result?.data ?? null;
  } catch (error) {
    // Surface the function's own message ("no active support-access grant…")
    // instead of the client's generic "non-2xx status code".
    if (error instanceof FunctionsHttpError) {
      const body = (await (error.context as Response)
        .json()
        .catch(() => null)) as { message?: string } | null;
      if (body?.message) throw new Error(body.message);
    }
    throw error;
  }
}

/** Whether the signed-in user is a platform admin — gates the console link. */
export function useIsPlatformAdmin() {
  return useQuery({
    queryKey: queryKeys.admin.isPlatformAdmin(),
    queryFn: async () => await crm().rpc("is_platform_admin").throwOnError(),
    select: (data) => data.data === true,
    staleTime: 5 * 60 * 1000,
  });
}

export type Tenant = {
  organization_id: string;
  name: string;
  slug: string;
  status: string;
  tier_id: string | null;
  tier_name: string | null;
  seats_used: number;
  seats_cap: number | null;
  pack_key: string | null;
  pack_version: number | null;
  latest_pack_version: number | null;
  created_at: string;
};

export function useTenants(search: string) {
  return useQuery({
    queryKey: queryKeys.admin.tenants(search),
    queryFn: () =>
      callAdmin<Tenant[]>("list_tenants", { search: search || undefined }),
  });
}

function useAdminMutation<TArgs>(
  action: string,
  buildBody: (args: TArgs) => Record<string, unknown>,
  invalidate: (
    queryClient: ReturnType<typeof useQueryClient>,
    args: TArgs,
  ) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => callAdmin(action, buildBody(args)),
    onSuccess: (_data, args) => invalidate(queryClient, args),
  });
}

export function useSuspendOrganization() {
  return useAdminMutation<{ organizationId: string; reason?: string }>(
    "suspend",
    (a) => ({ organization_id: a.organizationId, reason: a.reason }),
    (qc) => void qc.invalidateQueries({ queryKey: queryKeys.admin.all() }),
  );
}

export function useReactivateOrganization() {
  return useAdminMutation<{ organizationId: string }>(
    "reactivate",
    (a) => ({ organization_id: a.organizationId }),
    (qc) => void qc.invalidateQueries({ queryKey: queryKeys.admin.all() }),
  );
}

export function useSetTier() {
  return useAdminMutation<{ organizationId: string; tierId: string }>(
    "set_tier",
    (a) => ({ organization_id: a.organizationId, tier_id: a.tierId }),
    (qc) => void qc.invalidateQueries({ queryKey: queryKeys.admin.all() }),
  );
}

export function useUpgradePack() {
  return useAdminMutation<{ organizationId: string; version?: number }>(
    "upgrade_pack",
    (a) => ({ organization_id: a.organizationId, version: a.version }),
    (qc) => void qc.invalidateQueries({ queryKey: queryKeys.admin.all() }),
  );
}

export function useSetFeatureOverride() {
  return useAdminMutation<{
    organizationId: string;
    featureKey: string;
    enabled: boolean;
    reason: string;
    expiresAt?: string;
  }>(
    "set_feature_override",
    (a) => ({
      organization_id: a.organizationId,
      feature_key: a.featureKey,
      enabled: a.enabled,
      reason: a.reason,
      expires_at: a.expiresAt,
    }),
    (qc, a) =>
      void qc.invalidateQueries({
        queryKey: queryKeys.crm.features(a.organizationId),
      }),
  );
}

export function useClearFeatureOverride() {
  return useAdminMutation<{ organizationId: string; featureKey: string }>(
    "clear_feature_override",
    (a) => ({ organization_id: a.organizationId, feature_key: a.featureKey }),
    (qc, a) =>
      void qc.invalidateQueries({
        queryKey: queryKeys.crm.features(a.organizationId),
      }),
  );
}

export function useSetKillSwitch() {
  return useAdminMutation<{ featureKey: string; enabled: boolean }>(
    "set_kill_switch",
    (a) => ({ feature_key: a.featureKey, enabled: a.enabled }),
    (qc) => void qc.invalidateQueries({ queryKey: queryKeys.crm.all() }),
  );
}

export type SupportAccessGrant = {
  id: string;
  organization_id: string;
  organization_name: string;
  admin_id: string;
  admin_email: string;
  reason: string;
  granted_at: string;
  expires_at: string;
  revoked_at: string | null;
  active: boolean;
};

export function useSupportAccess(organizationId?: string) {
  return useQuery({
    queryKey: queryKeys.admin.supportAccess(organizationId),
    queryFn: () =>
      callAdmin<SupportAccessGrant[]>("list_support_access", {
        organization_id: organizationId,
      }),
  });
}

export function useGrantSupportAccess() {
  return useAdminMutation<{
    organizationId: string;
    reason: string;
    hours?: number;
  }>(
    "grant_support_access",
    (a) => ({
      organization_id: a.organizationId,
      reason: a.reason,
      hours: a.hours,
    }),
    (qc, a) =>
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.supportAccess(a.organizationId),
      }),
  );
}

export function useRevokeSupportAccess() {
  return useAdminMutation<{ grantId: string; organizationId: string }>(
    "revoke_support_access",
    (a) => ({ grant_id: a.grantId }),
    (qc, a) =>
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.supportAccess(a.organizationId),
      }),
  );
}

export type TenantFeature = {
  key: string;
  category: string;
  label: string;
  description: string | null;
  enabled: boolean;
  source: "kill_switch" | "override" | "tier" | "unrestricted";
  override_reason: string | null;
  override_expires_at: string | null;
  unlocks_at_tier: string | null;
};

export type TenantConfig = {
  profile: Record<string, unknown> | null;
  roles: { key: string; name: string; permissions: string[] }[] | null;
  settings:
    | {
        key: string;
        category: string;
        label: string;
        value: unknown;
        source: string;
        is_locked: boolean;
      }[]
    | null;
  features: TenantFeature[] | null;
  pack_items:
    | { kind: string; key: string; value: unknown; customized: boolean }[]
    | null;
};

/** Profile, resolved settings, roles, feature status and pack items — never
 * message or contact content. Requires an active support-access grant. */
export function useTenantConfig(organizationId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.tenantConfig(organizationId),
    queryFn: () =>
      callAdmin<TenantConfig>("get_tenant_config", {
        organization_id: organizationId,
      }),
    enabled,
    retry: false,
  });
}

// Same shape as crm.get_audit_log (useCrm.ts's AuditEntry): describeAction /
// describeActor read either one the same way.
export function useTenantAuditLog(organizationId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.tenantAuditLog(organizationId),
    queryFn: () =>
      callAdmin<AuditEntry[]>("get_tenant_audit_log", {
        organization_id: organizationId,
        limit: 50,
      }),
    enabled,
    retry: false,
  });
}

export type PlatformAdmin = {
  user_id: string;
  email: string;
  granted_at: string;
  granted_by: string | null;
  granted_by_email: string | null;
};

export function usePlatformAdmins() {
  return useQuery({
    queryKey: queryKeys.admin.platformAdmins(),
    queryFn: () => callAdmin<PlatformAdmin[]>("list_platform_admins"),
  });
}

export function useGrantPlatformAdmin() {
  return useAdminMutation<{ email: string }>(
    "grant_platform_admin",
    (a) => ({ email: a.email }),
    (qc) =>
      void qc.invalidateQueries({ queryKey: queryKeys.admin.platformAdmins() }),
  );
}

export function useRevokePlatformAdmin() {
  return useAdminMutation<{ userId: string }>(
    "revoke_platform_admin",
    (a) => ({ user_id: a.userId }),
    (qc) =>
      void qc.invalidateQueries({ queryKey: queryKeys.admin.platformAdmins() }),
  );
}

export type PlatformAuditEntry = {
  id: number;
  created_at: string;
  actor_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
};

export function usePlatformAuditLog() {
  return useQuery({
    queryKey: queryKeys.admin.platformAuditLog(),
    queryFn: () =>
      callAdmin<PlatformAuditEntry[]>("get_platform_audit_log", { limit: 100 }),
  });
}
