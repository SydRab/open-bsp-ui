// [crm] P2-09e: same toggle/outside-click/Escape popover pattern as
// ConversationTags.tsx -- picking a reply inserts its content into the
// composer (handled by the caller via onSelect, since the composer owns
// the draft state); create/edit/delete happen inline here, gated on
// templates.manage, rather than a separate settings screen.
import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useMyPermissions } from "@/queries/useCrm";
import {
  useCannedReplies,
  useCreateCannedReply,
  useDeleteCannedReply,
  useUpdateCannedReply,
} from "@/queries/useCannedReplies";

export default function CannedReplyPicker({
  onSelect,
  onClose,
}: {
  onSelect: (content: string) => void;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const { can } = useMyPermissions();
  const canManage = can("templates.manage");

  const { data: replies } = useCannedReplies();
  const createReply = useCreateCannedReply();
  const updateReply = useUpdateCannedReply();
  const deleteReply = useDeleteCannedReply();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  function startEdit(reply: { id: string; name: string; content: string }) {
    setEditingId(reply.id);
    setEditName(reply.name);
    setEditContent(reply.content);
  }

  function saveEdit() {
    if (!editingId || !editName.trim() || !editContent.trim()) return;
    updateReply.mutate(
      { id: editingId, name: editName.trim(), content: editContent.trim() },
      { onSuccess: () => setEditingId(null) },
    );
  }

  function saveNew() {
    if (!newName.trim() || !newContent.trim()) return;
    createReply.mutate(
      { name: newName.trim(), content: newContent.trim() },
      {
        onSuccess: () => {
          setNewName("");
          setNewContent("");
          setCreating(false);
        },
      },
    );
  }

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-[6px] w-[300px] max-h-[360px] overflow-y-auto flex flex-col z-20 bg-background rounded-[16px] shadow-lg border border-border p-[8px]"
    >
      {(replies || []).map((reply) =>
        editingId === reply.id ? (
          <div
            key={reply.id}
            className="flex flex-col gap-[4px] px-[8px] py-[6px] rounded-lg border border-border mb-[4px]"
          >
            <input
              type="text"
              className="text-[13px] font-medium outline-none bg-transparent border-b border-border pb-[2px]"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={80}
            />
            <textarea
              className="text-[13px] outline-none bg-transparent resize-none min-h-[60px]"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={4096}
            />
            <div className="flex justify-end gap-[8px]">
              <button
                className="text-[12px] text-muted-foreground hover:underline"
                onClick={() => setEditingId(null)}
              >
                {t("Cancelar")}
              </button>
              <button
                className="text-[12px] text-primary hover:underline disabled:opacity-30"
                disabled={!editName.trim() || !editContent.trim()}
                onClick={saveEdit}
              >
                {t("Guardar")}
              </button>
            </div>
          </div>
        ) : (
          <div
            key={reply.id}
            className="group flex items-start gap-[6px] px-[8px] py-[6px] rounded-lg hover:bg-accent cursor-pointer"
            onClick={() => {
              onSelect(reply.content);
              onClose();
            }}
          >
            <div className="grow min-w-0">
              <div className="text-[13px] font-medium truncate">
                {reply.name}
              </div>
              <div className="text-[12px] text-muted-foreground truncate">
                {reply.content}
              </div>
            </div>
            {canManage && (
              <div className="shrink-0 flex items-center gap-[2px] opacity-0 group-hover:opacity-100">
                <button
                  className="p-[4px] rounded-full hover:bg-background"
                  title={t("Editar")}
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(reply);
                  }}
                >
                  <Pencil className="w-[12px] h-[12px]" />
                </button>
                <button
                  className="p-[4px] rounded-full hover:bg-background"
                  title={t("Eliminar")}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteReply.mutate(reply.id);
                  }}
                >
                  <Trash2 className="w-[12px] h-[12px]" />
                </button>
              </div>
            )}
          </div>
        ),
      )}

      {!replies?.length && !creating && (
        <div className="px-[8px] py-[6px] text-[13px] text-muted-foreground">
          {t("Todavía no hay respuestas rápidas")}
        </div>
      )}

      {canManage && (
        <div className="border-t border-border pt-[6px] mt-[4px]">
          {creating ? (
            <div className="flex flex-col gap-[4px] px-[8px]">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("Nombre...")}
                className="text-[13px] outline-none bg-transparent border-b border-border pb-[2px]"
                maxLength={80}
                autoFocus
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={t("Contenido de la respuesta...")}
                className="text-[13px] outline-none bg-transparent resize-none min-h-[60px]"
                maxLength={4096}
              />
              <div className="flex justify-end gap-[8px]">
                <button
                  className="text-[12px] text-muted-foreground hover:underline"
                  onClick={() => {
                    setCreating(false);
                    setNewName("");
                    setNewContent("");
                  }}
                >
                  {t("Cancelar")}
                </button>
                <button
                  className="text-[12px] text-primary hover:underline disabled:opacity-30"
                  disabled={!newName.trim() || !newContent.trim()}
                  onClick={saveNew}
                >
                  {t("Guardar")}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="flex items-center gap-[4px] px-[8px] py-[4px] text-[13px] text-muted-foreground hover:bg-accent rounded-lg w-full"
              onClick={() => setCreating(true)}
            >
              <Plus className="w-[14px] h-[14px]" />
              {t("Nueva respuesta rápida")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
