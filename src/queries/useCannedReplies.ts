// [crm] P2-09e: canned replies -- a named snippet an org defines once
// (crm.canned_replies) and inserts into the composer as plain text. Writes
// go through crm.create_canned_reply & co. (members call them directly;
// each one does its own templates.manage permission check). Reading
// (listing, to use one) needs no RPC -- the RLS select policy already
// covers it, same as crm.tags.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { queryKeys } from "./queryKeys";

const crm = () => supabase.schema("crm");

/** Every canned reply this org has defined, alphabetical. */
export function useCannedReplies() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.cannedReplies(orgId),
    queryFn: async () =>
      await crm()
        .from("canned_replies")
        .select("id, name, content")
        .eq("organization_id", orgId!)
        .order("name")
        .throwOnError(),
    enabled: !!orgId,
    select: (data) => data.data,
  });
}

export function useCreateCannedReply() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      name,
      content,
    }: {
      name: string;
      content: string;
    }) => {
      if (!orgId) throw new Error("No active organization");

      const { data, error } = await crm().rpc("create_canned_reply", {
        p_organization_id: orgId,
        p_name: name,
        p_content: content,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.cannedReplies(orgId),
      });
    },
  });
}

export function useUpdateCannedReply() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      id,
      name,
      content,
    }: {
      id: string;
      name: string;
      content: string;
    }) =>
      await crm()
        .rpc("update_canned_reply", {
          p_id: id,
          p_name: name,
          p_content: content,
        })
        .throwOnError(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.cannedReplies(orgId),
      });
    },
  });
}

export function useDeleteCannedReply() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (id: string) =>
      await crm().rpc("delete_canned_reply", { p_id: id }).throwOnError(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.cannedReplies(orgId),
      });
    },
  });
}
