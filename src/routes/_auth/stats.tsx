import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import SectionBody from "@/components/SectionBody";
import SectionItem from "@/components/SectionItem";
import { useTranslation } from "@/hooks/useTranslation";
import { BarChart3, Gauge, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_auth/stats")({
  component: StatsLayout,
});

function StatsLayout() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <>
      <SectionHeader title={t("Estadísticas")} />
      <SectionBody>
        <SectionItem
          title={t("Cuotas")}
          aside={
            <div
              className={`p-[8px] rounded-full ${pathname === "/stats/quotas" ? "bg-primary/10" : ""}`}
            >
              <Gauge
                className={`w-[24px] h-[24px] ${pathname === "/stats/quotas" ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
          }
          onClick={() =>
            navigate({ to: "/stats/quotas", hash: (prev) => prev! })
          }
          className={pathname === "/stats/quotas" ? "bg-accent" : ""}
        />
        <SectionItem
          title={t("Uso")}
          aside={
            <div
              className={`p-[8px] rounded-full ${pathname === "/stats/usage" ? "bg-primary/10" : ""}`}
            >
              <BarChart3
                className={`w-[24px] h-[24px] ${pathname === "/stats/usage" ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
          }
          onClick={() =>
            navigate({ to: "/stats/usage", hash: (prev) => prev! })
          }
          className={pathname === "/stats/usage" ? "bg-accent" : ""}
        />
        {/* [crm] P3-10a: pipeline reports (funnel, source/ad performance) --
            the whole /stats section is already gated on reports.view
            (Menu.tsx), so this tab needs no extra check of its own. */}
        <SectionItem
          title={t("Pipeline")}
          aside={
            <div
              className={`p-[8px] rounded-full ${pathname === "/stats/pipeline" ? "bg-primary/10" : ""}`}
            >
              <TrendingUp
                className={`w-[24px] h-[24px] ${pathname === "/stats/pipeline" ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
          }
          onClick={() =>
            navigate({ to: "/stats/pipeline", hash: (prev) => prev! })
          }
          className={pathname === "/stats/pipeline" ? "bg-accent" : ""}
        />
      </SectionBody>
      <Outlet />
    </>
  );
}
