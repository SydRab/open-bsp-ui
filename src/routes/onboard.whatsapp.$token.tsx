import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import Button from "@/components/Button";
import type { SignupPayload } from "@/contexts/WhatsAppIntegrationContext";

export const Route = createFileRoute("/onboard/whatsapp/$token")({
  component: Onboard,
});

type TokenValidation =
  | { status: "loading" }
  | { status: "valid"; organization_name: string }
  | { status: "invalid" }
  | { status: "success" }
  | { status: "error"; message: string };

/** What GET /whatsapp-management/onboard answers. */
type OnboardToken = { valid: boolean; organization_name?: string };

async function validateToken(token: string): Promise<TokenValidation> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-management/onboard?token=${token}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  });
  const data = (await res.json()) as OnboardToken;

  return data.valid
    ? { status: "valid", organization_name: data.organization_name ?? "" }
    : { status: "invalid" };
}

function Onboard() {
  const { token } = Route.useParams();
  const { translate: t } = useTranslation();
  const [state, setState] = useState<TokenValidation>({ status: "loading" });
  const [loading, setLoading] = useState(false);
  // The Facebook SDK loads asynchronously from connect.facebook.net, which is
  // commonly blocked by tracking protection / ad blockers. If it fails to load,
  // show the error up front instead of a button that cannot work.
  const [sdkFailed, setSdkFailed] = useState(() => !!window.__fbSdkFailed);

  useEffect(() => {
    const onFail = () => setSdkFailed(true);
    window.addEventListener("fb-sdk-failed", onFail);
    return () => window.removeEventListener("fb-sdk-failed", onFail);
  }, []);

  useEffect(() => {
    validateToken(token)
      .then(setState)
      .catch(() => setState({ status: "invalid" }));
  }, [token]);

  const handleSignup = useCallback(() => {
    const FB = window.FB;

    if (!FB) {
      // The SDK is served from connect.facebook.net, which tracking protection
      // (e.g. Firefox ETP) and ad/privacy blockers commonly block.
      setState({
        status: "error",
        message: t(
          "Couldn't load the Facebook SDK. Disable tracking protection or your ad blocker for this site, or try another browser.",
        ),
      });
      return;
    }

    window.__waSignupReport = (event, data) => {
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-management/onboard/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, event, data }),
        },
      ).catch((error: unknown) => {
        console.error("Could not record signup event:", error);
      });
    };

    FB.login(
      function (response: FBLoginResponse) {
        if (response.authResponse) {
          const code = response.authResponse.code;

          if (!code) {
            return;
          }

          setLoading(true);

          const sessionInfo: WASessionInfo = window.__waSessionInfo ?? {};

          const payload: SignupPayload = {
            code,
            application_id: import.meta.env.VITE_META_APP_ID,
            phone_number_id: sessionInfo.phone_number_id,
            waba_id: sessionInfo.waba_id,
            business_id: sessionInfo.business_id,
            flow_type: sessionInfo.flow_type,
          };

          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-management/onboard`;

          fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token, ...payload }),
          })
            .then((res) => {
              if (!res.ok) throw new Error("Signup failed");
              return res.json();
            })
            .then(() => {
              setState({ status: "success" });
            })
            .catch((error: Error) => {
              console.error("Onboard signup failed:", error);
              setState({
                status: "error",
                message: t(
                  "Connection error. Try again or contact the provider.",
                ),
              });
            })
            .finally(() => {
              setLoading(false);
            });
        }
      },
      {
        config_id: import.meta.env.VITE_FB_LOGIN_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      },
    );
  }, [token, t]);

  return (
    <div className="flex flex-col gap-9 justify-center items-center bg-background text-foreground h-dvh w-screen">
      <div className="text-primary tracking-tighter font-bold text-[36px]">
        OpenBSP
      </div>

      <div className="flex flex-col gap-4 w-[320px] text-center">
        {state.status === "loading" && (
          <p className="text-muted-foreground">{t("Validating link...")}</p>
        )}

        {state.status === "invalid" && (
          <div className="flex flex-col gap-2">
            <p className="text-destructive font-medium">
              {t("This link is invalid or has expired.")}
            </p>
            <p className="text-muted-foreground text-[14px]">
              {t("Request a new link from your provider.")}
            </p>
          </div>
        )}

        {state.status === "valid" && (
          <div className="flex flex-col gap-4">
            <p className="text-foreground">
              {t("Connect your WhatsApp number to")}{" "}
              <strong>{state.organization_name}</strong>
            </p>

            <div className="instructions text-left text-[14px] text-muted-foreground">
              <p>
                {t(
                  "Sign in to your Meta account and follow the registration process.",
                )}
              </p>
              <p>
                <strong>{t("Important requirements")}</strong>
              </p>
              <ul>
                <li>
                  {t(
                    "If you use the WhatsApp Business app, you can connect your current number and continue using the app.",
                  )}
                </li>
                <li>
                  {t(
                    "If you don't use the app, the number to connect must not be active on another WhatsApp account.",
                  )}
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              {sdkFailed && (
                <p className="text-destructive font-medium">
                  {t(
                    "Couldn't load the Facebook SDK. Disable tracking protection or your ad blocker for this site, or try another browser.",
                  )}
                </p>
              )}
              <Button
                disabled={sdkFailed}
                disabledReason={
                  sdkFailed
                    ? t(
                        "Couldn't load the Facebook SDK. Disable tracking protection or your ad blocker for this site, or try another browser.",
                      )
                    : undefined
                }
                loading={loading}
                className="primary bg-[#4267b2] hover:bg-[#4267b2]/90 text-white w-full"
                onClick={handleSignup}
              >
                {t("Continue with Facebook")}
              </Button>
            </div>
          </div>
        )}

        {state.status === "success" && (
          <div className="flex flex-col gap-2">
            <p className="text-primary font-medium text-[18px]">
              {t("Your WhatsApp number was connected successfully.")}
            </p>
            <p className="text-muted-foreground text-[14px]">
              {t("You can close this page.")}
            </p>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col gap-3">
            <p className="text-destructive font-medium">{state.message}</p>
            <Button
              className="primary bg-[#4267b2] hover:bg-[#4267b2]/90 text-white w-full"
              onClick={() => {
                setState({
                  status: "valid",
                  organization_name: "",
                });
                // Re-validate token
                validateToken(token)
                  .then(setState)
                  .catch(() => setState({ status: "invalid" }));
              }}
            >
              {t("Retry")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
