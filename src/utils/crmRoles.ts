// [crm] Role helpers mirroring the database rules (10-12_members.sql) so the
// UI only offers what the database will accept. The database still decides.
import type { CrmRole } from "@/queries/useCrm";

type Tier = "owner" | "admin" | "member";

export function tierRank(tier: Tier | null | undefined): number {
  return tier === "owner" ? 3 : tier === "admin" ? 2 : 1;
}

/** Roles the caller may give someone: none above their own tier. */
export function assignableRoles(
  roles: CrmRole[] | undefined,
  callerTier: Tier | null | undefined,
): CrmRole[] {
  return (roles ?? []).filter((r) => tierRank(r.tier) <= tierRank(callerTier));
}

/**
 * Whether the caller may edit a role's permission toggles: never the locked
 * owner role; owners edit the rest; others only roles below their tier.
 */
export function canEditRole(
  role: CrmRole,
  callerTier: Tier | null | undefined,
): boolean {
  if (role.is_locked) return false;
  if (callerTier === "owner") return true;
  return tierRank(role.tier) < tierRank(callerTier);
}
