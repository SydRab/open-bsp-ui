// [crm] P4-03: new segment. Name + static/dynamic + the filter builder, with
// a live total-vs-opted-in count preview (crm.preview_segment_count) so the
// person building it sees how many contacts they'd actually be able to
// message, not just how many match.
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";
import SegmentFilterBuilder, {
  useSegmentFilterRows,
} from "@/components/SegmentFilterBuilder";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type Segment,
  useCreateSegment,
  useSegmentPreviewCount,
} from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/segments/new")({
  component: NewSegment,
});

function NewSegment() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateSegment();

  const [name, setName] = useState("");
  const [type, setType] = useState<Segment["type"]>("dynamic");
  const { rows, setRows, conditions, contactFields } = useSegmentFilterRows([]);
  const { data: preview } = useSegmentPreviewCount(conditions);

  return (
    <>
      <SectionHeader title={t("New segment")} />
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

          <label>
            <div className="label">{t("Type")}</div>
            <select
              className="text"
              value={type}
              onChange={(e) => setType(e.target.value as Segment["type"])}
            >
              <option value="dynamic">
                {t("Dynamic -- always up to date")}
              </option>
              <option value="static">
                {t("Static -- a frozen list you refresh manually")}
              </option>
            </select>
          </label>

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

          {create.error && (
            <div className="text-destructive text-[13px]">
              {create.error.message}
            </div>
          )}
        </div>
      </SectionBody>

      <SectionFooter>
        <Button
          type="button"
          className="primary"
          disabled={!name.trim()}
          loading={create.isPending}
          onClick={() =>
            create.mutate(
              { name: name.trim(), type, criteria: conditions },
              {
                onSuccess: (id) =>
                  navigate({
                    to: "/settings/segments/$segmentId",
                    params: { segmentId: id },
                    hash: (prevHash) => prevHash!,
                  }),
              },
            )
          }
        >
          {t("Create segment")}
        </Button>
      </SectionFooter>
    </>
  );
}
