import React, { ReactNode, useState } from "react";
import { LockKeyhole, IdCard, Eye, EyeOff } from "lucide-react";
import { Button } from "./Button";

export interface ManualAccessFormProps {
  /** Heading shown under the icon. Defaults to "Manual access". */
  title?: string;
  /** Description shown beneath the heading. */
  description?: string;
  /** Optional italic line below the description (e.g. kiosk's photo notice). */
  subtitle?: string;

  /** Label for the first field. */
  loginIdLabel?: string;
  loginIdPlaceholder?: string;
  /** Force the login id to upper-case as the user types (kiosk). */
  loginIdUppercase?: boolean;
  loginIdAutoComplete?: string;

  /** Label for the PIN field. */
  pinLabel?: string;
  pinPlaceholder?: string;
  /** Cap the PIN length (kiosk = 6). Leave undefined for no cap. */
  pinMaxLength?: number;
  pinAutoComplete?: string;

  /** Submit-button label and busy variant. */
  submitLabel: string;
  submittingLabel?: string;

  /** Initial values. */
  initialLoginId?: string;
  initialPin?: string;

  /** True while the parent is processing the submitted credentials. */
  isSubmitting?: boolean;
  /** Force the submit button disabled regardless of input state. */
  disabled?: boolean;

  /** Called with the trimmed login id and pin when the form is submitted. */
  onSubmit: (loginId: string, pin: string) => void | Promise<void>;

  /** Rendered below the submit button — e.g. an "OR" + facial-login section
   *  on the employee portal, or a "Back to action picker" on the kiosk. */
  footer?: ReactNode;

  /** Render the icon-on-top header. Set false when the surrounding screen
   *  already provides one (e.g. the Employee Portal's mode-toggle header). */
  showHeader?: boolean;
}

/**
 * Shared "Manual access" form. The Employee Portal uses it to sign an
 * employee in. The TimeClock kiosk uses the same component for PIN-override
 * punches. The look (icon-on-top header, control-field inputs with leading
 * lucide icons, eye toggle on PIN, full-width submit) stays identical so
 * both surfaces feel like the same product.
 */
export function ManualAccessForm({
  title = "Manual access",
  description = "Enter your credentials to continue.",
  subtitle,
  loginIdLabel = "Employee ID or Email",
  loginIdPlaceholder = "Enter employee ID or email",
  loginIdUppercase = false,
  loginIdAutoComplete = "username",
  pinLabel = "PIN",
  pinPlaceholder = "Enter access PIN",
  pinMaxLength,
  pinAutoComplete = "current-password",
  submitLabel,
  submittingLabel,
  initialLoginId = "",
  initialPin = "",
  isSubmitting = false,
  disabled = false,
  onSubmit,
  footer,
  showHeader = true,
}: ManualAccessFormProps) {
  const [loginId, setLoginId] = useState(initialLoginId);
  const [pin, setPin] = useState(initialPin);
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(loginId.trim(), pin.trim());
  };

  const pinTooShort = typeof pinMaxLength === "number" && pin.length !== pinMaxLength;
  const submitDisabled = disabled || !loginId.trim() || !pin.trim() || pinTooShort;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 sm:gap-8">
      {showHeader && (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-[68px] h-[68px] rounded-full bg-[#E8F3EE] flex items-center justify-center text-[#0B7A4B]">
            <LockKeyhole size={32} strokeWidth={2.2} />
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-text-primary">{title}</h1>
          <p className="text-[15px] sm:text-[16px] text-text-secondary">{description}</p>
          {subtitle && (
            <p className="text-[12px] sm:text-[13px] text-text-muted italic mt-1">{subtitle}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="block text-[16px] font-medium text-text-primary">
            {loginIdLabel}
          </label>
          <div className="relative">
            <IdCard
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(loginIdUppercase ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={loginIdPlaceholder}
              className={`control-field pl-10 ${loginIdUppercase ? "uppercase" : ""}`}
              autoComplete={loginIdAutoComplete}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="block text-[16px] font-medium text-text-primary">
            {pinLabel}
          </label>
          <div className="relative">
            <LockKeyhole
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => {
                const next = pinMaxLength ? e.target.value.replace(/\D/g, "") : e.target.value;
                setPin(pinMaxLength ? next.slice(0, pinMaxLength) : next);
              }}
              placeholder={pinPlaceholder}
              maxLength={pinMaxLength}
              className="control-field h-12 pl-10 pr-12 tracking-[0.2em] font-medium"
              autoComplete={pinAutoComplete}
            />
            <Button
              variant="ghost"
              size="xs"
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1 h-auto w-auto min-w-0"
              aria-label={showPin ? "Hide PIN" : "Show PIN"}
            >
              {showPin ? <Eye size={20} /> : <EyeOff size={20} />}
            </Button>
          </div>
        </div>
      </div>

      <Button type="submit" isLoading={isSubmitting} disabled={submitDisabled} fullWidth>
        {isSubmitting && submittingLabel ? submittingLabel : submitLabel}
      </Button>

      {footer}
    </form>
  );
}
