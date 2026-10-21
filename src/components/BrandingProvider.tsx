// [crm] Branding tokens (P1-11): applies the active organization's
// branding.primary_color as a live CSS override. A plain color string works
// directly as a custom property value regardless of the oklch() default it
// replaces — no conversion needed. Cleans up on unmount/org switch so
// leaving an organization with no override doesn't leak another one's color.
import { useEffect } from "react";
import { useSettings } from "@/queries/useCrm";

const OVERRIDE_PROPERTIES = ["--primary", "--sidebar-primary", "--ring"];

export default function BrandingProvider() {
  const { data: settings } = useSettings();
  const color = settings?.find((s) => s.key === "branding.primary_color")
    ?.value as string | undefined;

  useEffect(() => {
    const root = document.documentElement;
    if (color) {
      OVERRIDE_PROPERTIES.forEach((prop) =>
        root.style.setProperty(prop, color),
      );
    } else {
      OVERRIDE_PROPERTIES.forEach((prop) => root.style.removeProperty(prop));
    }
    return () => {
      OVERRIDE_PROPERTIES.forEach((prop) => root.style.removeProperty(prop));
    };
  }, [color]);

  return null;
}
