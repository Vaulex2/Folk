"use client";
import { useState } from "react";
import { useActionState } from "react";
import { signIn } from "@/app/auth/actions";
import type { FormState } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";
import { IconMail, IconLock, IconEye, IconEyeOff, IconArrowR } from "@/components/icons";

export default function LoginForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(signIn, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="signin-form">
      <div className="field-icon">
        <span className="lead"><IconMail size={17} /></span>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.email")}
          aria-label={t("auth.email")}
          required
        />
      </div>

      <div className="field-icon">
        <span className="lead"><IconLock size={17} /></span>
        <input
          className="input has-trail"
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder={t("auth.password")}
          aria-label={t("auth.password")}
          required
        />
        <button
          type="button"
          className="trail"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={t(showPassword ? "auth.hidePassword" : "auth.showPassword")}
          aria-pressed={showPassword}
        >
          {showPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
        </button>
      </div>

      {state.error && <p className="form-err" style={{ margin: 0 }}>{t(state.error)}</p>}

      <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
        {pending ? (
          <>
            <span className="signin-spinner" aria-hidden />
            {t("auth.signingIn")}
          </>
        ) : (
          <>
            {t("auth.signIn")}
            <IconArrowR size={16} />
          </>
        )}
      </button>
    </form>
  );
}
