import { useTranslation } from "@/hooks/useTranslation";
import type { ConnectionScope } from "@/hooks/useConnectionScope";

/**
 * Whose account is being connected. The organization's option stays visible
 * without the role for it — hiding it would leave a member wondering where the
 * shared inbox went — and says why it is out of reach.
 */
export default function ScopeToggle({
  value,
  onChange,
  isAdmin,
  disabled,
}: {
  value: ConnectionScope;
  onChange: (scope: ConnectionScope) => void;
  isAdmin: boolean;
  disabled?: boolean;
}) {
  const { translate: t } = useTranslation();

  const options: { scope: ConnectionScope; label: string }[] = [
    { scope: "organization", label: t("Organization's") },
    { scope: "personal", label: t("Personal") },
  ];

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex gap-[8px]">
        {options.map(({ scope, label }) => {
          const unavailable = scope === "organization" && !isAdmin;

          return (
            <button
              key={scope}
              type="button"
              disabled={disabled || unavailable}
              title={
                unavailable
                  ? t("Requires administrator permissions")
                  : undefined
              }
              onClick={() => onChange(scope)}
              className={
                "px-[12px] py-[6px] rounded-full text-[14px] " +
                (value === scope
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-accent") +
                (disabled || unavailable
                  ? " opacity-50 cursor-not-allowed hover:bg-transparent"
                  : "")
              }
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[13px] text-muted-foreground">
        {value === "organization"
          ? t("Its conversations are visible to the whole team.")
          : t("Its conversations are visible only to you.")}
      </p>
    </div>
  );
}
