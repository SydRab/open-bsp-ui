import { supabase } from "@/supabase/client";
import Avatar from "./Avatar";
import useBoundStore from "@/stores/useBoundStore";
import { useTranslation } from "@/hooks/useTranslation";
import {
  LogOut,
  Settings,
  MessageSquareText,
  Unplug,
  Bot,
  BarChart3,
  Languages,
  Plus,
  NotebookTabs,
  ShieldUser,
  AlarmClockCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { LinkButton } from "./LinkButton";
import { resetAuthorizedCache } from "@/utils/IdbUtils";
import { useCurrentAgent } from "@/queries/useAgents";
import { Dropdown } from "antd";
import { useOrganizations } from "@/queries/useOrganizations";
// [crm] Super-admin console (P1-10): a separate axis from tenant roles, so
// this is its own hook rather than useMyPermissions/can().
import { useIsPlatformAdmin } from "@/queries/useAdmin";
// [crm] Permission-aware navigation (P1-11): hide a section entirely rather
// than show it disabled — there is nothing useful to do there without the
// permission, unlike a single gated action.
import { useMyPermissions, useSettings } from "@/queries/useCrm";

export default function Menu() {
  const user = useBoundStore((state) => state.ui.user);
  // Supabase types user_metadata as Record<string, any>; this is what SSO fills.
  const userMetadata = user?.user_metadata as
    | { picture?: string; name?: string }
    | undefined;

  const { data: agent } = useCurrentAgent();

  const setActiveOrg = useBoundStore((state) => state.ui.setActiveOrg);
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  const { data: organizations } = useOrganizations();
  const { data: isPlatformAdmin } = useIsPlatformAdmin();
  const { can } = useMyPermissions();
  const { data: settings } = useSettings();
  const logoUrl = settings?.find((s) => s.key === "branding.logo_url")
    ?.value as string | undefined;

  const {
    translate: t,
    currentLanguage,
    setCurrentLanguage,
  } = useTranslation();

  // Simpler approach - call useLocation without select first
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  return (
    <div
      className={
        "h-full w-full z-10 flex flex-col justify-between pb-[10px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
      }
    >
      {/* Upper section */}
      <div className="flex flex-col items-center">
        {/* [crm] Branding tokens (P1-11) */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt=""
            className="w-[28px] h-[28px] object-contain mt-[10px] rounded-[4px]"
          />
        )}

        {/* Conversations button */}
        {can("conversations.view") && (
          <LinkButton
            to="/conversations"
            title={t("Mensajes")}
            isActive={pathname.startsWith("/conversations")}
            className="mt-[10px]"
          >
            <MessageSquareText className="w-[24px] h-[24px] stroke-[2]" />
          </LinkButton>
        )}

        {/* Agents button */}
        {can("ai_agents.manage") && (
          <LinkButton
            to="/agents"
            title={t("Agentes")}
            isActive={pathname.startsWith("/agents")}
            className="mt-[10px]"
          >
            <Bot className="w-[24px] h-[24px] stroke-[2]" />
          </LinkButton>
        )}

        {/* [crm] P3-06: speed-to-lead's own triage list, not the pipeline
            board (/leads, P3-07) -- deals.edit is the same bar every
            lead-working action has used since P3-02. */}
        {can("deals.edit") && (
          <LinkButton
            to="/leads/unanswered"
            title={t("Leads sin respuesta")}
            isActive={pathname.startsWith("/leads")}
            className="mt-[10px]"
          >
            <AlarmClockCheck className="w-[24px] h-[24px] stroke-[2]" />
          </LinkButton>
        )}

        {/* Contacts button */}
        {can("contacts.view") && (
          <LinkButton
            to="/contacts"
            title={t("Contactos")}
            isActive={pathname.startsWith("/contacts")}
            className="mt-[10px]"
          >
            <NotebookTabs className="w-[24px] h-[24px] stroke-[2]" />
          </LinkButton>
        )}

        {/* Integrations button */}
        {can("integrations.manage") && (
          <LinkButton
            to="/integrations"
            title={t("Integraciones")}
            isActive={pathname.startsWith("/integrations")}
            className="mt-[10px]"
          >
            <Unplug className="w-[24px] h-[24px] stroke-[2]" />
          </LinkButton>
        )}

        {/* Stats button */}
        {can("reports.view") && (
          <LinkButton
            to="/stats"
            title={t("Estadísticas")}
            isActive={pathname.startsWith("/stats")}
            className="mt-[10px]"
          >
            <BarChart3 className="w-[24px] h-[24px] stroke-[2]" />
          </LinkButton>
        )}
      </div>

      {/* Lower section */}
      <div className="flex flex-col items-center">
        {/* [crm] Super-admin console (P1-10) */}
        {isPlatformAdmin && (
          <LinkButton
            to="/admin"
            title={t("Panel de administración")}
            isActive={pathname.startsWith("/admin")}
          >
            <ShieldUser className="w-[20px] h-[20px] stroke-[2]" />
          </LinkButton>
        )}

        {/* Settings button */}
        <LinkButton
          to="/settings"
          title={t("Preferencias")}
          isActive={pathname.startsWith("/settings")}
          className="mt-[10px]"
        >
          <Settings className="w-[20px] h-[20px] stroke-[2]" />
        </LinkButton>

        <Dropdown
          menu={{
            items: [
              {
                key: "user_email",
                type: "group", // using group name as title style
                label: user?.email || "",
              },
              { type: "divider" },
              {
                key: "orgs",
                type: "group",
                label: "Organizaciones",
                children: [
                  ...(organizations?.map((org) => ({
                    key: org.id,
                    label: org.name,
                    onClick: () => {
                      setActiveOrg(org.id);
                      void navigate({ to: "/conversations" });
                    },
                  })) || []),
                  {
                    key: "new_org",
                    label: t("Nueva organización"),
                    icon: <Plus className="w-[16px] h-[16px]" />,
                    onClick: () =>
                      navigate({
                        to: "/settings/organization/new",
                        hash: (prevHash) => prevHash!,
                      }),
                  },
                ],
              },
              { type: "divider" },
              {
                key: "lang",
                label: t("Idioma"),
                icon: <Languages className="w-[16px] h-[16px]" />,
                children: (["es", "en", "pt", "sw", "fr", "hi"] as const).map(
                  (lang) => ({
                    key: lang,
                    label: {
                      es: "Español",
                      en: "English",
                      pt: "Português",
                      sw: "Kiswahili",
                      fr: "Français",
                      hi: "हिन्दी",
                    }[lang],
                    className:
                      lang === currentLanguage
                        ? "ant-dropdown-menu-item-selected"
                        : "",
                    onClick: () => setCurrentLanguage(lang),
                  }),
                ),
              },
              { type: "divider" },
              {
                key: "logout",
                label: t("Cerrar sesión"),
                icon: <LogOut className="w-[16px] h-[16px]" />,
                onClick: () => {
                  void supabase.auth.signOut();
                  resetAuthorizedCache().catch(console.error);
                },
              },
            ],
            selectable: true,
            selectedKeys: [...(activeOrgId ? [activeOrgId] : [])],
          }}
          trigger={["click"]}
        >
          <div className="cursor-pointer mt-[10px] p-[2px] rounded-full hover:bg-muted">
            <Avatar
              src={agent?.picture || userMetadata?.picture}
              fallback={(
                agent?.name ||
                userMetadata?.name ||
                user?.email ||
                "?"
              ).charAt(0)}
              size={32}
              className="bg-primary text-primary-foreground text-[14px] border border-sidebar-border"
            />
          </div>
        </Dropdown>
      </div>
    </div>
  );
}
