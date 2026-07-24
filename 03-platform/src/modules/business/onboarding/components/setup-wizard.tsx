/**
 * Purpose:
 * Client wizard for IP-006 Business Setup steps.
 *
 * Business Context:
 * Renders step forms and persists through server actions. Business rules remain
 * in BusinessSetupService.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 */

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CountryOption, CurrencyOption } from "@/core/auth/types";
import { cn } from "@/lib/utils";
import {
  activateBusinessAction,
  completeReviewAction,
  completeWelcomeAction,
  saveAdditionalCurrenciesAction,
  saveAiToggleAction,
  saveBaseCurrencyAction,
  saveBusinessDetailsAction,
  saveCountryAction,
  saveLoyaltyToggleAction,
  savePaymentMethodsAction,
  saveReceiptConfigurationAction,
  skipOptionalStepAction,
} from "@/modules/business/onboarding/actions/setup-actions";
import { SetupProgressIndicator } from "@/modules/business/onboarding/components/setup-progress-indicator";
import {
  OPTIONAL_SETUP_STEPS,
  SETUP_STEP_ORDER,
  SETUP_STEPS,
  type SetupStep,
} from "@/modules/business/onboarding/constants";
import type { SetupProgressView } from "@/modules/business/onboarding/types";

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
);

type SetupWizardProps = {
  step: SetupStep;
  progress: SetupProgressView;
  countries: CountryOption[];
  currencies: CurrencyOption[];
  businessCountryCode: string;
  defaultCurrencyCode: string | null;
  businessName: string;
  profile: {
    tradingName: string;
    logoUrl: string;
    email: string;
    physicalAddress: string;
    county: string;
    city: string;
    website: string | null;
    description: string | null;
    gpsLatitude: string | null;
    gpsLongitude: string | null;
  } | null;
  configuration: {
    cashEnabled: boolean;
    mobileMoneyEnabled: boolean;
    bankTransferEnabled: boolean;
    cardEnabled: boolean;
    creditSalesEnabled: boolean;
    receiptPrefix: string;
    receiptFooter: string;
    showLogoOnReceipt: boolean;
    taxEnabled: boolean;
    defaultTaxRate: string;
    aiAssistantEnabled: boolean;
    loyaltyProgrammeEnabled: boolean;
  } | null;
  operatingCurrencies: Array<{
    currencyCode: string;
    isBase: boolean;
  }>;
  review?: {
    tradingName: string;
    email: string;
    physicalAddress: string;
    county: string;
    city: string;
    countryName: string;
    baseCurrencyCode: string;
    additionalCurrencyCodes: string[];
    paymentMethods: {
      cashEnabled: boolean;
      mobileMoneyEnabled: boolean;
      bankTransferEnabled: boolean;
      cardEnabled: boolean;
      creditSalesEnabled: boolean;
    };
    receipt: {
      receiptPrefix: string;
      receiptFooter: string;
      showLogoOnReceipt: boolean;
      taxEnabled: boolean;
      defaultTaxRate: string;
    };
    aiAssistantEnabled: boolean;
    loyaltyProgrammeEnabled: boolean;
  } | null;
};

function previousStep(step: SetupStep): SetupStep | null {
  const index = SETUP_STEP_ORDER.indexOf(step);
  if (index <= 0) {
    return null;
  }
  return SETUP_STEP_ORDER[index - 1];
}

