// [crm] P2-09b: a compact chip row (ChatHeader) with a popover to toggle
// existing org tags or create a new one inline -- same toggle/outside-click/
// Escape pattern as TemplatePicker.tsx, no new popover primitive invented.
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import useBoundStore from "@/stores/useBoundStore";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type TagColor,
  useConversationTags,
  useCreateTag,
  useSetConversationTag,
  useTags,
} from "@/queries/useTags";

const CHIP_CLASSES: Record<TagColor, string> = {
  red: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  orange:
    "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  yellow:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
  green: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const DOT_CLASSES: Record<TagColor, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  gray: "bg-gray-400",
};

export default function ConversationTags({
  conversationId,
}: {
  conversationId: string;
}) {
  const { translate: t } = useTranslation();
  const tagPicker = useBoundStore((store) => store.ui.tagPicker);
  const toggle = useBoundStore((store) => store.ui.toggle);

  const { data: orgTags } = useTags();
  const { data: appliedTags } = useConversationTags(conversationId);
  const setConversationTag = useSetConversationTag();
  const createTag = useCreateTag();

  const [newTagName, setNewTagName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tagPicker) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") toggle("tagPicker", false);
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        toggle("tagPicker", false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, [tagPicker, toggle]);

  const appliedIds = new Set((appliedTags || []).map((tag) => tag.id));

  async function createAndApply() {
    if (!newTagName.trim()) return;

    const tagId = await createTag.mutateAsync(newTagName.trim());
    setNewTagName("");

    if (tagId) {
      setConversationTag.mutate({ conversationId, tagId, tagged: true });
    }
  }

  return (
    <div className="relative flex items-center gap-[6px] flex-wrap">
      {(appliedTags || []).map((tag) => (
        <span
          key={tag.id}
          className={`inline-flex items-center gap-[4px] rounded-full px-[10px] py-[2px] text-[12px] ${CHIP_CLASSES[tag.color as TagColor]}`}
        >
          {tag.name}
          <button
            className="cursor-pointer opacity-60 hover:opacity-100"
            title={t("Quitar etiqueta")}
            onClick={() =>
              setConversationTag.mutate({
                conversationId,
                tagId: tag.id,
                tagged: false,
              })
            }
          >
            <X className="w-[11px] h-[11px]" />
          </button>
        </span>
      ))}

      <button
        className="p-[4px] rounded-full cursor-pointer hover:bg-accent text-muted-foreground"
        title={t("Agregar etiqueta")}
        onClick={() => toggle("tagPicker")}
      >
        <Plus className="w-[16px] h-[16px]" />
      </button>

      {tagPicker && (
        <div
          ref={ref}
          className="absolute top-full left-0 mt-[6px] w-[220px] max-h-[280px] overflow-y-auto flex flex-col z-20 bg-background rounded-[16px] shadow-lg border border-border p-[8px]"
        >
          {(orgTags || []).map((tag) => (
            <label
              key={tag.id}
              className="flex items-center gap-[8px] px-[8px] py-[6px] rounded-lg hover:bg-accent cursor-pointer text-[14px]"
            >
              <input
                type="checkbox"
                checked={appliedIds.has(tag.id)}
                onChange={(e) =>
                  setConversationTag.mutate({
                    conversationId,
                    tagId: tag.id,
                    tagged: e.target.checked,
                  })
                }
              />
              <span
                className={`w-[10px] h-[10px] rounded-full shrink-0 ${DOT_CLASSES[tag.color as TagColor]}`}
              />
              <span className="truncate">{tag.name}</span>
            </label>
          ))}

          {!orgTags?.length && (
            <div className="px-[8px] py-[6px] text-[13px] text-muted-foreground">
              {t("Todavía no hay etiquetas")}
            </div>
          )}

          <div className="flex items-center gap-[4px] px-[8px] pt-[6px] mt-[4px] border-t border-border">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createAndApply().catch(console.error);
                }
              }}
              placeholder={t("Nueva etiqueta...")}
              className="grow min-w-0 text-[13px] outline-none bg-transparent"
              maxLength={40}
            />
            <button
              disabled={!newTagName.trim()}
              className="p-[4px] rounded-full cursor-pointer hover:bg-accent disabled:opacity-30 disabled:cursor-default text-muted-foreground"
              title={t("Crear etiqueta")}
              onClick={() => createAndApply().catch(console.error)}
            >
              <Plus className="w-[14px] h-[14px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Small, reusable chip-only renderer for ChatListItem -- no popover, no
// edit affordance, just a compact visual indicator in a crowded list row.
export function TagDots({ colors }: { colors: TagColor[] }) {
  if (!colors.length) return null;

  return (
    <div className="flex items-center gap-[3px]">
      {colors.slice(0, 4).map((color, i) => (
        <span
          key={i}
          className={`w-[6px] h-[6px] rounded-full ${DOT_CLASSES[color]}`}
        />
      ))}
    </div>
  );
}
