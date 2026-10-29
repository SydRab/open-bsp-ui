// [crm] P3-07b: one admin-editable lead catalog (stages/qualities/drop
// reasons, P3-02) -- all three share the exact same shape (name,
// sort_order, is_preset), so one generic section avoids tripling this UI.
// No drag-reorder anywhere in this app -- sort_order is a plain number
// field, same as crm.update_lead_stage & co. already expect.
import { type ReactNode, useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { Package, PenLine, Plus, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";

type CatalogItem = {
  id: string;
  name: string;
  sort_order: number;
  is_preset: boolean;
};

export default function LeadCatalogSection<T extends CatalogItem>({
  title,
  items,
  canManage,
  create,
  update,
  remove,
  renderExtra,
}: {
  title: string;
  items: T[];
  canManage: boolean;
  create: UseMutationResult<string, Error, string>;
  update: UseMutationResult<
    void,
    Error,
    { id: string; name: string; sortOrder: number }
  >;
  remove: UseMutationResult<void, Error, string>;
  renderExtra?: (item: T) => ReactNode;
}) {
  const { translate: t } = useTranslation();
  const [newName, setNewName] = useState("");
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="text-[14px] font-medium text-muted-foreground uppercase tracking-wide px-[6px]">
        {t(title)}
      </div>

      {sorted.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-[8px] px-[6px] py-[4px]"
        >
          {item.is_preset ? (
            <Package className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
          ) : (
            <PenLine className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
          )}
          <input
            className="text grow"
            disabled={!canManage}
            defaultValue={item.name}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== item.name) {
                update.mutate({
                  id: item.id,
                  name: e.target.value,
                  sortOrder: item.sort_order,
                });
              }
            }}
          />
          <input
            className="text w-[56px] text-center"
            type="number"
            title={t("Orden")}
            disabled={!canManage}
            defaultValue={item.sort_order}
            onBlur={(e) => {
              const sortOrder = Number(e.target.value);
              if (!Number.isNaN(sortOrder) && sortOrder !== item.sort_order) {
                update.mutate({ id: item.id, name: item.name, sortOrder });
              }
            }}
          />
          {renderExtra?.(item)}
          {canManage && (
            <button
              type="button"
              className="p-[4px] text-muted-foreground hover:text-destructive"
              title={t("Eliminar")}
              onClick={() => remove.mutate(item.id)}
            >
              <Trash2 className="w-[16px] h-[16px]" />
            </button>
          )}
        </div>
      ))}

      {canManage && (
        <form
          className="flex items-center gap-[8px] px-[6px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            create.mutate(newName, { onSuccess: () => setNewName("") });
          }}
        >
          <input
            className="text grow"
            placeholder={t("Nuevo elemento")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" loading={create.isPending}>
            <Plus className="w-[16px] h-[16px]" />
          </Button>
        </form>
      )}
      {(create.error || update.error || remove.error) && (
        <div className="text-destructive text-[13px] px-[6px]">
          {(create.error ?? update.error ?? remove.error)?.message}
        </div>
      )}
    </div>
  );
}
