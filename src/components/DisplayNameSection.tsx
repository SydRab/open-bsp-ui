// [crm] P2-11: verified display name + its change-request status.
// Re-registering after an approved change needs the number's 2-step
// verification PIN -- asked for right here, never stored.
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import Button from "@/components/Button";
import type { WhatsAppOrganizationAddressExtra } from "@/supabase/client";
import {
  useReregisterWhatsAppNumber,
  useRequestDisplayNameChange,
} from "@/queries/useWhatsAppBusinessProfile";

export default function DisplayNameSection({
  address,
  extra,
}: {
  address: string;
  extra: WhatsAppOrganizationAddressExtra | undefined;
}) {
  const { translate: t } = useTranslation();
  const requestChange = useRequestDisplayNameChange(address);
  const reregister = useReregisterWhatsAppNumber(address);

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [reregistering, setReregistering] = useState(false);
  const [pin, setPin] = useState("");

  const status = extra?.name_status;

  return (
    <>
      <label>
        <div className="label">{t("Verified name")}</div>
        <input
          type="text"
          className="text"
          value={extra?.verified_name || t("No name")}
          readOnly
        />
      </label>

      {(status === "PENDING" || status === "DEFERRED") && (
        <div className="instructions">
          <p>
            {t("Name change under review")}: "{extra?.requested_verified_name}"
          </p>
        </div>
      )}

      {status === "REJECTED" && (
        <div className="instructions">
          <p className="text-destructive font-medium">
            {t("Rejected name change to")} "{extra?.requested_verified_name}"
            {extra?.name_rejection_reason
              ? ` (${extra.name_rejection_reason})`
              : ""}
          </p>
        </div>
      )}

      {status === "APPROVED" && (
        <div className="instructions">
          <p className="text-primary font-medium">
            {t(
              "The new name was approved. Re-register the number to apply it.",
            )}
          </p>
          {reregistering ? (
            <div className="flex gap-[8px] items-center">
              <input
                type="password"
                className="text"
                placeholder={t("Two-step verification PIN")}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              <Button
                className="secondary"
                loading={reregister.isPending}
                disabled={!pin.trim()}
                onClick={() =>
                  reregister.mutate(pin.trim(), {
                    onSuccess: () => {
                      setReregistering(false);
                      setPin("");
                    },
                  })
                }
              >
                {t("Confirm")}
              </Button>
            </div>
          ) : (
            <Button
              className="secondary"
              onClick={() => setReregistering(true)}
            >
              {t("Re-register")}
            </Button>
          )}
        </div>
      )}

      {editing ? (
        <div className="flex gap-[8px] items-center mb-[16px]">
          <input
            type="text"
            className="text"
            placeholder={t("New name")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            className="secondary"
            loading={requestChange.isPending}
            disabled={!newName.trim()}
            onClick={() =>
              requestChange.mutate(newName.trim(), {
                onSuccess: () => {
                  setEditing(false);
                  setNewName("");
                },
              })
            }
          >
            {t("Submit")}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="text-[13px] text-primary hover:underline mb-[16px]"
          onClick={() => setEditing(true)}
        >
          {t("Request a name change")}
        </button>
      )}
    </>
  );
}
