// [crm] P2-12: UI for crm.member_address_access -- restrict a member to
// specific shared WhatsApp numbers, instead of seeing every one connected
// to the org. The backend (an allowlist: no rows = unrestricted) has
// existed since Phase 1; this is its first UI. Only shared (org-wide,
// agent_id null) WhatsApp numbers are listed -- a personal connection is
// never shared in the first place, so restricting it means nothing.
import { useTranslation } from "@/hooks/useTranslation";
import Switch from "@/components/Switch";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import {
  useMemberAddressAccess,
  useSetMemberAddressAccess,
} from "@/queries/useCrm";
import type { WhatsAppOrganizationAddressExtra } from "@/supabase/client";

export default function MemberAddressAccess({
  agentId,
  disabled,
  warnSelfLockout,
}: {
  agentId: string;
  disabled: boolean;
  /** No server-side bypass exists for owner/admin tiers -- crm.
   * get_hidden_addresses applies the same restriction to everyone. Shown
   * as a warning, not a block, since the backend itself doesn't special-case it. */
  warnSelfLockout: boolean;
}) {
  const { translate: t } = useTranslation();
  const { data: addresses } = useOrganizationsAddresses();
  const { data: accessSet } = useMemberAddressAccess(agentId);
  const setAccess = useSetMemberAddressAccess();

  const numbers = (addresses ?? []).filter(
    (a) => a.service === "whatsapp" && !a.agent_id,
  );

  const restricted = !!accessSet?.size;

  if (!numbers.length) return null;

  return (
    <div className="flex flex-col gap-[8px] mt-[16px]">
      <div className="flex items-center justify-between">
        <div className="label mb-0">{t("Restringir acceso a números")}</div>
        <Switch
          checked={restricted}
          disabled={disabled}
          onCheckedChange={(checked) => {
            if (checked) {
              // Starting the restriction: keep every number visible at
              // first (allow them all), so turning it on never instantly
              // hides something -- the admin then unchecks what they want
              // hidden.
              for (const n of numbers) {
                setAccess.mutate({
                  agentId,
                  service: "whatsapp",
                  address: n.address,
                  allowed: true,
                });
              }
            } else {
              // Ending it: clear every row -- the backend turns the
              // restriction off once none are left.
              for (const n of numbers) {
                setAccess.mutate({
                  agentId,
                  service: "whatsapp",
                  address: n.address,
                  allowed: false,
                });
              }
            }
          }}
        />
      </div>

      {warnSelfLockout && (
        <div className="text-[13px] text-destructive">
          {t(
            "Este miembro tiene un rol de administración. Restringir su acceso aplica igual -- no hay excepción para administradores.",
          )}
        </div>
      )}

      {restricted && (
        <div className="flex flex-col gap-[4px]">
          {numbers.map((n) => {
            const extra = n.extra as WhatsAppOrganizationAddressExtra | null;
            const allowed = accessSet?.has(`whatsapp:${n.address}`) ?? false;

            return (
              <label
                key={n.address}
                className="flex items-center gap-[8px] text-[14px]"
              >
                <input
                  type="checkbox"
                  checked={allowed}
                  disabled={disabled}
                  onChange={(e) =>
                    setAccess.mutate({
                      agentId,
                      service: "whatsapp",
                      address: n.address,
                      allowed: e.target.checked,
                    })
                  }
                />
                {extra?.verified_name ||
                  formatPhoneNumber(extra?.phone_number || n.address)}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
