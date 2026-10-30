import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import { useTranslation } from "@/hooks/useTranslation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Users,
  Webhook,
  Key,
  ShieldCheck,
  History,
  SlidersHorizontal,
  ScrollText,
  TextCursorInput,
  Gem,
  Fingerprint,
  Workflow,
  Target,
} from "lucide-react";
import { useMyPermissions } from "@/queries/useCrm";

export const Route = createFileRoute("/_auth/settings/")({
  component: SettingsIndex,
});

function SettingsIndex() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useMyPermissions();

  return (
    <>
      <SectionHeader title={t("Preferencias")} />

      <SectionBody className="gap-4">
        <div className="flex flex-col">
          <SectionItem
            title={t("Organización")}
            aside={
              <div className="p-[8px]">
                <Building2 className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/organization",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          <SectionItem
            title={t("Miembros")}
            aside={
              <div className="p-[8px]">
                <Users className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/members",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {/* [crm] Security / 2FA (P1-11) */}
          <SectionItem
            title={t("Seguridad")}
            aside={
              <div className="p-[8px]">
                <Fingerprint className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/security",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {/* [crm] Roles & permissions (P1-02) */}
          <SectionItem
            title={t("Roles y permisos")}
            aside={
              <div className="p-[8px]">
                <ShieldCheck className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/roles",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {/* [crm] Rules & modules (P1-04) */}
          <SectionItem
            title={t("Reglas y módulos")}
            aside={
              <div className="p-[8px]">
                <SlidersHorizontal className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/rules",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {/* [crm] Plan & features (P1-09) */}
          <SectionItem
            title={t("Plan y funciones")}
            aside={
              <div className="p-[8px]">
                <Gem className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/plan",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {/* [crm] Custom fields (P1-06) */}
          <SectionItem
            title={t("Campos personalizados")}
            aside={
              <div className="p-[8px]">
                <TextCursorInput className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/fields",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {/* [crm] Pipeline catalogs: stages, qualities, drop reasons (P3-07b) */}
          {can("organization.manage") && (
            <SectionItem
              title={t("Pipeline")}
              aside={
                <div className="p-[8px]">
                  <Workflow className="w-[24px] h-[24px] text-muted-foreground" />
                </div>
              }
              onClick={() =>
                navigate({
                  to: "/settings/pipeline",
                  hash: (prevHash) => prevHash!,
                })
              }
            />
          )}
          {/* [crm] P3-09: conversion feedback to Meta -- mapping config + delivery log */}
          {can("organization.manage") && (
            <SectionItem
              title={t("Conversiones")}
              aside={
                <div className="p-[8px]">
                  <Target className="w-[24px] h-[24px] text-muted-foreground" />
                </div>
              }
              onClick={() =>
                navigate({
                  to: "/settings/conversions",
                  hash: (prevHash) => prevHash!,
                })
              }
            />
          )}
          {/* [crm] Disclaimer (P1-07) */}
          <SectionItem
            title={t("Aviso legal")}
            aside={
              <div className="p-[8px]">
                <ScrollText className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/disclaimer",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {/* [crm] Activity log (P1-08) */}
          {can("audit.view") && (
            <SectionItem
              title={t("Registro de actividad")}
              aside={
                <div className="p-[8px]">
                  <History className="w-[24px] h-[24px] text-muted-foreground" />
                </div>
              }
              onClick={() =>
                navigate({
                  to: "/settings/activity",
                  hash: (prevHash) => prevHash!,
                })
              }
            />
          )}
          <SectionItem
            title={t("Webhooks")}
            aside={
              <div className="p-[8px]">
                <Webhook className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/webhooks",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          <SectionItem
            title={t("Claves API")}
            aside={
              <div className="p-[8px]">
                <Key className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/settings/api-keys",
                hash: (prevHash) => prevHash!,
              })
            }
          />
        </div>
      </SectionBody>
    </>
  );
}
