import { Dropdown, type MenuProps } from "antd";
import useBoundStore from "@/stores/useBoundStore";
import { type MessageRow } from "@/supabase/client";
import { isArchived } from "@/stores/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { updateConvExtra } from "@/utils/ConversationUtils";

export default function ItemActions({
  children,
  itemId,
  trigger,
  visible,
}: {
  children: React.ReactNode;
  itemId: string;
  trigger: ("contextMenu" | "click" | "hover")[] | undefined;
  visible?: boolean;
}) {
  const conversation = useBoundStore((state) =>
    state.chat.conversations.get(itemId || ""),
  );
  const membershipExtra = useBoundStore((state) =>
    state.chat.membershipExtras.get(itemId || ""),
  );
  const mostRecentMsg: MessageRow | undefined = useBoundStore(
    (state) =>
      state.chat.messages
        .get(itemId || "")
        ?.values()
        .next().value,
  );

  const { translate: t } = useTranslation();

  if (!conversation) {
    return children;
  }

  const isPinned = membershipExtra?.pinned;

  const items: MenuProps["items"] = [
    {
      label: isArchived(membershipExtra, mostRecentMsg)
        ? t("Unarchive chat")
        : t("Archive chat"),
      key: "1",
      onClick: () =>
        updateConvExtra(conversation, {
          archived: isArchived(membershipExtra, mostRecentMsg)
            ? null
            : new Date().toISOString(),
        }),
    },
    {
      label: isPinned ? t("Unpin chat") : t("Pin chat"),
      key: "2",
      onClick: () =>
        updateConvExtra(conversation, {
          pinned: isPinned ? null : new Date().toISOString(),
        }),
    },
  ];

  return (
    <Dropdown
      menu={{ items }}
      trigger={trigger}
      className={`${visible || visible == undefined ? "visible" : "hidden"} rounded-none`}
    >
      {children}
    </Dropdown>
  );
}
