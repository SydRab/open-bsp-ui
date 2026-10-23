// [crm] P2-09c: who is currently working this conversation. Same toggle/
// outside-click/Escape popover pattern as ConversationTags.tsx -- single
// current assignee instead of a checkbox list, since assigning again
// transfers rather than adds.
import { useEffect, useRef } from "react";
import { User, X } from "lucide-react";
import useBoundStore from "@/stores/useBoundStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgents } from "@/queries/useAgents";
import {
  useAssignConversation,
  useConversationAssignment,
  useUnassignConversation,
} from "@/queries/useAssignment";
import { isHumanAgent } from "@/supabase/client";
import { nameInitials } from "@/utils/FormatUtils";
import Avatar from "./Avatar";

export default function ConversationAssignee({
  conversationId,
}: {
  conversationId: string;
}) {
  const { translate: t } = useTranslation();
  const assigneePicker = useBoundStore((store) => store.ui.assigneePicker);
  const toggle = useBoundStore((store) => store.ui.toggle);

  // Assignment is a human-workflow concept -- AI agents (personas, no
  // user_id) are not valid assignees.
  const { data: allAgents } = useCurrentAgents();
  const agents = allAgents?.filter(isHumanAgent);
  const { data: assignedAgentId } = useConversationAssignment(conversationId);
  const assignConversation = useAssignConversation();
  const unassignConversation = useUnassignConversation();

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!assigneePicker) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") toggle("assigneePicker", false);
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        toggle("assigneePicker", false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, [assigneePicker, toggle]);

  const assignee = agents?.find((a) => a.id === assignedAgentId);

  return (
    <div className="relative inline-flex items-center">
      <button
        className="inline-flex items-center gap-[6px] rounded-full pl-[2px] pr-[10px] py-[2px] text-[12px] bg-accent hover:bg-accent/70 text-foreground cursor-pointer"
        onClick={() => toggle("assigneePicker")}
      >
        {assignee ? (
          <>
            <Avatar
              src={assignee.picture}
              fallback={nameInitials(assignee.name)}
              size={18}
              className="bg-primary/10 text-primary text-[9px]"
            />
            {assignee.name}
          </>
        ) : (
          <>
            <User className="w-[14px] h-[14px] text-muted-foreground" />
            {t("Sin asignar")}
          </>
        )}
      </button>

      {assignee && (
        <button
          className="ml-[4px] p-[4px] rounded-full cursor-pointer opacity-60 hover:opacity-100"
          title={t("Quitar asignación")}
          onClick={() => unassignConversation.mutate(conversationId)}
        >
          <X className="w-[11px] h-[11px]" />
        </button>
      )}

      {assigneePicker && (
        <div
          ref={ref}
          className="absolute top-full left-0 mt-[6px] w-[220px] max-h-[280px] overflow-y-auto flex flex-col z-20 bg-background rounded-[16px] shadow-lg border border-border p-[8px]"
        >
          {(agents || []).map((a) => (
            <label
              key={a.id}
              className="flex items-center gap-[8px] px-[8px] py-[6px] rounded-lg hover:bg-accent cursor-pointer text-[14px]"
            >
              <input
                type="radio"
                name="assignee"
                checked={a.id === assignedAgentId}
                onChange={() => {
                  assignConversation.mutate({ conversationId, agentId: a.id });
                  toggle("assigneePicker", false);
                }}
              />
              <Avatar
                src={a.picture}
                fallback={nameInitials(a.name)}
                size={20}
                className="bg-primary/10 text-primary text-[10px] shrink-0"
              />
              <span className="truncate">{a.name}</span>
            </label>
          ))}

          {!agents?.length && (
            <div className="px-[8px] py-[6px] text-[13px] text-muted-foreground">
              {t("No hay miembros")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
