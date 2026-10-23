import {
  type ConversationRow,
  type MessageRow,
  isInternal,
  isIncoming,
  isTeamChat,
  supabase,
} from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@/hooks/useTranslation";

// [crm] P2-09f: a short, generic body -- this isn't the list preview's full
// media-kind/caption logic (ChatListItem.tsx's mediaPreview), just enough to
// be useful in an OS notification. Reactions/system kinds with no text of
// their own fall back to a generic label rather than guessing.
function notificationBody(
  content: MessageRow["content"],
  t: (s: string) => string,
): string {
  if (
    content &&
    typeof content === "object" &&
    "text" in content &&
    typeof content.text === "string" &&
    content.text
  ) {
    return content.text;
  }

  if (content && typeof content === "object" && content.type === "file") {
    return t("📎 Archivo multimedia");
  }

  return t("Nuevo mensaje");
}

export const useRealtimeSubscription = () => {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const navigate = useNavigate();
  const { translate: t } = useTranslation();

  const pushConversations = useBoundStore(
    (state) => state.chat.pushConversations,
  );
  const pushMessages = useBoundStore((state) => state.chat.pushMessages);

  // [crm] P2-09f: "unseen since last focus" -- not a full unread-total scan
  // (conversations the user hasn't opened may not have their message
  // history loaded in the store at all), just a count of qualifying
  // Realtime events since the window last had focus. Cleared on focus.
  const unseenCount = useRef(0);
  const baseTitle = useRef(document.title);

  useEffect(() => {
    function onFocus() {
      unseenCount.current = 0;
      document.title = baseTitle.current;
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (!activeOrgId) return;

    const filter = `organization_id=eq.${activeOrgId}`;

    const channel = supabase
      .channel("rialtaim")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter,
        },
        (payload) => {
          // TODO: https://github.com/supabase/supabase/issues/32817
          if (payload.table !== "conversations") return;

          const conversation = payload.new as ConversationRow;

          pushConversations([conversation]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter,
        },
        (payload) => {
          // TODO: https://github.com/supabase/supabase/issues/32817
          if (payload.table !== "messages") return;

          const message = payload.new as MessageRow;

          pushMessages([message]);

          //updateMessagesCache([message]);

          // [crm] P2-09f: desktop notification for a new incoming message
          // on a conversation the caller isn't actively looking at. Reads
          // fresh state via getState() rather than this closure's own
          // hook values -- the effect only re-runs on activeOrgId change,
          // so activeConvId/ownAgentId captured any other way would go
          // stale between re-subscribes.
          if (
            payload.eventType !== "INSERT" ||
            typeof Notification === "undefined" ||
            Notification.permission !== "granted"
          ) {
            return;
          }

          const state = useBoundStore.getState();
          const conversation = state.chat.conversations.get(
            message.conversation_id,
          );
          const teamChat = isTeamChat(conversation);

          if (
            isInternal(message) ||
            !isIncoming(message, state.chat.ownAgentId, teamChat)
          ) {
            return;
          }

          const isOpenAndFocused =
            state.ui.activeConvId === message.conversation_id &&
            document.hasFocus();

          if (isOpenAndFocused) return;

          unseenCount.current += 1;
          document.title = `(${unseenCount.current}) ${baseTitle.current}`;

          const notification = new Notification(
            conversation?.name || conversation?.address || t("Nuevo mensaje"),
            {
              body: notificationBody(message.content, t),
              icon: "/logo.png",
              tag: message.conversation_id,
            },
          );
          notification.onclick = () => {
            window.focus();
            navigate({
              to: "/conversations",
              hash: message.conversation_id,
            }).catch(console.error);
          };
        },
      );

    channel.subscribe();

    // Cleanup subscription on unmount
    return () => {
      void channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);
};
