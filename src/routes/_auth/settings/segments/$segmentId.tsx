// [crm] P4-03: edit a segment. Type is fixed at creation (crm.update_segment
// only takes name/criteria) -- changing static vs dynamic is a different
// segment, not an edit. Static gets a manual "Refresh" (re-snapshot);
// dynamic re-evaluates live on every view, so there's nothing to refresh.
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";
import SegmentFilterBuilder, {
  useSegmentFilterRows,
} from "@/components/SegmentFilterBuilder";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useDeleteSegment,
  useRefreshSegment,
  useSegmentContacts,
  useSegmentPreviewCount,
  useSegments,
  useUpdateSegment,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/segments/$segmentId")({
  component: EditSegment,
});

const PAGE_SIZE = 25;

function EditSegment() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { segmentId } = Route.useParams();
  const { data: segments } = useSegments();
  const segment = segments?.find((s) => s.id === segmentId);

  const update = useUpdateSegment();
  const refresh = useRefreshSegment();
  const remove = useDeleteSegment();

  const [name, setName] = useState(segment?.name ?? "");
  const { rows, setRows, conditions, contactFields } = useSegmentFilterRows(
    segment?.criteria ?? [],
  );
  const { data: preview } = useSegmentPreviewCount(conditions);

  const [page, setPage] = useState(0);
  const { data: members } = useSegmentContacts(segmentId, page, PAGE_SIZE);

  if (!segment) return null;

  const dirty =
    name.trim() !== segment.name ||
    JSON.stringify(conditions) !== JSON.stringify(segment.criteria);

  return (
    <>
      <SectionHeader
        title={segment.name}
        onDelete={() =>
          remove.mutate(segment.id, {
            onSuccess: () =>
              navigate({
                to: "/settings/segments",
                hash: (prevHash) => prevHash!,
              }),
          })
        }
        deleteLoading={remove.isPending}
      />
      <SectionBody className="gap-[20px]">
        <div className="px-[6px] flex flex-col gap-[16px]">
          <label>
            <div className="label">{t("Name")}</div>
            <input
              type="text"
              className="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="text-[13px] text-muted-foreground">
            {segment.type === "static"
              ? t("Static -- a frozen list you refresh manually")
              : t("Dynamic -- always up to date")}
          </div>

          <div className="flex flex-col gap-[6px]">
            <div className="label">{t("Conditions")}</div>
            <SegmentFilterBuilder
              rows={rows}
              setRows={setRows}
              contactFields={contactFields}
            />
          </div>

          {preview && (
            <div className="text-[13px] text-muted-foreground px-[2px]">
              {t("Matches")} <strong>{preview.total_count}</strong>{" "}
              {t("contacts")}
              {" · "}
              <strong>{preview.opted_in_count}</strong>{" "}
              {t("opted in and reachable")}
            </div>
          )}

          {(update.error || refresh.error || remove.error) && (
            <div className="text-destructive text-[13px]">
              {update.error?.message ??
                refresh.error?.message ??
                remove.error?.message}
            </div>
          )}

          <div className="flex items-center gap-[8px]">
            <Button
              type="button"
              className="primary"
              disabled={!dirty || !name.trim()}
              loading={update.isPending}
              onClick={() =>
                update.mutate({
                  id: segment.id,
                  name: name.trim(),
                  criteria: conditions,
                })
              }
            >
              {t("Save")}
            </Button>
            {segment.type === "static" && (
              <Button
                type="button"
                loading={refresh.isPending}
                onClick={() => refresh.mutate(segment.id)}
              >
                {t("Refresh")}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-[4px] mt-[12px]">
            <div className="label">{t("Members")}</div>
            {(members ?? []).length === 0 && (
              <div className="text-[13px] text-muted-foreground">
                {t("No contacts match this segment.")}
              </div>
            )}
            {(members ?? []).map((contact) => (
              <div
                key={contact.id}
                className="text-[14px] py-[4px] border-b border-border last:border-0"
              >
                {contact.display_name ?? t("(no name)")}
              </div>
            ))}
            {(members?.length ?? 0) > 0 && (
              <div className="flex gap-[8px] mt-[8px]">
                <Button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  {t("Previous")}
                </Button>
                <Button
                  type="button"
                  disabled={(members?.length ?? 0) < PAGE_SIZE}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("Next")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SectionBody>
    </>
  );
}
