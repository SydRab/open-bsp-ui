// [crm] P3-06: a durable in-app notification bell -- unlike P2-09f's
// browser-popup-only mechanism, these survive a closed tab (crm.
// notifications, polled every 30s rather than wired to Realtime, since
// durability was the actual gap, not latency).
import { Badge, Dropdown, Empty } from "antd";
import { Bell } from "lucide-react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationRow,
} from "@/queries/useCrm";
import { useTranslation } from "@/hooks/useTranslation";

function timeAgo(iso: string, t: (s: string) => string): string {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  if (minutes < 1) return t("ahora");
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function NotificationBell() {
  const { translate: t } = useTranslation();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  const onSelect = (notification: NotificationRow) => {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
  };

  return (
    <Dropdown
      trigger={["click"]}
      popupRender={() => (
        <div className="w-[340px] max-h-[420px] overflow-y-auto bg-popover border border-border rounded-[8px] shadow-lg py-[4px]">
          <div className="flex items-center justify-between px-[12px] py-[8px]">
            <span className="text-[13px] font-semibold text-foreground">
              {t("Notificaciones")}
            </span>
            {unreadCount > 0 && (
              <button
                className="text-[12px] text-primary hover:underline"
                onClick={() => markAllRead.mutate()}
              >
                {t("Marcar todo como leído")}
              </button>
            )}
          </div>
          {(notifications ?? []).length === 0 ? (
            <Empty
              description={t("Sin notificaciones")}
              className="py-[16px]"
            />
          ) : (
            (notifications ?? []).map((n) => (
              <div
                key={n.id}
                onClick={() => onSelect(n)}
                className={`px-[12px] py-[8px] cursor-pointer hover:bg-muted border-t border-border ${
                  n.read_at ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-[8px]">
                  <span className="text-[13px] text-foreground font-medium">
                    {n.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {timeAgo(n.created_at, t)}
                  </span>
                </div>
                {n.body && (
                  <div className="text-[12px] text-muted-foreground mt-[2px]">
                    {n.body}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    >
      <div className="cursor-pointer p-[6px] rounded-full hover:bg-muted">
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <Bell className="w-[22px] h-[22px] text-foreground" />
        </Badge>
      </div>
    </Dropdown>
  );
}
