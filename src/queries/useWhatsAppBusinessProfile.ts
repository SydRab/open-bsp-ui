// [crm] P2-11: business profile management and display-name status.
// Profile PICTURE updates are a deliberate scope cut (see
// whatsapp-management/business_profile.ts) -- not wired here either.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invokeFunction } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { queryKeys } from "./queryKeys";

export type BusinessProfileFields = {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  vertical?: string;
  websites?: string[];
};

// Meta's closed list for `vertical` -- mirrors whatsapp-management/
// business_profile.ts's own copy (the backend re-validates regardless).
export const BUSINESS_PROFILE_VERTICALS = [
  "ALCOHOL",
  "APPAREL",
  "AUTO",
  "BEAUTY",
  "EDU",
  "ENTERTAIN",
  "EVENT_PLAN",
  "FINANCE",
  "GOVT",
  "GROCERY",
  "HEALTH",
  "HOTEL",
  "NONPROFIT",
  "ONLINE_GAMBLING",
  "OTC_DRUGS",
  "OTHER",
  "PHYSICAL_GAMBLING",
  "PROF_SERVICES",
  "RESTAURANT",
  "RETAIL",
  "TRAVEL",
] as const;

function managementPath(
  base: string,
  address: string,
  organization_id: string,
  suffix = "",
) {
  return `${base}/${encodeURIComponent(address)}${suffix}?organization_id=${encodeURIComponent(
    organization_id,
  )}`;
}

export function useWhatsAppBusinessProfile(address: string | undefined) {
  const organization_id = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.whatsapp.businessProfile(organization_id, address),
    queryFn: async () =>
      await invokeFunction<BusinessProfileFields>(
        managementPath(
          "whatsapp-management/business-profile",
          address!,
          organization_id!,
        ),
      ),
    enabled: !!organization_id && !!address,
  });
}

export function useUpdateWhatsAppBusinessProfile(address: string) {
  const queryClient = useQueryClient();
  const organization_id = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (fields: BusinessProfileFields) => {
      if (!organization_id) throw new Error("No active organization");

      return await invokeFunction<{ success: boolean }>(
        managementPath(
          "whatsapp-management/business-profile",
          address,
          organization_id,
        ),
        { method: "POST", body: fields },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.whatsapp.businessProfile(organization_id, address),
      });
    },
  });
}

export function useRequestDisplayNameChange(address: string) {
  const organization_id = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (new_display_name: string) => {
      if (!organization_id) throw new Error("No active organization");

      return await invokeFunction<{ success: boolean }>(
        managementPath(
          "whatsapp-management/display-name",
          address,
          organization_id,
        ),
        { method: "POST", body: { new_display_name } },
      );
    },
  });
}

export function useReregisterWhatsAppNumber(address: string) {
  const organization_id = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (pin: string) => {
      if (!organization_id) throw new Error("No active organization");

      return await invokeFunction<{ success: boolean }>(
        managementPath(
          "whatsapp-management/display-name",
          address,
          organization_id,
          "/reregister",
        ),
        { method: "POST", body: { pin } },
      );
    },
  });
}
