// [crm] P3-07e: a lead's own notes -- a new entity, not conversation-level
// internal notes (P2-09a), since a note belongs to the lead/pursuit itself.
// Not author-locked: any member who can work the lead can edit/delete any
// note on it (crm.create_lead_note & co. enforce this server-side too).
import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgents } from "@/queries/useAgents";
import {
  useCreateLeadNote,
  useDeleteLeadNote,
  useLeadNotes,
  useUpdateLeadNote,
} from "@/queries/useCrm";

export default function LeadNotesModal({
  leadId,
  onClose,
}: {
  leadId: string;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const { data: notes } = useLeadNotes(leadId);
  const { data: agents } = useCurrentAgents();
  const create = useCreateLeadNote();
  const update = useUpdateLeadNote();
  const remove = useDeleteLeadNote();

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const authorName = (agentId: string) =>
    agents?.find((a) => a.id === agentId)?.name ?? t("un miembro");

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-background text-foreground rounded-xl w-[380px] max-h-[75vh] p-[20px] flex flex-col gap-[12px]">
        <div className="flex items-center justify-between shrink-0">
          <div className="text-[16px] font-medium">{t("Notas")}</div>
          <button
            className="p-[4px] rounded-full hover:bg-muted"
            onClick={onClose}
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-[12px]">
          {(notes ?? []).length === 0 && (
            <div className="text-[13px] text-muted-foreground">
              {t("Sin notas todavía.")}
            </div>
          )}
          {(notes ?? []).map((note) => (
            <div key={note.id} className="flex flex-col gap-[4px]">
              {editingId === note.id ? (
                <div className="flex flex-col gap-[6px]">
                  <textarea
                    className="text min-h-[60px]"
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                  />
                  <div className="flex gap-[8px]">
                    <Button
                      type="button"
                      className="primary"
                      loading={update.isPending}
                      onClick={() =>
                        update.mutate(
                          { id: note.id, leadId, body: editDraft },
                          { onSuccess: () => setEditingId(null) },
                        )
                      }
                    >
                      {t("Guardar")}
                    </Button>
                    <button
                      type="button"
                      className="text-[13px] text-muted-foreground"
                      onClick={() => setEditingId(null)}
                    >
                      {t("Cancelar")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-[14px] text-foreground whitespace-pre-wrap">
                    {note.body}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] text-muted-foreground">
                      {authorName(note.author_agent_id)} ·{" "}
                      {formatTime(note.created_at)}
                    </div>
                    <div className="flex gap-[4px]">
                      <button
                        type="button"
                        className="p-[4px] text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditDraft(note.body);
                        }}
                      >
                        <Pencil className="w-[13px] h-[13px]" />
                      </button>
                      <button
                        type="button"
                        className="p-[4px] text-muted-foreground hover:text-destructive"
                        onClick={() => remove.mutate({ id: note.id, leadId })}
                      >
                        <Trash2 className="w-[13px] h-[13px]" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <form
          className="flex flex-col gap-[8px] shrink-0 pt-[8px] border-t border-border"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            create.mutate(
              { leadId, body: draft },
              { onSuccess: () => setDraft("") },
            );
          }}
        >
          <textarea
            className="text min-h-[60px]"
            placeholder={t("Nueva nota")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {create.error && (
            <div className="text-destructive text-[13px]">
              {create.error.message}
            </div>
          )}
          <Button type="submit" className="primary" loading={create.isPending}>
            {t("Añadir nota")}
          </Button>
        </form>
      </div>
    </div>
  );
}
