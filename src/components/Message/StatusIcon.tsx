import { type OutgoingStatus } from "@/supabase/client";
import {
  failureReason,
  getHighestStatus,
  getStatusIcon,
} from "@/utils/MessageStatusUtils";

export default function StatusIcon(status: OutgoingStatus) {
  const highest = getHighestStatus(status);
  const { icon, color } = getStatusIcon(highest);

  // [crm] P2-08: a native tooltip is the minimal "visible in UI" this phase
  // needs -- the full reason-surfacing screen (P2-09's inbox) isn't built
  // yet, but the data (status.errors, already categorized by P2-05/P2-06)
  // shouldn't stay invisible until then.
  const title = highest === "failed" ? failureReason(status) : undefined;

  return (
    <svg
      className={
        `w-[16px] ml-[3px] ${color}` +
        (icon === "clock" ? " h-[15px]" : " h-[11px]")
      }
    >
      {title && <title>{title}</title>}
      <use href={`/icons.svg#msg-${icon}`} />
    </svg>
  );
}
