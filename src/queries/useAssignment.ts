// [crm] P2-09c: who is currently working a conversation. One row per
// conversation (crm.conversation_assignments) -- assigning again transfers
// it instead of adding a second owner. Writes go through
// crm.assign_conversation/crm.unassign_conversation (members call them
// directly; each checks messages.send itself).
//
// The assignee's name/picture come from useCurrentAgents() and a client-side
// lookup, not a PostgREST embed: the FK here crosses from crm into public
// (public.agents), and nothing else in this app embeds across that boundary
// either (see ChatListItem.tsx's own agents?.find(...) for sender names) --
// PostgREST embedding only resolves within one exposed schema at a time.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import { queryKeys } from "./queryKeys";

const crm = () => supabase.schema("crm");

/** The agent id currently assigned to a conversation, or null if none. */
export function useConversationAssignment(
  conversationId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.crm.conversationAssignment(conversationId),
    queryFn: async () =>
      await crm()
        .from("conversation_assignments")
        .select("agent_id")
        .eq("conversation_id", conversationId!)
        .maybeSingle()
        .throwOnError(),
    enabled: !!conversationId,
    select: (data) => data.data?.agent_id ?? null,
  });
}

export function useAssignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      agentId,
    }: {
      conversationId: string;
      agentId: string;
    }) =>
      await crm()
        .rpc("assign_conversation", {
          p_conversation_id: conversationId,
          p_agent_id: agentId,
        })
        .throwOnError(),
    onSuccess: (_data, { conversationId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.conversationAssignment(conversationId),
      });
    },
  });
}

export function useUnassignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) =>
      await crm()
        .rpc("unassign_conversation", { p_conversation_id: conversationId })
        .throwOnError(),
    onSuccess: (_data, conversationId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.crm.conversationAssignment(conversationId),
      });
    },
  });
}
