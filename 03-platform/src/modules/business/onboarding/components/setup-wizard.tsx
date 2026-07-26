/**
 * Purpose:
 * Client wizard for BP-001 / IP-006 Business Setup steps.
 *
 * Business Context:
 * Renders step forms and persists through server actions. Business rules remain
 * in BusinessSetupService.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * BP-001 – Business Onboarding Enhancement & Stabilization
 */

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { CatalogEmptyNotice } from "@/components/auth/catalog-empty-notice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATALOG_EMPTY_MESSAGES } from "@/core/auth/catalog-messages";
import type {
  BusinessTypeOption,
  CountryOption,
  CurrencyOption,
  IndustryOption,
} from "@/core/auth/types";
import { cn } from "@/lib/utils";
import {
  activateBusinessAction,
  completeReviewAction,
  completeWelcomeAction,
  saveAdditionalCurrenciesAction,
  saveBaseCurrencyAction,
  saveBranchSetupAction,
  saveBusinessClassificationAction,
  saveBusinessDetailsAction,
  saveBusinessOperationsAction,
  saveCountryAction,
  saveEmployeeSetupAction,
  skipOptionalStepAction,
} from "@/modules/business/onboarding/actions/setup-actions";
import { SetupProgressIndicator } from "@/modules/business/onboarding/components/setup-progress-indicator";
import {
  EMPLOYEE_SETUP_ROLE_CODES,
  OPTIONAL_SETUP_STEPS,
  SETUP_STEP_ORDER,
  SETUP_STEPS,
  formatSetupWelcomeMessage,
  type SetupStep,
} from "@/modules/business/onboarding/constants";
import {
  BRANCH_TYPES,
  BRANCH_TYPE_OPTIONS,
} from "@/modules/business/onboarding/constants/branch-types";
import { buildBranchCodeCandidate } from "@/modules/business/onboarding/services/setup-rules";
import type {
  BranchSetupItemPayload,
  CreatedEmployeeCredential,
  EmployeeSetupItemPayload,
  SetupProgressView,
} from "@/modules/business/onboarding/types";

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
);

