// [crm] P4-03: the segment filter builder. Each row is a user-facing
// condition; "last contact" renders as the four labeled recency buckets the
// backend comment settles on (Active/Cooling/Dormant/Never) rather than raw
// day thresholds -- Cooling is the only bucket that needs two ANDed
// `last_contact_days` conditions under the hood (gte 8 and lte 29), since a
// single condition can only express one side of a range. This builder is
// the only writer of segment criteria, so round-tripping an existing
// segment back into rows only ever has to recognize these exact shapes.
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type CustomField,
  type SegmentCondition,
  type SegmentConditionOp,
  useCustomFields,
  useLeadStages,
} from "@/queries/useCrm";
import { useTags } from "@/queries/useTags";

const ACTIVE_WITHIN_DAYS = 7;
const DORMANT_AFTER_DAYS = 30;
const COOLING_FROM_DAYS = ACTIVE_WITHIN_DAYS + 1;
const COOLING_TO_DAYS = DORMANT_AFTER_DAYS - 1;

type RecencyBucket = "active" | "cooling" | "dormant" | "never";

type FilterRow =
  | { id: string; kind: "tag"; op: "has" | "not_has"; tagId: string }
  | {
      id: string;
      kind: "stage";
      op: "eq" | "neq" | "is_empty" | "is_not_empty";
      stageId: string;
    }
  | { id: string; kind: "recency"; bucket: RecencyBucket }
  | {
      id: string;
      kind: "custom";
      fieldKey: string;
      op: SegmentConditionOp;
      value: string;
    };

let nextRowId = 0;
const newRowId = () => `row-${nextRowId++}`;

const TEXT_OPS: SegmentConditionOp[] = [
  "eq",
  "neq",
  "contains",
  "is_empty",
  "is_not_empty",
];
const COMPARABLE_OPS: SegmentConditionOp[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "is_empty",
  "is_not_empty",
];
const CHOICE_OPS: SegmentConditionOp[] = [
  "eq",
  "neq",
  "is_empty",
  "is_not_empty",
];
const MULTI_CHOICE_OPS: SegmentConditionOp[] = [
  "contains",
  "is_empty",
  "is_not_empty",
];

function opsForField(field: CustomField): SegmentConditionOp[] {
  switch (field.definition.type) {
    case "number":
    case "date":
      return COMPARABLE_OPS;
    case "boolean":
      return ["eq"];
    case "select":
      return CHOICE_OPS;
    case "multi_select":
      return MULTI_CHOICE_OPS;
    default:
      return TEXT_OPS;
  }
}

