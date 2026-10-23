import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invokeFunction, supabase, type TemplateData } from "@/supabase/client";
import type { TemplateRow } from "@/supabase/types/ui_types";
import useBoundStore from "@/stores/useBoundStore";

const crm = () => supabase.schema("crm");

// [crm] P2-04: reads crm.templates (the local cache), not a live Meta call --
// kept current by list/create/edit/delete and the status/quality webhooks.
// Use useSyncTemplates to pull fresh state from Meta on demand.
export function useTemplates(organizationAddress?: string) {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: ["templates", activeOrgId, organizationAddress],
    queryFn: async () =>
      await crm()
        .from("templates")
        .select(
          "meta_id, name, category, language, status, components, quality_score, rejection_reason, pack_item_key",
        )
        .eq("organization_id", activeOrgId!)
        .eq("organization_address", organizationAddress!)
        .order("name")
        .throwOnError(),
    enabled: !!activeOrgId && !!organizationAddress,
    select: (data): TemplateRow[] =>
      data.data.map((row) => ({
        id: row.meta_id ?? "",
        name: row.name,
        category: row.category as TemplateData["category"],
        language: row.language,
        status: row.status as TemplateData["status"],
        components: row.components as unknown as TemplateData["components"],
        sub_category: "CUSTOM",
        quality_score: row.quality_score,
        rejection_reason: row.rejection_reason,
        pack_item_key: row.pack_item_key,
      })),
  });
}

export function useSyncTemplates() {
  const queryClient = useQueryClient();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (organizationAddress: string) =>
      await invokeFunction<{ synced: number }>(
        "whatsapp-management/templates",
        {
          method: "PUT",
          body: {
            organization_id: activeOrgId,
            organization_address: organizationAddress,
          },
        },
      ),
    onSuccess: (_, organizationAddress) => {
      void queryClient.invalidateQueries({
        queryKey: ["templates", activeOrgId, organizationAddress],
      });
    },
  });
}

// [crm] P2-04: submission runs in the background (several sequential Meta
// calls can exceed one request's budget) -- this only confirms it started.
// Results show up by reloading the templates list later, not from this
// mutation's own response.
export function useSubmitPackTemplates() {
  const queryClient = useQueryClient();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (organizationAddress: string) =>
      await invokeFunction<{ status: "queued" }>(
        "whatsapp-management/templates/submit-pack",
        {
          method: "POST",
          body: {
            organization_id: activeOrgId,
            organization_address: organizationAddress,
          },
        },
      ),
    onSuccess: (_, organizationAddress) => {
      void queryClient.invalidateQueries({
        queryKey: ["templates", activeOrgId, organizationAddress],
      });
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      template,
      organizationAddress,
    }: {
      template: TemplateData;
      organizationAddress: string;
    }) => {
      await invokeFunction<unknown>("whatsapp-management/templates", {
        method: "POST",
        body: {
          organization_id: activeOrgId,
          organization_address: organizationAddress,
          template,
        },
      });
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["templates", activeOrgId, variables.organizationAddress],
      });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      template,
      organizationAddress,
    }: {
      template: TemplateData;
      organizationAddress: string;
    }) => {
      await invokeFunction<unknown>("whatsapp-management/templates", {
        method: "PATCH",
        body: {
          organization_id: activeOrgId,
          organization_address: organizationAddress,
          template,
        },
      });
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["templates", activeOrgId, variables.organizationAddress],
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      template,
      organizationAddress,
    }: {
      template: TemplateData;
      organizationAddress: string;
    }) => {
      await invokeFunction<unknown>("whatsapp-management/templates", {
        method: "DELETE",
        body: {
          organization_id: activeOrgId,
          organization_address: organizationAddress,
          template,
        },
      });
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["templates", activeOrgId, variables.organizationAddress],
      });
    },
  });
}
