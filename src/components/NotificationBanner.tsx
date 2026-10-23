// [crm] P2-09f: a one-time, self-dismissing offer to enable desktop
// notifications -- shown only while permission is still "default" (never
// asked). Once the browser prompt resolves (granted or denied either way),
// permission is no longer "default" and this never reappears; there's no
// in-app way to revoke a grant, so no "disable" control either -- that's
// the browser's own site-settings job.
import { useState } from "react";
import { Bell } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import SectionItem from "./SectionItem";

export default function NotificationBanner() {
  const { translate: t } = useTranslation();
  const [visible, setVisible] = useState(
    typeof Notification !== "undefined" &&
      Notification.permission === "default",
  );

  if (!visible) return null;

  return (
    <div className="pt-[10px] pb-[5px] pl-[10px] pr-[20px]">
      <div className="bg-primary/10 rounded-lg">
        <SectionItem
          title={t("Activar notificaciones de escritorio")}
          description={t(
            "Recibe un aviso cuando llegue un mensaje mientras no estás mirando esa conversación.",
          )}
          aside={
            <div className="p-[8px]">
              <Bell className="w-[24px] h-[24px] text-primary" />
            </div>
          }
          onClick={() => {
            Notification.requestPermission()
              .catch(console.error)
              .finally(() => setVisible(false));
          }}
        />
      </div>
    </div>
  );
}
