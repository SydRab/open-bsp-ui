// [crm] The entry-list rendering LeadHistoryModal (P3-07c) first built --
// factored out once a second real caller (P3-11a's contact activity
// section, embedded inline rather than in a modal) needed the exact
// same thing.
import Spinner from "./Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import type { AuditEntry } from "@/queries/useCrm";
import {
  describeAction,
  describeActor,
  type AuditLookups,
} from "@/utils/auditLog";

export default function AuditEntryList({
  entries,
  isLoading,
  error,
  lookups,
  emptyLabel,
}: {
  entries: AuditEntry[] | undefined;
  isLoading: boolean;
  error: Error | null;
  lookups: AuditLookups;
  emptyLabel?: string;
}) {
  const { translate: t } = useTranslation();

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  return (
    <>
      {isLoading && (
        <div className="flex justify-center p-[16px]">
          <Spinner size={20} />
        </div>
      )}
      {error && (
        <div className="text-destructive text-[13px]">{error.message}</div>
      )}
      {!isLoading && !error && (entries ?? []).length === 0 && (
        <div className="text-[13px] text-muted-foreground">
          {t(emptyLabel ?? "Sin actividad todavía.")}
        </div>
      )}
      {(entries ?? []).map((entry) => (
        <div key={entry.id} className="text-[13px]">
          <div className="text-foreground">
            {describeAction(entry, t, lookups)}
          </div>
          <div className="text-muted-foreground">
            {describeActor(entry, t)} · {formatTime(entry.created_at)}
          </div>
        </div>
      ))}
    </>
  );
}
