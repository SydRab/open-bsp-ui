// [crm] P3-07d: a lead's tasks and follow-up reminders. The reminder
// itself (crm.sweep_task_reminders) is WhatsApp-delivered through the
// tenant's own connected number when the assignee has set their own
// WhatsApp number and an approved "internal_task_reminder" template
// exists -- this modal surfaces that readiness rather than letting a
// reminder silently fail to deliver with no visible explanation.
import { useState } from "react";
import { Trash2, X } from "lucide-react";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgents } from "@/queries/useAgents";
import {
  useCompleteTask,
  useCreateTask,
  useDeleteTask,
  useTaskReminderTemplateApproved,
  useTasks,
} from "@/queries/useCrm";

export default function LeadTasksModal({
  leadId,
  onClose,
}: {
  leadId: string;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const { data: tasks } = useTasks(leadId);
  const { data: agents } = useCurrentAgents();
  const { data: templateApproved } = useTaskReminderTemplateApproved();
  const create = useCreateTask();
  const complete = useCompleteTask();
  const remove = useDeleteTask();

  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const people = (agents ?? []).filter((a) => a.user_id !== null);

  const formatDue = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-background text-foreground rounded-xl w-[380px] max-h-[75vh] p-[20px] flex flex-col gap-[12px]">
        <div className="flex items-center justify-between shrink-0">
          <div className="text-[16px] font-medium">{t("Tareas")}</div>
          <button
            className="p-[4px] rounded-full hover:bg-muted"
            onClick={onClose}
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {templateApproved === false && (
          <div className="text-[12px] text-muted-foreground bg-muted rounded-lg p-[8px]">
            {t(
              "Los recordatorios por WhatsApp necesitan una plantilla aprobada -- revisa Plantillas de mensajes.",
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto flex flex-col gap-[8px]">
          {(tasks ?? []).length === 0 && (
            <div className="text-[13px] text-muted-foreground">
              {t("Sin tareas todavía.")}
            </div>
          )}
          {(tasks ?? []).map((task) => {
            const overdue =
              !task.completed_at && new Date(task.due_at) < new Date();
            return (
              <div key={task.id} className="flex items-start gap-[8px]">
                <input
                  type="checkbox"
                  className="mt-[3px]"
                  checked={!!task.completed_at}
                  onChange={(e) =>
                    complete.mutate({
                      id: task.id,
                      leadId,
                      completed: e.target.checked,
                    })
                  }
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={
                      "text-[14px] " +
                      (task.completed_at
                        ? "line-through text-muted-foreground"
                        : "text-foreground")
                    }
                  >
                    {task.title}
                  </div>
                  <div
                    className={
                      "text-[12px] " +
                      (overdue ? "text-destructive" : "text-muted-foreground")
                    }
                  >
                    {formatDue(task.due_at)}
                  </div>
                </div>
                <button
                  type="button"
                  className="p-[4px] text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate({ id: task.id, leadId })}
                >
                  <Trash2 className="w-[14px] h-[14px]" />
                </button>
              </div>
            );
          })}
        </div>

        <form
          className="flex flex-col gap-[8px] shrink-0 pt-[8px] border-t border-border"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !dueAt) return;
            create.mutate(
              {
                leadId,
                title,
                dueAt: new Date(dueAt).toISOString(),
                assignedTo: assignedTo || null,
              },
              {
                onSuccess: () => {
                  setTitle("");
                  setDueAt("");
                },
              },
            );
          }}
        >
          <input
            className="text"
            placeholder={t("Nueva tarea")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex gap-[8px]">
            <input
              className="text grow"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
            <select
              className="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">{t("Sin asignar")}</option>
              {people.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {create.error && (
            <div className="text-destructive text-[13px]">
              {create.error.message}
            </div>
          )}
          <Button type="submit" className="primary" loading={create.isPending}>
            {t("Añadir tarea")}
          </Button>
        </form>
      </div>
    </div>
  );
}
