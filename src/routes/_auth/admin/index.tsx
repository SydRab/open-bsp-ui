// [crm] Super-admin console (P1-10): every tenant on the platform, searchable
// by name/slug. Platform admin only — crm-admin refuses anyone else; this
// route itself is only reachable via the Menu icon useIsPlatformAdmin() gates.
import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, History, ShieldUser, ToggleLeft } from "lucide-react";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { useTenants } from "@/queries/useAdmin";

export const Route = createFileRoute("/_auth/admin/")({
  component: TenantList,
});

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  suspended: "Suspendida",
};

function TenantList() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);
  const { data: tenants, isLoading, error } = useTenants(debounced);

  return (
    <>
      <SectionHeader title={t("Panel de administración")} />

      <SectionBody>
        <div className="px-[6px] pb-[8px]">
          <label>
            <div className="label">{t("Buscar")}</div>
            <input
              className="text"
              placeholder={t("Nombre o slug de la organización")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <SectionItem
          title={t("Administradores de la plataforma")}
          aside={
            <div className="p-[8px]">
              <ShieldUser className="w-[24px] h-[24px] text-muted-foreground" />
            </div>
          }
          onClick={() =>
            navigate({ to: "/admin/admins", hash: (prevHash) => prevHash! })
          }
        />

        <SectionItem
          title={t("Interruptores de función")}
          aside={
            <div className="p-[8px]">
              <ToggleLeft className="w-[24px] h-[24px] text-muted-foreground" />
            </div>
          }
          onClick={() =>
            navigate({ to: "/admin/features", hash: (prevHash) => prevHash! })
          }
        />

        <SectionItem
          title={t("Registro de actividad de la plataforma")}
          aside={
            <div className="p-[8px]">
              <History className="w-[24px] h-[24px] text-muted-foreground" />
            </div>
          }
          onClick={() =>
            navigate({ to: "/admin/audit", hash: (prevHash) => prevHash! })
          }
        />

        {isLoading && (
          <div className="flex justify-center p-[16px]">
            <Spinner size={20} />
          </div>
        )}

        {error && (
          <div className="p-[16px] text-destructive">{error.message}</div>
        )}

        {!isLoading && !error && tenants?.length === 0 && (
          <div className="p-[16px] text-muted-foreground">
            {t("No se encontraron organizaciones.")}
          </div>
        )}

        {tenants?.map((tenant) => (
          <SectionItem
            key={tenant.organization_id}
            title={tenant.name}
            description={`${tenant.tier_name ?? t("Sin plan")} · ${t(STATUS_LABELS[tenant.status] ?? tenant.status)} · ${tenant.seats_used}${tenant.seats_cap != null ? `/${tenant.seats_cap}` : ""} ${t("miembros")}`}
            aside={
              <div className="p-[8px]">
                <Building2 className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/admin/$orgId",
                params: { orgId: tenant.organization_id },
                hash: (prevHash) => prevHash!,
              })
            }
          />
        ))}
      </SectionBody>
    </>
  );
}
