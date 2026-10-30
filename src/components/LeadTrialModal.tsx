// [crm] P3-08: a lead's trial class booking. Offer/confirm run
// automatically (crm.z_offer_trial_on_qualified, crm.
// z_handle_trial_slot_reply) once trial.schedule and trial.auto_offer are
// configured in Settings -- this modal is the staff-driven path: book
// manually, reschedule, or cancel. The reminder (crm.sweep_trial_reminders)
// is WhatsApp-delivered through the tenant's own connected number only
// once a "trial_class_reminder" template is approved -- same readiness
// note LeadTasksModal shows for task reminders.
import { useState } from "react";
import { X } from "lucide-react";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useCancelTrialBooking,
  useRescheduleTrialBooking,
  useTrialBooking,
  useTrialReminderTemplateApproved,
  useUpcomingTrialSlots,
} from "@/queries/useCrm";

export default function LeadTrialModal({
  leadId,
  onClose,
}: {
  leadId: string;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const { data: booking } = useTrialBooking(leadId);
  const { data: slots } = useUpcomingTrialSlots();
  const { data: templateApproved } = useTrialReminderTemplateApproved();
  const reschedule = useRescheduleTrialBooking();
  const cancel = useCancelTrialBooking();

  const [slotStart, setSlotStart] = useState("");

  const formatSlot = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-background text-foreground rounded-xl w-[380px] max-h-[75vh] p-[20px] flex flex-col gap-[12px]">
        <div className="flex items-center justify-between shrink-0">
          <div className="text-[16px] font-medium">{t("Clase de prueba")}</div>
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

        <div className="flex-1 overflow-y-auto flex flex-col gap-[12px]">
          {booking ? (
            <div className="flex flex-col gap-[4px] rounded-lg bg-muted p-[10px]">
              <div className="text-[14px] font-medium">
                {formatSlot(booking.slot_start)}
              </div>
              <div className="text-[12px] text-muted-foreground">
                {t("Reservada")}
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-muted-foreground">
              {t("Sin clase de prueba reservada.")}
            </div>
          )}

          {(slots ?? []).length === 0 && (
            <div className="text-[12px] text-muted-foreground">
              {t(
                "No hay horarios disponibles -- configura el horario de prueba en Reglas y módulos.",
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[8px] shrink-0 pt-[8px] border-t border-border">
          <select
            className="text"
            value={slotStart}
            onChange={(e) => setSlotStart(e.target.value)}
          >
            <option value="">{t("Elegir horario")}</option>
            {(slots ?? []).map((slot) => (
              <option key={slot.slot_start} value={slot.slot_start}>
                {formatSlot(slot.slot_start)} · {slot.seats_left} {t("cupos")}
              </option>
            ))}
          </select>
          {reschedule.error && (
            <div className="text-destructive text-[13px]">
              {reschedule.error.message}
            </div>
          )}
          <div className="flex gap-[8px]">
            <Button
              type="button"
              className="primary"
              loading={reschedule.isPending}
              onClick={() => {
                if (!slotStart) return;
                reschedule.mutate(
                  { leadId, slotStart },
                  { onSuccess: () => setSlotStart("") },
                );
              }}
            >
              {booking ? t("Reprogramar") : t("Reservar")}
            </Button>
            {booking && (
              <Button
                type="button"
                loading={cancel.isPending}
                onClick={() => cancel.mutate({ id: booking.id, leadId })}
              >
                {t("Cancelar reserva")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