const OP_LABELS: Record<string, string> = {
  eq: "is",
  neq: "is not",
  contains: "contains",
  gt: "is greater than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};

function coerceCustomValue(
  field: CustomField | undefined,
  raw: string,
): string | number | boolean {
  if (field?.definition.type === "number") return Number(raw);
  if (field?.definition.type === "boolean") return raw === "true";
  return raw;
}

function rowsToConditions(
  rows: FilterRow[],
  contactFields: CustomField[],
): SegmentCondition[] {
  return rows.flatMap((row): SegmentCondition[] => {
    switch (row.kind) {
      case "tag":
        return row.tagId
          ? [{ field: "tag", op: row.op, value: row.tagId }]
          : [];
      case "stage":
        if (row.op === "is_empty" || row.op === "is_not_empty") {
          return [{ field: "stage", op: row.op }];
        }
        return row.stageId
          ? [{ field: "stage", op: row.op, value: row.stageId }]
          : [];
      case "recency":
        if (row.bucket === "active") {
          return [
            {
              field: "last_contact_days",
              op: "lte",
              value: ACTIVE_WITHIN_DAYS,
            },
          ];
        }
        if (row.bucket === "dormant") {
          return [
            {
              field: "last_contact_days",
              op: "gte",
              value: DORMANT_AFTER_DAYS,
            },
          ];
        }
        if (row.bucket === "never") {
          return [{ field: "last_contact_days", op: "is_empty" }];
        }
        return [
          { field: "last_contact_days", op: "gte", value: COOLING_FROM_DAYS },
          { field: "last_contact_days", op: "lte", value: COOLING_TO_DAYS },
        ];
      case "custom":
        if (row.op === "is_empty" || row.op === "is_not_empty") {
          return [{ field: row.fieldKey, op: row.op }];
        }
        if (row.value === "") return [];
        return [
          {
            field: row.fieldKey,
            op: row.op,
            value: coerceCustomValue(
              contactFields.find((f) => f.key === row.fieldKey),
              row.value,
            ),
          },
        ];
    }
  });
}

function conditionsToRows(
  criteria: SegmentCondition[],
  customFieldKeys: Set<string>,
): FilterRow[] {
  const rows: FilterRow[] = [];
  const recency = criteria.filter((c) => c.field === "last_contact_days");

  for (const c of criteria) {
    if (c.field === "last_contact_days") continue;
    if (c.field === "tag") {
      rows.push({
        id: newRowId(),
        kind: "tag",
        op: c.op === "not_has" ? "not_has" : "has",
        tagId: c.value != null ? String(c.value) : "",
      });
    } else if (c.field === "stage") {
      rows.push({
        id: newRowId(),
        kind: "stage",
        op: c.op as "eq" | "neq" | "is_empty" | "is_not_empty",
        stageId: c.value != null ? String(c.value) : "",
      });
    } else if (customFieldKeys.has(c.field)) {
      rows.push({
        id: newRowId(),
        kind: "custom",
        fieldKey: c.field,
        op: c.op,
        value: c.value != null ? String(c.value) : "",
      });
    }
  }

  if (recency.length === 1) {
    const c = recency[0];
    if (c.op === "lte" && c.value === ACTIVE_WITHIN_DAYS) {
      rows.push({ id: newRowId(), kind: "recency", bucket: "active" });
    } else if (c.op === "gte" && c.value === DORMANT_AFTER_DAYS) {
      rows.push({ id: newRowId(), kind: "recency", bucket: "dormant" });
    } else if (c.op === "is_empty") {
      rows.push({ id: newRowId(), kind: "recency", bucket: "never" });
    }
  } else if (recency.length === 2) {
    const gte = recency.find((c) => c.op === "gte");
    const lte = recency.find((c) => c.op === "lte");
    if (gte?.value === COOLING_FROM_DAYS && lte?.value === COOLING_TO_DAYS) {
      rows.push({ id: newRowId(), kind: "recency", bucket: "cooling" });
    }
  }

  return rows;
}

export function useSegmentFilterRows(initialCriteria: SegmentCondition[]) {
  const { data: fields } = useCustomFields();
  const contactFields = (fields ?? []).filter(
    (f) => f.definition.entity === "contact" && !f.definition.archived,
  );
  const [rows, setRows] = useState<FilterRow[]>(() =>
    conditionsToRows(initialCriteria, new Set(contactFields.map((f) => f.key))),
  );
  return {
    rows,
    setRows,
    conditions: rowsToConditions(rows, contactFields),
    contactFields,
  };
}

export default function SegmentFilterBuilder({
  rows,
  setRows,
  contactFields,
}: {
  rows: FilterRow[];
  setRows: (rows: FilterRow[]) => void;
  contactFields: CustomField[];
}) {
  const { translate: t } = useTranslation();
  const { data: tags } = useTags();
  const { data: stages } = useLeadStages();

  const updateRow = (id: string, next: FilterRow) =>
    setRows(rows.map((r) => (r.id === id ? next : r)));
  const removeRow = (id: string) => setRows(rows.filter((r) => r.id !== id));

  const addRow = (kind: FilterRow["kind"]) => {
    if (kind === "tag") {
      setRows([
        ...rows,
        { id: newRowId(), kind: "tag", op: "has", tagId: tags?.[0]?.id ?? "" },
      ]);
    } else if (kind === "stage") {
      setRows([
        ...rows,
        {
          id: newRowId(),
          kind: "stage",
          op: "eq",
          stageId: stages?.[0]?.id ?? "",
        },
      ]);
    } else if (kind === "recency") {
      setRows([...rows, { id: newRowId(), kind: "recency", bucket: "active" }]);
    } else if (contactFields.length > 0) {
      const field = contactFields[0];
      setRows([
        ...rows,
        {
          id: newRowId(),
          kind: "custom",
          fieldKey: field.key,
          op: opsForField(field)[0],
          value: "",
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col gap-[10px]">
      {rows.length === 0 && (
        <div className="text-[13px] text-muted-foreground px-[2px]">
          {t("No conditions yet -- matches every contact.")}
        </div>
      )}

      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-[8px] flex-wrap bg-muted/50 rounded-lg px-[10px] py-[8px]"
        >
          {row.kind === "tag" && (
            <>
              <span className="text-[13px] text-muted-foreground">
                {t("Tag")}
              </span>
              <select
                className="text"
                value={row.op}
                onChange={(e) =>
                  updateRow(row.id, {
                    ...row,
                    op: e.target.value as "has" | "not_has",
                  })
                }
              >
                <option value="has">{t("has")}</option>
                <option value="not_has">{t("doesn't have")}</option>
              </select>
              <select
                className="text"
                value={row.tagId}
                onChange={(e) =>
                  updateRow(row.id, { ...row, tagId: e.target.value })
                }
              >
                <option value="" disabled>
                  {t("Select a tag")}
                </option>
                {(tags ?? []).map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {row.kind === "stage" && (
            <>
              <span className="text-[13px] text-muted-foreground">
                {t("Lead stage")}
              </span>
              <select
                className="text"
                value={row.op}
                onChange={(e) =>
                  updateRow(row.id, {
                    ...row,
                    op: e.target.value as
                      | "eq"
                      | "neq"
                      | "is_empty"
                      | "is_not_empty",
                  })
                }
              >
                <option value="eq">{t("is")}</option>
                <option value="neq">{t("is not")}</option>
                <option value="is_empty">{t("has no stage")}</option>
                <option value="is_not_empty">{t("has a stage")}</option>
              </select>
              {(row.op === "eq" || row.op === "neq") && (
                <select
                  className="text"
                  value={row.stageId}
                  onChange={(e) =>
                    updateRow(row.id, { ...row, stageId: e.target.value })
                  }
                >
                  <option value="" disabled>
                    {t("Select a stage")}
                  </option>
                  {(stages ?? []).map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {row.kind === "recency" && (
            <>
              <span className="text-[13px] text-muted-foreground">
                {t("Last contact")}
              </span>
              <select
                className="text"
                value={row.bucket}
                onChange={(e) =>
                  updateRow(row.id, {
                    ...row,
                    bucket: e.target.value as RecencyBucket,
                  })
                }
              >
                <option value="active">
                  {t("Active")} ({t("within")} {ACTIVE_WITHIN_DAYS} {t("days")})
                </option>
                <option value="cooling">
                  {t("Cooling")} ({COOLING_FROM_DAYS}–{COOLING_TO_DAYS}{" "}
                  {t("days")})
                </option>
                <option value="dormant">
                  {t("Dormant")} ({DORMANT_AFTER_DAYS}+ {t("days")})
                </option>
                <option value="never">{t("Never contacted")}</option>
              </select>
            </>
          )}

          {row.kind === "custom" && (
            <>
              <select
                className="text"
                value={row.fieldKey}
                onChange={(e) => {
                  const field = contactFields.find(
                    (f) => f.key === e.target.value,
                  );
                  updateRow(row.id, {
                    ...row,
                    fieldKey: e.target.value,
                    op: field ? opsForField(field)[0] : row.op,
                    value: "",
                  });
                }}
              >
                {contactFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.definition.label.en}
                  </option>
                ))}
              </select>
              {(() => {
                const field = contactFields.find((f) => f.key === row.fieldKey);
                const ops = field ? opsForField(field) : TEXT_OPS;
                return (
                  <select
                    className="text"
                    value={row.op}
                    onChange={(e) =>
                      updateRow(row.id, {
                        ...row,
                        op: e.target.value as SegmentConditionOp,
                      })
                    }
                  >
                    {ops.map((op) => (
                      <option key={op} value={op}>
                        {t(OP_LABELS[op])}
                      </option>
                    ))}
                  </select>
                );
              })()}
              {row.op !== "is_empty" && row.op !== "is_not_empty" && (
                <CustomValueInput
                  field={contactFields.find((f) => f.key === row.fieldKey)}
                  value={row.value}
                  onChange={(value) => updateRow(row.id, { ...row, value })}
                />
              )}
            </>
          )}

          <button
            type="button"
            className="ml-auto p-[4px] text-muted-foreground hover:text-destructive"
            onClick={() => removeRow(row.id)}
          >
            <X className="w-[16px] h-[16px]" />
          </button>
        </div>
      ))}

      <div className="flex gap-[8px] flex-wrap">
        <AddConditionButton label={t("+ Tag")} onClick={() => addRow("tag")} />
        <AddConditionButton
          label={t("+ Lead stage")}
          onClick={() => addRow("stage")}
        />
        <AddConditionButton
          label={t("+ Last contact")}
          onClick={() => addRow("recency")}
        />
        {contactFields.length > 0 && (
          <AddConditionButton
            label={t("+ Custom field")}
            onClick={() => addRow("custom")}
          />
        )}
      </div>
    </div>
  );
}

function AddConditionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-[4px] text-[13px] text-muted-foreground hover:text-primary px-[8px] py-[4px] rounded-md hover:bg-muted"
      onClick={onClick}
    >
      <Plus className="w-[13px] h-[13px]" />
      {label}
    </button>
  );
}

function CustomValueInput({
  field,
  value,
  onChange,
}: {
  field: CustomField | undefined;
  value: string;
  onChange: (value: string) => void;
}) {
  const { translate: t } = useTranslation();
  if (!field) return null;

  if (field.definition.type === "boolean") {
    return (
      <select
        className="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="true">{t("Yes")}</option>
        <option value="false">{t("No")}</option>
      </select>
    );
  }

  if (
    field.definition.type === "select" ||
    field.definition.type === "multi_select"
  ) {
    return (
      <select
        className="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {t("Select a value")}
        </option>
        {(field.definition.options ?? [])
          .filter((o) => !o.archived)
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label.en}
            </option>
          ))}
      </select>
    );
  }

  return (
    <input
      type={
        field.definition.type === "number"
          ? "number"
          : field.definition.type === "date"
            ? "date"
            : "text"
      }
      className="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
