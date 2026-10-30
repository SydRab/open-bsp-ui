// [crm] P2-09b: tags -- a named label an org defines once (crm.tags) and
// applies to any number of conversations (crm.conversation_tags). Writes go
// through crm.create_tag & co. (members call them directly; each one does
// its own permission check, same pattern as crm.create_team).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { queryKeys } from "./queryKeys";

const crm = () => supabase.schema("crm");

export type TagColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "gray";

export const TAG_COLORS: TagColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "gray",
];

/** Every tag this org has defined, alphabetical. */
export function useTags() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.crm.tags(orgId),
    queryFn: async () =>
      await crm()
        .from("tags")
        .select("id, name, color")
        .eq("organization_id", orgId!)
        .order("name")
        .throwOnError(),
    enabled: !!orgId,
    select: (data) => data.data,
  });
}

/** The tags currently applied to one conversation. */
export function useConversationTags(conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.crm.conversationTags(conversationId),
    queryFn: async () =>
      await crm()
        .from("conversation_tags")
        .select("tag_id, tags(id, name, color)")
        .eq("conversation_id", conversationId!)
        .throwOnError(),
    enabled: !!conversationId,
    select: (data) => data.data.flatMap((row) => (row.tags ? [row.tags] : [])),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (name: string) => {
      if (!orgId) throw new Error("No active organization");

      const { data, error } = await crm().rpc("create_tag", {
        p_organization_id: orgId,
        p_name: name,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.tags(orgId),
      });
    },
  });
}

export function useRenameTag() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({ tagId, name }: { tagId: string; name: string }) =>
      await crm()
        .rpc("rename_tag", { p_tag_id: tagId, p_name: name })
        .throwOnError(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.tags(orgId),
      });
    },
  });
}

export function useSetTagColor() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({ tagId, color }: { tagId: string; color: TagColor }) =>
      await crm()
        .rpc("set_tag_color", { p_tag_id: tagId, p_color: color })
        .throwOnError(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.tags(orgId),
      });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) =>
      await crm().rpc("delete_tag", { p_tag_id: tagId }).throwOnError(),
    onSuccess: () => {
      // A deleted tag cascades off every conversation it was on (the FK is
      // ON DELETE CASCADE) -- broad invalidation is simplest and correct,
      // rather than tracking which conversations held this tag.
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
  });
}

export function useSetConversationTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      tagId,
      tagged,
    }: {
      conversationId: string;
      tagId: string;
      tagged: boolean;
    }) =>
      await crm()
        .rpc("set_conversation_tag", {
          p_conversation_id: conversationId,
          p_tag_id: tagId,
          p_tagged: tagged,
        })
        .throwOnError(),
    onSuccess: (_data, { conversationId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.conversationTags(conversationId),
      });
    },
  });
}

// [crm] P3-11b: the same crm.tags catalog, applied to a contact instead
// of a conversation.
export function useContactTags(contactId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.crm.contactTags(contactId),
    queryFn: async () =>
      await crm()
        .from("contact_tags")
        .select("tag_id, tags(id, name, color)")
        .eq("contact_id", contactId!)
        .throwOnError(),
    enabled: !!contactId,
    select: (data) => data.data.flatMap((row) => (row.tags ? [row.tags] : [])),
  });
}

export function useSetContactTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      tagId,
      tagged,
    }: {
      contactId: string;
      tagId: string;
      tagged: boolean;
    }) =>
      await crm()
        .rpc("set_contact_tag", {
          p_contact_id: contactId,
          p_tag_id: tagId,
          p_tagged: tagged,
        })
        .throwOnError(),
    onSuccess: (_data, { contactId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.contactTags(contactId),
      });
    },
  });
}
