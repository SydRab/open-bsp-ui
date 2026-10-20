// [crm] Organization profile (P1-01): slug, timezone and language. Shown on
// the organization settings page. Status fields are platform-managed and not
// editable here.
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type OrgProfileUpdate,
  useMyPermissions,
  useOrgProfile,
  useUpdateOrgProfile,
} from "@/queries/useCrm";
import SelectField from "@/components/SelectField";
import Button from "@/components/Button";

// The tenant default is Asia/Kolkata; this list covers the regions we serve
// first. A timezone set elsewhere (e.g. by support) is still shown.
const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
];

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;

export default function OrgProfileForm() {
  const { translate: t } = useTranslation();
  const { data: profile } = useOrgProfile();
  const { can } = useMyPermissions();
  const updateProfile = useUpdateOrgProfile();
  const canManage = can("organization.manage");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isValid, isDirty, errors },
  } = useForm<OrgProfileUpdate>({ mode: "onChange" });

  useEffect(() => {
    if (profile) {
      reset({
        slug: profile.slug,
        timezone: profile.timezone,
        locale: profile.locale,
      });
    }
  }, [profile, reset]);

  if (!profile) return null;

  const timezones = TIMEZONES.includes(profile.timezone)
    ? TIMEZONES
    : [profile.timezone, ...TIMEZONES];

  return (
    <form
      id="org-profile-form"
      className="flex flex-col gap-[16px]"
      onSubmit={handleSubmit((data) => updateProfile.mutate(data))}
    >
      <div className="text-[16px] text-muted-foreground">{t("Perfil")}</div>

      <label>
        <div className="label">{t("Identificador (slug)")}</div>
        <input
          className="text"
          disabled={!canManage}
          placeholder="my-academy"
          {...register("slug", {
            required: true,
            setValueAs: (v: string) => v.trim().toLowerCase(),
            pattern: SLUG_PATTERN,
          })}
        />
        {errors.slug && (
          <div className="text-destructive text-[13px] mt-[4px]">
            {t(
              "De 3 a 48 letras minúsculas, números o guiones; sin guion al inicio ni al final.",
            )}
          </div>
        )}
      </label>

      <SelectField
        control={control}
        name="timezone"
        label={t("Zona horaria")}
        options={timezones.map((tz) => ({ value: tz, label: tz }))}
        disabled={!canManage}
      />

      <SelectField
        control={control}
        name="locale"
        label={t("Idioma")}
        options={[
          { value: "en", label: "English" },
          { value: "hi", label: "हिंदी (Hindi)" },
        ]}
        disabled={!canManage}
      />

      {updateProfile.error && (
        <div className="text-destructive text-[13px]">
          {updateProfile.error.message.includes(
            "organization_profiles_slug_key",
          )
            ? t("Ese identificador ya está en uso.")
            : updateProfile.error.message}
        </div>
      )}

      <div>
        <Button
          form="org-profile-form"
          type="submit"
          disabled={!canManage}
          invalid={!isValid || !isDirty}
          loading={updateProfile.isPending}
          disabledReason={t(
            "Requiere el permiso para gestionar la organización",
          )}
          className="primary"
        >
          {t("Guardar perfil")}
        </Button>
      </div>
    </form>
  );
}
