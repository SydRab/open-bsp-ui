// [crm] TOTP enrollment and step-up (P1-11). This is Supabase Auth, not
// tenant data — factors belong to the user, not any one organization, so
// these hooks live apart from useCrm.ts and carry no organization_id.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";

const FACTORS_KEY = ["mfa", "factors"] as const;

export function useMfaFactors() {
  return useQuery({
    queryKey: FACTORS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      // `data.totp` is typed (and may be filtered) as verified-only; `.all`
      // carries every status, which both the unenroll-stale-factor cleanup
      // below and the "already enrolled?" check on the Security page need.
      return data.all.filter((f) => f.factor_type === "totp");
    },
  });
}

/**
 * Starts enrollment: an unverified factor plus the QR/secret to show the
 * user. Confirm with useVerifyMfaEnrollment before it counts for anything.
 *
 * Clears out any unverified factor left over from an abandoned attempt
 * first — GoTrue refuses a second enroll call with
 * "mfa_factor_name_conflict" while one already exists under the same
 * (unset) friendly name, which would otherwise turn "I closed the QR dialog
 * without finishing" into a dead end the user can't retry past.
 */
export function useEnrollTotp() {
  return useMutation({
    mutationFn: async () => {
      const { data: existing, error: listError } =
        await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      for (const factor of existing.all) {
        if (factor.factor_type === "totp" && factor.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (error) throw error;
      return data;
    },
  });
}

/** The first successful verification both confirms the factor and promotes
 * the session straight to aal2 — the same call doubles as a step-up
 * verification for an already-verified factor. */
export function useVerifyMfaEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { factorId: string; code: string }) => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: args.factorId,
        code: args.code,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FACTORS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
  });
}

export function useUnenrollMfa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FACTORS_KEY });
    },
  });
}
