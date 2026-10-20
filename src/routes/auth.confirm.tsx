// [crm] Email link landing page (P1-03). Invite and sign-in emails link here
// with a one-time token hash (see the API's supabase/templates/*.html); we
// exchange it for a session with verifyOtp. The default /auth/v1/verify link
// returns the session in the URL fragment, which this app's PKCE client
// rejects, so invitees landed on the login page.
// https://supabase.com/docs/guides/auth/auth-email-templates
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import Spinner from "@/components/Spinner";

// Only what our templates send.
const ALLOWED_TYPES: EmailOtpType[] = ["invite", "email", "magiclink"];

// A token works once. React's StrictMode runs effects twice in development,
// so remember which ones this page already sent.
const sent = new Set<string>();

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: (search): { token_hash?: string; type?: string } => ({
    token_hash: (search.token_hash as string) || undefined,
    type: (search.type as string) || undefined,
  }),
  component: AuthConfirm,
});

function AuthConfirm() {
  const { translate: t } = useTranslation();
  const { token_hash: tokenHash, type } = Route.useSearch();
  const [failed, setFailed] = useState(false);

  const valid = !!tokenHash && ALLOWED_TYPES.includes(type as EmailOtpType);

  useEffect(() => {
    if (!tokenHash || !valid || sent.has(tokenHash)) return;
    sent.add(tokenHash);

    // Keep the token out of the address bar and browser history.
    window.history.replaceState(null, "", "/auth/confirm");

    void supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
      .then(({ error }) => {
        if (error) {
          setFailed(true);
          return;
        }
        // A full load, so nothing cached for a previous user survives.
        window.location.replace("/");
      });
  }, [valid, tokenHash, type]);

  return (
    <div className="flex flex-col gap-6 justify-center items-center bg-background text-foreground h-dvh w-screen px-4 text-center">
      {!valid || failed ? (
        <>
          <div className="text-[18px]">
            {t("Este enlace no es válido o ya caducó.")}
          </div>
          <div className="text-muted-foreground">
            {t("Pide a quien te invitó que te envíe una nueva invitación.")}
          </div>
          <Link to="/login" className="text-primary font-bold">
            {t("Ir a iniciar sesión")}
          </Link>
        </>
      ) : (
        <>
          <Spinner size={24} />
          <div className="text-muted-foreground">{t("Entrando…")}</div>
        </>
      )}
    </div>
  );
}