type SetupWizardProps = {
  step: SetupStep;
  progress: SetupProgressView;
  countries: CountryOption[];
  currencies: CurrencyOption[];
  industries: IndustryOption[];
  businessTypes: BusinessTypeOption[];
  businessCountryCode: string;
  defaultCurrencyCode: string | null;
  allowBaseCurrencyChange: boolean;
  businessName: string;
  classification: {
    industryId: string;
    businessTypeId: string;
  } | null;
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
  branches: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  review?: {
    tradingName: string;
    industryName: string;
    businessTypeName: string;
    email: string;
    physicalAddress: string;
    county: string;
    city: string;
    countryName: string;
    baseCurrencyCode: string;
    additionalCurrencyCodes: string[];
    branches: Array<{
      name: string;
      code: string;
      branchType: string;
      city: string;
      isHeadOffice: boolean;
    }>;
    employees: Array<{
      fullName: string;
      jobTitle: string;
      branchName: string;
      roleName: string;
    }>;
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

function emptyBranchDraft(seed?: Partial<BranchSetupItemPayload>): BranchSetupItemPayload {
  const name = seed?.name ?? "";
  return {
    name,
    code: seed?.code ?? (name ? buildBranchCodeCandidate(name) : ""),
    branchType: seed?.branchType ?? BRANCH_TYPES.OUTLET,
    physicalAddress: seed?.physicalAddress ?? "",
    county: seed?.county ?? "",
    city: seed?.city ?? "",
    contactPhone: seed?.contactPhone ?? "",
    email: seed?.email ?? "",
    gpsLatitude: seed?.gpsLatitude ?? "",
    gpsLongitude: seed?.gpsLongitude ?? "",
    openingDate: seed?.openingDate ?? "",
    isHeadOffice: seed?.isHeadOffice ?? false,
    isDefault: seed?.isDefault ?? false,
  };
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
  const [industryId, setIndustryId] = useState(
    props.classification?.industryId ?? ""
  );
  const [businessTypeId, setBusinessTypeId] = useState(
    props.classification?.businessTypeId ?? ""
  );
  const [hasMultipleBranches, setHasMultipleBranches] = useState(false);
  const [branchDrafts, setBranchDrafts] = useState<BranchSetupItemPayload[]>([
    emptyBranchDraft({
      name: "Head Office",
      code: buildBranchCodeCandidate("Head Office"),
      branchType: BRANCH_TYPES.HEAD_OFFICE,
      physicalAddress: props.profile?.physicalAddress ?? "",
      county: props.profile?.county ?? "",
      city: props.profile?.city ?? "",
      isHeadOffice: true,
      isDefault: true,
    }),
  ]);
  const [addEmployees, setAddEmployees] = useState(false);
  const [employeeDrafts, setEmployeeDrafts] = useState<EmployeeSetupItemPayload[]>([
    {
      firstName: "",
      lastName: "",
      mobileNumber: "",
      email: "",
      branchId: props.branches[0]?.id ?? "",
      jobTitle: "",
      platformRoleCode: "EMPLOYEE",
    },
  ]);
  const [issuedCredentials, setIssuedCredentials] = useState<
    CreatedEmployeeCredential[]
  >([]);
  const [postEmployeeResumeStep, setPostEmployeeResumeStep] =
    useState<SetupStep | null>(null);

  const baseCurrencyDefault = useMemo(() => {
    const existingBase = props.operatingCurrencies.find((row) => row.isBase);
    return (
      existingBase?.currencyCode ??
      props.defaultCurrencyCode ??
      props.currencies[0]?.code ??
      "KES"
    );
  }, [props.operatingCurrencies, props.defaultCurrencyCode, props.currencies]);

  const filteredBusinessTypes = useMemo(() => {
    if (!industryId) {
      return [];
    }

    return props.businessTypes.filter(
      (item) => item.industryId === industryId
    );
  }, [industryId, props.businessTypes]);

  function goTo(step: SetupStep) {
    router.push(`/setup/${step}`);
    router.refresh();
  }

  function handleResult(
    result:
      | { success: true; data: SetupProgressView }
      | { success: false; error: { message: string } }
      | undefined
  ) {
    if (!result) {
      return;
    }

    if (!result.success) {
      setErrorMessage(result.error.message);
      return;
    }

    goTo(
      result.data.resumeStep === SETUP_STEPS.COMPLETED
        ? SETUP_STEPS.REVIEW
        : result.data.resumeStep
    );
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
              {formatSetupWelcomeMessage(props.businessName)}
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

        {props.step === SETUP_STEPS.BUSINESS_PROFILE ||
        props.step === SETUP_STEPS.BUSINESS_DETAILS ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setErrorMessage(null);
              startTransition(async () => {
                const result = await saveBusinessDetailsAction({
                  businessName: String(formData.get("businessName") ?? ""),
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
            <h2 className="text-xl font-medium">Business profile</h2>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                name="businessName"
                required
                defaultValue={props.businessName}
              />
            </div>
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
                onChange={(event) =>
                  readLogoFile(event.target.files?.[0] ?? null)
                }
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
              <Label htmlFor="description">Description (optional)</Label>
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
            <WizardNav onBack={onBack} isPending={isPending} canSkip={false} />
          </form>
        ) : null}

        {props.step === SETUP_STEPS.BUSINESS_CLASSIFICATION ? (
          <form
            className="space-y-4"
            action={() => {
              setErrorMessage(null);
              startTransition(async () => {
                const result = await saveBusinessClassificationAction({
                  industryId,
                  businessTypeId,
                });
                handleResult(result);
              });
            }}
          >
            <h2 className="text-xl font-medium">Business classification</h2>
            <p className="text-sm text-muted-foreground">
              Select an industry, then a business type. The business template is
              applied automatically from the selected business type.
            </p>
            {props.industries.length === 0 ? (
              <CatalogEmptyNotice message={CATALOG_EMPTY_MESSAGES.industries} />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="industryId">Industry</Label>
              <select
                id="industryId"
                required
                value={industryId}
                className={selectClassName}
                disabled={props.industries.length === 0}
                onChange={(event) => {
                  setIndustryId(event.target.value);
                  setBusinessTypeId("");
                }}
              >
                <option value="">Select industry</option>
                {props.industries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessTypeId">Business type</Label>
              <select
                id="businessTypeId"
                required
                value={businessTypeId}
                className={selectClassName}
                disabled={!industryId || filteredBusinessTypes.length === 0}
                onChange={(event) => setBusinessTypeId(event.target.value)}
              >
                <option value="">Select business type</option>
                {filteredBusinessTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            {businessTypeId ? (
              <p className="text-sm text-muted-foreground">
                Business template:{" "}
                <span className="font-medium text-foreground">
                  {filteredBusinessTypes.find(
                    (item) => item.id === businessTypeId
                  )?.name ?? "Selected type"}
                </span>
              </p>
            ) : null}
            <WizardNav
              onBack={onBack}
              isPending={isPending}
              canSkip={false}
              disableContinue={
                !industryId || !businessTypeId || props.industries.length === 0
              }
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
            <h2 className="text-xl font-medium">Operating country</h2>
            <p className="text-sm text-muted-foreground">
              Auto-populated from Platform Registration / Create Business. Change
              only if required. Changing country resets currency selections.
            </p>
            {props.countries.length === 0 ? (
              <CatalogEmptyNotice message={CATALOG_EMPTY_MESSAGES.countries} />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="countryCode">Country</Label>
              <select
                id="countryCode"
                name="countryCode"
                required
                defaultValue={props.businessCountryCode}
                className={selectClassName}
                disabled={props.countries.length === 0}
              >
                {props.countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <WizardNav
              onBack={onBack}
              isPending={isPending}
              canSkip={false}
              disableContinue={props.countries.length === 0}
            />
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
              Derived from the operating country
              {props.defaultCurrencyCode
                ? ` (${props.defaultCurrencyCode})`
                : ""}
              .
              {props.allowBaseCurrencyChange
                ? " You may change it if needed."
                : " Change is disabled by platform configuration."}
            </p>
            {props.currencies.length === 0 ? (
              <CatalogEmptyNotice message={CATALOG_EMPTY_MESSAGES.currencies} />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="currencyCode">Base currency</Label>
              <select
                id="currencyCode"
                name="currencyCode"
                required
                defaultValue={baseCurrencyDefault}
                className={selectClassName}
                disabled={
                  props.currencies.length === 0 ||
                  !props.allowBaseCurrencyChange
                }
              >
                {props.currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name} ({currency.symbol})
                  </option>
                ))}
              </select>
            </div>
            <WizardNav
              onBack={onBack}
              isPending={isPending}
              canSkip={false}
              disableContinue={props.currencies.length === 0}
            />
          </form>
        ) : null}

        {props.step === SETUP_STEPS.ADDITIONAL_CURRENCIES ? (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Additional currencies</h2>
            <p className="text-sm text-muted-foreground">
              Optional. Select zero or more currencies besides your base
              currency.
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
                            return current.filter(
                              (code) => code !== currency.code
                            );
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

        {props.step === SETUP_STEPS.BUSINESS_OPERATIONS ? (
          <form
            className="space-y-6"
            action={(formData) => {
              setErrorMessage(null);
              startTransition(async () => {
                const result = await saveBusinessOperationsAction({
                  paymentMethods: {
                    cashEnabled: formData.get("cashEnabled") === "on",
                    mobileMoneyEnabled:
                      formData.get("mobileMoneyEnabled") === "on",
                    bankTransferEnabled:
                      formData.get("bankTransferEnabled") === "on",
                    cardEnabled: formData.get("cardEnabled") === "on",
                    creditSalesEnabled:
                      formData.get("creditSalesEnabled") === "on",
                  },
                  receipt: {
                    receiptPrefix: String(formData.get("receiptPrefix") ?? ""),
                    receiptFooter: String(formData.get("receiptFooter") ?? ""),
                    showLogoOnReceipt:
                      formData.get("showLogoOnReceipt") === "on",
                    taxEnabled: formData.get("taxEnabled") === "on",
                    defaultTaxRate: String(
                      formData.get("defaultTaxRate") ?? "0"
                    ),
                  },
                  aiAssistantEnabled: formData.get("aiAssistantEnabled") === "on",
                  loyaltyProgrammeEnabled:
                    formData.get("loyaltyProgrammeEnabled") === "on",
                });
                handleResult(result);
              });
            }}
          >
            <h2 className="text-xl font-medium">Business operations</h2>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Payment methods</h3>
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
                  [
                    "cardEnabled",
                    "Card",
                    props.configuration?.cardEnabled ?? false,
                  ],
                  [
                    "creditSalesEnabled",
                    "Credit Sales",
                    props.configuration?.creditSalesEnabled ?? false,
                  ],
                ] as const
              ).map(([name, label, defaultChecked]) => (
                <label
                  key={name}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <input
                    type="checkbox"
                    name={name}
                    defaultChecked={defaultChecked}
                    className="size-4"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Receipt configuration</h3>
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
                  defaultChecked={
                    props.configuration?.showLogoOnReceipt ?? true
                  }
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
                  defaultValue={String(
                    props.configuration?.defaultTaxRate ?? "0"
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">AI assistant</h3>
              <label className="flex items-center gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  name="aiAssistantEnabled"
                  defaultChecked={
                    props.configuration?.aiAssistantEnabled ?? false
                  }
                  className="size-4"
                />
                <span className="text-sm">Enable AI Assistant</span>
              </label>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Loyalty programme</h3>
              <label className="flex items-center gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  name="loyaltyProgrammeEnabled"
                  defaultChecked={
                    props.configuration?.loyaltyProgrammeEnabled ?? false
                  }
                  className="size-4"
                />
                <span className="text-sm">Enable Loyalty Programme</span>
              </label>
            </div>

            <WizardNav onBack={onBack} isPending={isPending} canSkip={false} />
          </form>
        ) : null}

        {props.step === SETUP_STEPS.BRANCH_SETUP ? (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Branch setup</h2>
            <p className="text-sm text-muted-foreground">
              Do you have multiple branches?
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={hasMultipleBranches ? "outline" : "default"}
                onClick={() => setHasMultipleBranches(false)}
              >
                No
              </Button>
              <Button
                type="button"
                variant={hasMultipleBranches ? "default" : "outline"}
                onClick={() => setHasMultipleBranches(true)}
              >
                Yes
              </Button>
            </div>

            {!hasMultipleBranches ? (
              <p className="text-sm text-muted-foreground">
                A default <span className="font-medium">Head Office</span>{" "}
                branch will be created automatically from your business profile.
              </p>
            ) : (
              <div className="space-y-4">
                {branchDrafts.map((draft, index) => (
                  <div
                    key={`branch-${index}`}
                    className="space-y-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Branch {index + 1}</p>
                      {branchDrafts.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setBranchDrafts((rows) =>
                              rows.filter((_, rowIndex) => rowIndex !== index)
                            )
                          }
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Branch name</Label>
                        <Input
                          value={draft.name}
                          onChange={(event) => {
                            const name = event.target.value;
                            setBranchDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      name,
                                      code:
                                        row.code ||
                                        buildBranchCodeCandidate(name),
                                    }
                                  : row
                              )
                            );
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Branch code</Label>
                        <Input
                          value={draft.code}
                          onChange={(event) =>
                            setBranchDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, code: event.target.value }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Branch type</Label>
                      <select
                        className={selectClassName}
                        value={draft.branchType}
                        onChange={(event) =>
                          setBranchDrafts((rows) =>
                            rows.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, branchType: event.target.value }
                                : row
                            )
                          )
                        }
                      >
                        {BRANCH_TYPE_OPTIONS.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Physical address</Label>
                      <Input
                        value={draft.physicalAddress}
                        onChange={(event) =>
                          setBranchDrafts((rows) =>
                            rows.map((row, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...row,
                                    physicalAddress: event.target.value,
                                  }
                                : row
                            )
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>County</Label>
                        <Input
                          value={draft.county}
                          onChange={(event) =>
                            setBranchDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, county: event.target.value }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={draft.city}
                          onChange={(event) =>
                            setBranchDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, city: event.target.value }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Contact phone</Label>
                      <Input
                        value={draft.contactPhone}
                        onChange={(event) =>
                          setBranchDrafts((rows) =>
                            rows.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, contactPhone: event.target.value }
                                : row
                            )
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch email (optional)</Label>
                      <Input
                        value={draft.email ?? ""}
                        onChange={(event) =>
                          setBranchDrafts((rows) =>
                            rows.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, email: event.target.value }
                                : row
                            )
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>GPS latitude (optional)</Label>
                        <Input
                          value={draft.gpsLatitude ?? ""}
                          onChange={(event) =>
                            setBranchDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      gpsLatitude: event.target.value,
                                    }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GPS longitude (optional)</Label>
                        <Input
                          value={draft.gpsLongitude ?? ""}
                          onChange={(event) =>
                            setBranchDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      gpsLongitude: event.target.value,
                                    }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Opening date (optional)</Label>
                        <Input
                          type="date"
                          value={draft.openingDate ?? ""}
                          onChange={(event) =>
                            setBranchDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      openingDate: event.target.value,
                                    }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setBranchDrafts((rows) => [...rows, emptyBranchDraft()])
                  }
                >
                  Add branch
                </Button>
              </div>
            )}

            <WizardNav
              onBack={onBack}
              isPending={isPending}
              canSkip={false}
              onContinue={() => {
                setErrorMessage(null);
                startTransition(async () => {
                  const result = await saveBranchSetupAction({
                    hasMultipleBranches,
                    branches: hasMultipleBranches ? branchDrafts : [],
                  });
                  handleResult(result);
                });
              }}
            />
          </div>
        ) : null}

        {props.step === SETUP_STEPS.EMPLOYEE_SETUP ? (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Employee setup</h2>
            <p className="text-sm text-muted-foreground">
              Would you like to add employees now?
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={addEmployees ? "outline" : "default"}
                onClick={() => {
                  setAddEmployees(false);
                  setIssuedCredentials([]);
                }}
              >
                Skip
              </Button>
              <Button
                type="button"
                variant={addEmployees ? "default" : "outline"}
                onClick={() => setAddEmployees(true)}
              >
                Add employees
              </Button>
            </div>

            {addEmployees ? (
              <div className="space-y-4">
                {employeeDrafts.map((draft, index) => (
                  <div
                    key={`employee-${index}`}
                    className="space-y-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Employee {index + 1}</p>
                      {employeeDrafts.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEmployeeDrafts((rows) =>
                              rows.filter((_, rowIndex) => rowIndex !== index)
                            )
                          }
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>First name</Label>
                        <Input
                          value={draft.firstName}
                          onChange={(event) =>
                            setEmployeeDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, firstName: event.target.value }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last name</Label>
                        <Input
                          value={draft.lastName}
                          onChange={(event) =>
                            setEmployeeDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, lastName: event.target.value }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Mobile number</Label>
                        <Input
                          value={draft.mobileNumber}
                          onChange={(event) =>
                            setEmployeeDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      mobileNumber: event.target.value,
                                    }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email (optional)</Label>
                        <Input
                          value={draft.email ?? ""}
                          onChange={(event) =>
                            setEmployeeDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, email: event.target.value }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <select
                          className={selectClassName}
                          value={draft.branchId}
                          onChange={(event) =>
                            setEmployeeDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, branchId: event.target.value }
                                  : row
                              )
                            )
                          }
                        >
                          <option value="">Select branch</option>
                          {props.branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Job title</Label>
                        <Input
                          value={draft.jobTitle}
                          onChange={(event) =>
                            setEmployeeDrafts((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, jobTitle: event.target.value }
                                  : row
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Platform role</Label>
                      <select
                        className={selectClassName}
                        value={draft.platformRoleCode}
                        onChange={(event) =>
                          setEmployeeDrafts((rows) =>
                            rows.map((row, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...row,
                                    platformRoleCode: event.target
                                      .value as EmployeeSetupItemPayload["platformRoleCode"],
                                  }
                                : row
                            )
                          )
                        }
                      >
                        {EMPLOYEE_SETUP_ROLE_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setEmployeeDrafts((rows) => [
                      ...rows,
                      {
                        firstName: "",
                        lastName: "",
                        mobileNumber: "",
                        email: "",
                        branchId: props.branches[0]?.id ?? "",
                        jobTitle: "",
                        platformRoleCode: "EMPLOYEE",
                      },
                    ])
                  }
                >
                  Add another employee
                </Button>
              </div>
            ) : null}

            {issuedCredentials.length > 0 ? (
              <Alert>
                <AlertDescription>
                  <p className="mb-2 font-medium">
                    Temporary passwords (shown once — copy them now):
                  </p>
                  <ul className="space-y-2 text-sm">
                    {issuedCredentials.map((credential) => (
                      <li key={credential.employeeId}>
                        {credential.fullName} ({credential.mobileNumber}):{" "}
                        <code className="rounded bg-muted px-1 py-0.5">
                          {credential.temporaryPassword}
                        </code>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            <WizardNav
              onBack={onBack}
              isPending={isPending}
              canSkip={!addEmployees}
              onSkip={
                !addEmployees
                  ? () => {
                      setErrorMessage(null);
                      startTransition(async () => {
                        const result = await saveEmployeeSetupAction({
                          skip: true,
                          employees: [],
                        });
                        if (!result.success) {
                          setErrorMessage(result.error.message);
                          return;
                        }
                        handleResult({
                          success: true,
                          data: result.data.progress,
                        });
                      });
                    }
                  : undefined
              }
              onContinue={() => {
                setErrorMessage(null);
                startTransition(async () => {
                  const result = await saveEmployeeSetupAction({
                    skip: !addEmployees,
                    employees: addEmployees ? employeeDrafts : [],
                  });
                  if (!result.success) {
                    setErrorMessage(result.error.message);
                    return;
                  }

                  if (result.data.credentials.length > 0) {
                    setIssuedCredentials(result.data.credentials);
                    setPostEmployeeResumeStep(result.data.progress.resumeStep);
                    return;
                  }

                  handleResult({
                    success: true,
                    data: result.data.progress,
                  });
                });
              }}
            />

            {issuedCredentials.length > 0 ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  goTo(postEmployeeResumeStep ?? SETUP_STEPS.REVIEW);
                }}
              >
                Continue to review
              </Button>
            ) : null}
          </div>
        ) : null}

        {props.step === SETUP_STEPS.REVIEW ? (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Review & activate</h2>
            {props.review ? (
              <dl className="space-y-2 text-sm">
                <ReviewRow label="Business" value={props.businessName} />
                <ReviewRow label="Industry" value={props.review.industryName} />
                <ReviewRow
                  label="Business type"
                  value={props.review.businessTypeName}
                />
                <ReviewRow label="Country" value={props.review.countryName} />
                <ReviewRow
                  label="Base currency"
                  value={props.review.baseCurrencyCode}
                />
                <ReviewRow
                  label="Additional currencies"
                  value={
                    props.review.additionalCurrencyCodes.length > 0
                      ? props.review.additionalCurrencyCodes.join(", ")
                      : "None"
                  }
                />
                <ReviewRow
                  label="Branches"
                  value={
                    props.review.branches.length > 0
                      ? props.review.branches
                          .map(
                            (branch) =>
                              `${branch.name}${branch.isHeadOffice ? " (HO)" : ""}`
                          )
                          .join(", ")
                      : "None"
                  }
                />
                <ReviewRow
                  label="Employees"
                  value={
                    props.review.employees.length > 0
                      ? props.review.employees
                          .map(
                            (employee) =>
                              `${employee.fullName} · ${employee.roleName}`
                          )
                          .join(", ")
                      : "None"
                  }
                />
                <ReviewRow
                  label="Payment methods"
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
                  label="Receipt configuration"
                  value={`${props.review.receipt.receiptPrefix} · Logo ${
                    props.review.receipt.showLogoOnReceipt ? "on" : "off"
                  }`}
                />
                <ReviewRow
                  label="AI"
                  value={
                    props.review.aiAssistantEnabled ? "Enabled" : "Disabled"
                  }
                />
                <ReviewRow
                  label="Loyalty"
                  value={
                    props.review.loyaltyProgrammeEnabled
                      ? "Enabled"
                      : "Disabled"
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
  disableContinue = false,
}: {
  onBack: () => void;
  onSkip?: () => void;
  onContinue?: () => void;
  isPending: boolean;
  canSkip: boolean;
  disableContinue?: boolean;
}) {
  const continueDisabled = isPending || disableContinue;

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
          disabled={continueDisabled}
        >
          {isPending ? "Saving..." : "Continue"}
        </Button>
      ) : (
        <Button type="submit" className="flex-1" disabled={continueDisabled}>
          {isPending ? "Saving..." : "Save & continue"}
        </Button>
      )}
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