export function SetupWizard(props: SetupWizardProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState(props.profile?.logoUrl ?? "");
  const [selectedAdditional, setSelectedAdditional] = useState<string[]>(
    props.operatingCurrencies
      .filter((row) => !row.isBase)
      .map((row) => row.currencyCode)
  );

  const baseCurrencyDefault = useMemo(() => {
    const existingBase = props.operatingCurrencies.find((row) => row.isBase);
    return (
      existingBase?.currencyCode ??
      props.defaultCurrencyCode ??
      props.currencies[0]?.code ??
      "KES"
    );
  }, [props.operatingCurrencies, props.defaultCurrencyCode, props.currencies]);

  function goTo(step: SetupStep) {
    router.push(`/setup/${step}`);
    router.refresh();
  }

  function handleResult(
    result: { success: true; data: SetupProgressView } | { success: false; error: { message: string } } | undefined
  ) {
    if (!result) {
      return;
    }

    if (!result.success) {
      setErrorMessage(result.error.message);
      return;
    }

    goTo(result.data.resumeStep === SETUP_STEPS.COMPLETED ? SETUP_STEPS.REVIEW : result.data.resumeStep);
  }

  function onBack() {
    const prior = previousStep(props.step);
    if (prior) {
      goTo(prior);
    }
  }

  function onSkip() {
    if (!OPTIONAL_SETUP_STEPS.includes(props.step)) {
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const result = await skipOptionalStepAction(props.step);
      handleResult(result);
    });
  }

  function readLogoFile(file: File | null) {
    if (!file) {
      return;
    }

    if (file.size > 400_000) {
      setErrorMessage("Logo must be smaller than 400KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">Business setup</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {props.businessName}
        </h1>
        <SetupProgressIndicator
          currentStep={props.step}
          completedSteps={props.progress.completedSteps}
          progressPercent={props.progress.progressPercent}
        />
      </header>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {props.step === SETUP_STEPS.WELCOME ? (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Welcome</h2>
            <p className="text-sm text-muted-foreground">
              Complete a short setup so {props.businessName} can start operating.
              You can pause anytime and resume later. Estimated time: about 10
              minutes.
            </p>
            <Button
              className="w-full"
              disabled={isPending}
              onClick={() => {
                setErrorMessage(null);
                startTransition(async () => {
                  const result = await completeWelcomeAction();
                  handleResult(result);
                });
              }}
            >
              {isPending ? "Starting..." : "Start setup"}
            </Button>
          </div>
        ) : null}

        {props.step === SETUP_STEPS.BUSINESS_DETAILS ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setErrorMessage(null);
              startTransition(async () => {
                const result = await saveBusinessDetailsAction({
                  tradingName: String(formData.get("tradingName") ?? ""),
                  logoUrl,
                  email: String(formData.get("email") ?? ""),
                  physicalAddress: String(formData.get("physicalAddress") ?? ""),
                  county: String(formData.get("county") ?? ""),
                  city: String(formData.get("city") ?? ""),
                  website: String(formData.get("website") ?? ""),
                  description: String(formData.get("description") ?? ""),
                  gpsLatitude: String(formData.get("gpsLatitude") ?? ""),
                  gpsLongitude: String(formData.get("gpsLongitude") ?? ""),
                });
                handleResult(result);
              });
            }}
          >
            <h2 className="text-xl font-medium">Business details</h2>
            <div className="space-y-2">
              <Label htmlFor="tradingName">Trading name</Label>
              <Input
                id="tradingName"
                name="tradingName"
                defaultValue={props.profile?.tradingName ?? ""}
                placeholder={`Same as ${props.businessName} if left blank`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Business logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(event) => readLogoFile(event.target.files?.[0] ?? null)}
              />
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Business logo preview"
                  className="mt-2 h-16 w-16 rounded-md border object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Business email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={props.profile?.email ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="physicalAddress">Physical address</Label>
              <Input
                id="physicalAddress"
                name="physicalAddress"
                required
                defaultValue={props.profile?.physicalAddress ?? ""}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="county">County / State / Province</Label>
                <Input
                  id="county"
                  name="county"
                  required
                  defaultValue={props.profile?.county ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City / Town</Label>
                <Input
                  id="city"
                  name="city"
                  required
                  defaultValue={props.profile?.city ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                name="website"
                defaultValue={props.profile?.website ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Business description (optional)</Label>
              <Input
                id="description"
                name="description"
                defaultValue={props.profile?.description ?? ""}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gpsLatitude">GPS latitude (optional)</Label>
                <Input
                  id="gpsLatitude"
                  name="gpsLatitude"
                  defaultValue={props.profile?.gpsLatitude ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpsLongitude">GPS longitude (optional)</Label>
                <Input
                  id="gpsLongitude"
                  name="gpsLongitude"
                  defaultValue={props.profile?.gpsLongitude ?? ""}
                />
              </div>
            </div>
            <WizardNav
              onBack={onBack}
              isPending={isPending}
              canSkip={false}
            />
          </form>
        ) : null}

        {props.step === SETUP_STEPS.COUNTRY ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setErrorMessage(null);
              startTransition(async () => {
                const result = await saveCountryAction({
                  countryCode: String(formData.get("countryCode") ?? ""),
                });
                handleResult(result);
              });
            }}
          >
            <h2 className="text-xl font-medium">Country</h2>
            <p className="text-sm text-muted-foreground">
              Selected during registration. You may change it before activation.
              Changing country resets currency selections and loads the country
              default currency.
            </p>
            <div className="space-y-2">
              <Label htmlFor="countryCode">Country</Label>
              <select
                id="countryCode"
                name="countryCode"
                required
                defaultValue={props.businessCountryCode}
                className={selectClassName}
              >
                {props.countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <WizardNav onBack={onBack} isPending={isPending} canSkip={false} />
          </form>
        ) : null}

        {props.step === SETUP_STEPS.BASE_CURRENCY ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setErrorMessage(null);
              startTransition(async () => {
                const result = await saveBaseCurrencyAction({
                  currencyCode: String(formData.get("currencyCode") ?? ""),
                });
                handleResult(result);
              });
            }}
          >
            <h2 className="text-xl font-medium">Base currency</h2>
            <p className="text-sm text-muted-foreground">
              Default currency is loaded from the selected country. You may
              change the base currency.
            </p>
            <div className="space-y-2">
              <Label htmlFor="currencyCode">Base currency</Label>
              <select
                id="currencyCode"
                name="currencyCode"
                required
                defaultValue={baseCurrencyDefault}
                className={selectClassName}
              >
                {props.currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name} ({currency.symbol})
                  </option>
                ))}
              </select>
            </div>
            <WizardNav onBack={onBack} isPending={isPending} canSkip={false} />
          </form>
        ) : null}

        {props.step === SETUP_STEPS.ADDITIONAL_CURRENCIES ? (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Additional currencies</h2>
            <p className="text-sm text-muted-foreground">
              Optional. Add operating currencies besides your base currency.
              Duplicates are not allowed.
            </p>
            <div className="space-y-2">
              {props.currencies
                .filter((currency) => currency.code !== baseCurrencyDefault)
                .map((currency) => {
                  const checked = selectedAdditional.includes(currency.code);
                  return (
                    <label
                      key={currency.code}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          setSelectedAdditional((current) => {
                            if (value) {
                              return [...current, currency.code];
                            }
                            return current.filter((code) => code !== currency.code);
                          });
                        }}
                      />
                      <span className="text-sm">
                        {currency.code} — {currency.name}
                      </span>
                    </label>
                  );
                })}
            </div>
            <WizardNav
              onBack={onBack}
              isPending={isPending}
              canSkip
              onSkip={onSkip}
              onContinue={() => {
                setErrorMessage(null);
                startTransition(async () => {
                  const result = await saveAdditionalCurrenciesAction({
                    currencyCodes: selectedAdditional,
                  });
                  handleResult(result);
                });
              }}
            />
          </div>
        ) : null}

        {props.step === SETUP_STEPS.PAYMENT_METHODS ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setErrorMessage(null);
              startTransition(async () => {
                const result = await savePaymentMethodsAction({
                  cashEnabled: formData.get("cashEnabled") === "on",
                  mobileMoneyEnabled: formData.get("mobileMoneyEnabled") === "on",
                  bankTransferEnabled:
                    formData.get("bankTransferEnabled") === "on",
                  cardEnabled: formData.get("cardEnabled") === "on",
                  creditSalesEnabled: formData.get("creditSalesEnabled") === "on",
                });
                handleResult(result);
              });
            }}
          >
            <h2 className="text-xl font-medium">Payment methods</h2>
            {(
              [
                ["cashEnabled", "Cash", props.configuration?.cashEnabled ?? true],
                [
                  "mobileMoneyEnabled",
                  "Mobile Money",
                  props.configuration?.mobileMoneyEnabled ?? true,
                ],
                [
                  "bankTransferEnabled",
                  "Bank Transfer",
                  props.configuration?.bankTransferEnabled ?? false,
                ],
                ["cardEnabled", "Card", props.configuration?.cardEnabled ?? false],
                [
                  "creditSalesEnabled",
                  "Credit Sales",
                  props.configuration?.creditSalesEnabled ?? false,
                ],
              ] as const
            ).map(([name, label, defaultChecked]) => (
              <label key={name} className="flex items-center gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={defaultChecked}
                  className="size-4"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
            <WizardNav onBack={onBack} isPending={isPending} canSkip={false} />
          </form>
        ) : null}

        {props.step === SETUP_STEPS.RECEIPT_CONFIGURATION ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setErrorMessage(null);
              startTransition(async () => {
                const result = await saveReceiptConfigurationAction({
                  receiptPrefix: String(formData.get("receiptPrefix") ?? ""),
                  receiptFooter: String(formData.get("receiptFooter") ?? ""),
                  showLogoOnReceipt: formData.get("showLogoOnReceipt") === "on",
                  taxEnabled: formData.get("taxEnabled") === "on",
                  defaultTaxRate: String(formData.get("defaultTaxRate") ?? "0"),
                });
                handleResult(result);
              });
            }}
          >
            <h2 className="text-xl font-medium">Receipt & tax</h2>
            <div className="space-y-2">
              <Label htmlFor="receiptPrefix">Receipt prefix</Label>
              <Input
                id="receiptPrefix"
                name="receiptPrefix"
                required
                defaultValue={props.configuration?.receiptPrefix ?? "RCPT"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptFooter">Receipt footer</Label>
              <Input
                id="receiptFooter"
                name="receiptFooter"
                defaultValue={props.configuration?.receiptFooter ?? ""}
              />
            </div>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                name="showLogoOnReceipt"
                defaultChecked={props.configuration?.showLogoOnReceipt ?? true}
                className="size-4"
              />
              <span className="text-sm">Show logo on receipt</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                name="taxEnabled"
                defaultChecked={props.configuration?.taxEnabled ?? false}
                className="size-4"
              />
              <span className="text-sm">Enable tax</span>
            </label>
            <div className="space-y-2">
              <Label htmlFor="defaultTaxRate">Default tax rate (%)</Label>
              <Input
                id="defaultTaxRate"
                name="defaultTaxRate"
                defaultValue={String(props.configuration?.defaultTaxRate ?? "0")}
              />
            </div>
            <WizardNav onBack={onBack} isPending={isPending} canSkip={false} />
          </form>
        ) : null}

        {props.step === SETUP_STEPS.AI_TOGGLE ? (
          <FeatureToggleStep
            title="AI Assistant"
            description="Optional. Enable the AI Assistant for this business. You can change this later."
            defaultEnabled={props.configuration?.aiAssistantEnabled ?? false}
            isPending={isPending}
            onBack={onBack}
            onSkip={onSkip}
            onSave={(enabled) => {
              setErrorMessage(null);
              startTransition(async () => {
                const result = await saveAiToggleAction({ enabled });
                handleResult(result);
              });
            }}
          />
        ) : null}

        {props.step === SETUP_STEPS.LOYALTY_TOGGLE ? (
          <FeatureToggleStep
            title="Loyalty Programme"
            description="Optional. Enable Loyalty Programme for this business. You can change this later."
            defaultEnabled={props.configuration?.loyaltyProgrammeEnabled ?? false}
            isPending={isPending}
            onBack={onBack}
            onSkip={onSkip}
            onSave={(enabled) => {
              setErrorMessage(null);
              startTransition(async () => {
                const result = await saveLoyaltyToggleAction({ enabled });
                handleResult(result);
              });
            }}
          />
        ) : null}

        {props.step === SETUP_STEPS.REVIEW ? (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Review & activate</h2>
            {props.review ? (
              <dl className="space-y-2 text-sm">
                <ReviewRow label="Business" value={props.businessName} />
                <ReviewRow label="Trading name" value={props.review.tradingName} />
                <ReviewRow label="Email" value={props.review.email} />
                <ReviewRow
                  label="Address"
                  value={`${props.review.physicalAddress}, ${props.review.city}, ${props.review.county}`}
                />
                <ReviewRow label="Country" value={props.review.countryName} />
                <ReviewRow label="Base currency" value={props.review.baseCurrencyCode} />
                <ReviewRow
                  label="Additional currencies"
                  value={
                    props.review.additionalCurrencyCodes.length > 0
                      ? props.review.additionalCurrencyCodes.join(", ")
                      : "None"
                  }
                />
                <ReviewRow
                  label="Payments"
                  value={[
                    props.review.paymentMethods.cashEnabled ? "Cash" : null,
                    props.review.paymentMethods.mobileMoneyEnabled
                      ? "Mobile Money"
                      : null,
                    props.review.paymentMethods.bankTransferEnabled
                      ? "Bank Transfer"
                      : null,
                    props.review.paymentMethods.cardEnabled ? "Card" : null,
                    props.review.paymentMethods.creditSalesEnabled
                      ? "Credit Sales"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
                <ReviewRow
                  label="Receipt"
                  value={`${props.review.receipt.receiptPrefix} · Logo ${
                    props.review.receipt.showLogoOnReceipt ? "on" : "off"
                  }`}
                />
                <ReviewRow
                  label="Tax"
                  value={
                    props.review.receipt.taxEnabled
                      ? `${props.review.receipt.defaultTaxRate}%`
                      : "Disabled"
                  }
                />
                <ReviewRow
                  label="AI Assistant"
                  value={props.review.aiAssistantEnabled ? "Enabled" : "Disabled"}
                />
                <ReviewRow
                  label="Loyalty"
                  value={
                    props.review.loyaltyProgrammeEnabled ? "Enabled" : "Disabled"
                  }
                />
              </dl>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onBack}
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={isPending}
                onClick={() => {
                  setErrorMessage(null);
                  startTransition(async () => {
                    const reviewResult = await completeReviewAction();
                    if (!reviewResult.success) {
                      setErrorMessage(reviewResult.error.message);
                      return;
                    }
                    const result = await activateBusinessAction();
                    if (result && !result.success) {
                      setErrorMessage(result.error.message);
                    }
                  });
                }}
              >
                {isPending ? "Activating..." : "Activate business"}
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function WizardNav({
  onBack,
  onSkip,
  onContinue,
  isPending,
  canSkip,
}: {
  onBack: () => void;
  onSkip?: () => void;
  onContinue?: () => void;
  isPending: boolean;
  canSkip: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        variant="outline"
        className="flex-1"
        onClick={onBack}
        disabled={isPending}
      >
        Back
      </Button>
      {canSkip ? (
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onSkip}
          disabled={isPending}
        >
          Skip for now
        </Button>
      ) : null}
      {onContinue ? (
        <Button
          type="button"
          className="flex-1"
          onClick={onContinue}
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Continue"}
        </Button>
      ) : (
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Saving..." : "Save & continue"}
        </Button>
      )}
    </div>
  );
}

function FeatureToggleStep({
  title,
  description,
  defaultEnabled,
  isPending,
  onBack,
  onSkip,
  onSave,
}: {
  title: string;
  description: string;
  defaultEnabled: boolean;
  isPending: boolean;
  onBack: () => void;
  onSkip: () => void;
  onSave: (enabled: boolean) => void;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <label className="flex items-center gap-3 rounded-lg border p-3">
        <Checkbox
          checked={enabled}
          onCheckedChange={(value) => setEnabled(Boolean(value))}
        />
        <span className="text-sm">Enable {title}</span>
      </label>
      <WizardNav
        onBack={onBack}
        isPending={isPending}
        canSkip
        onSkip={onSkip}
        onContinue={() => onSave(enabled)}
      />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
