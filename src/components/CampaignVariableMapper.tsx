// [crm] P4-04: one row per {{n}} placeholder a template's header/body
// actually has -- header and body each number independently (confirmed
// against TemplateEditor.tsx's own getVarNumbers, which resets per
// component), so a slot is identified by (component, index), not a flat
// index. Each slot is either a fixed literal or a contact field,
// mirroring crm._validate_campaign_variable_mapping's own exact
// vocabulary -- this component is the only writer of a campaign's
// variable_mapping, so it only ever has to keep its own shape in sync
// with the chosen template, never decode an arbitrary one.
import { useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import type { CampaignVariableMapping, CustomField } from "@/queries/useCrm";
import type { TemplateData } from "@/supabase/client";

function placeholderCount(text: string | undefined): number {
  if (!text) return 0;
  let max = 0;
  for (const m of text.matchAll(/\{\{(\d+)\}\}/g)) {
    max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

export function useRequiredCampaignSlots(
  components: TemplateData["components"],
) {
  const header = components.find((c) => c.type === "HEADER");
  const body = components.find((c) => c.type === "BODY")!;
  const headerCount = placeholderCount(header?.text);
  const bodyCount = placeholderCount(body?.text);

  const slots: { component: "header" | "body"; index: number }[] = [
    ...Array.from({ length: headerCount }, (_, i) => ({
      component: "header" as const,
      index: i + 1,
    })),
    ...Array.from({ length: bodyCount }, (_, i) => ({
      component: "body" as const,
      index: i + 1,
    })),
  ];

  return slots;
}

export default function CampaignVariableMapper({
  components,
  mapping,
  onChange,
  contactFields,
}: {
  components: TemplateData["components"];
  mapping: CampaignVariableMapping[];
  onChange: (mapping: CampaignVariableMapping[]) => void;
  contactFields: CustomField[];
}) {
  const { translate: t } = useTranslation();
  const slots = useRequiredCampaignSlots(components);

  // Keep `mapping` exactly in sync with the chosen template's own slots --
  // add a default entry for a new slot, drop one that no longer exists
  // (e.g. the template picker changed).
  useEffect(() => {
    const next = slots.map((slot) => {
      const existing = mapping.find(
        (m) => m.component === slot.component && m.index === slot.index,
      );
      return existing ?? { ...slot, type: "fixed" as const, value: "" };
    });
    const changed =
      next.length !== mapping.length ||
      next.some(
        (n, i) =>
          n.component !== mapping[i]?.component ||
          n.index !== mapping[i]?.index,
      );
    if (changed) onChange(next);
    // Only re-sync when the template's own slot set changes, not on every
    // keystroke into a value -- `mapping` itself is deliberately excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(slots)]);

  const updateSlot = (
    component: "header" | "body",
    index: number,
    patch: Partial<CampaignVariableMapping>,
  ) => {
    onChange(
      mapping.map((m) =>
        m.component === component && m.index === index ? { ...m, ...patch } : m,
      ),
    );
  };

  if (slots.length === 0) {
    return (
      <div className="text-[13px] text-muted-foreground px-[2px]">
        {t("This template has no variables to map.")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {slots.map((slot) => {
        const entry = mapping.find(
          (m) => m.component === slot.component && m.index === slot.index,
        );
        return (
          <div
            key={`${slot.component}-${slot.index}`}
            className="flex items-center gap-[8px] flex-wrap bg-muted/50 rounded-lg px-[10px] py-[8px]"
          >
            <span className="text-[13px] text-muted-foreground w-[120px] shrink-0">
              {`{{${slot.index}}}`} (
              {slot.component === "header" ? t("header") : t("body")})
            </span>
            <select
              className="text"
              value={entry?.type ?? "fixed"}
              onChange={(e) =>
                updateSlot(slot.component, slot.index, {
                  type: e.target.value as "fixed" | "field",
                  value: "",
                })
              }
            >
              <option value="fixed">{t("Fixed value")}</option>
              <option value="field">{t("Contact field")}</option>
            </select>
            {entry?.type === "field" ? (
              <select
                className="text"
                value={entry.value}
                onChange={(e) =>
                  updateSlot(slot.component, slot.index, {
                    value: e.target.value,
                  })
                }
              >
                <option value="display_name">{t("Name")}</option>
                {contactFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.definition.label.en}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="text"
                value={entry?.value ?? ""}
                placeholder={t("Fixed text for every recipient")}
                onChange={(e) =>
                  updateSlot(slot.component, slot.index, {
                    value: e.target.value,
                  })
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
