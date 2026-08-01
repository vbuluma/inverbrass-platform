/**
 * Purpose:
 * Product Workspace Pricing panel — active, future, expired prices and history.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

"use client";

import { CopyIcon, PlusIcon, ScaleIcon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  PlatformEmptyState,
  PlatformProcessingButton,
  PlatformSearchState,
  usePanelFeedback,
} from "@/components/platform";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activatePricingItemAction,
  archivePricingItemAction,
  comparePricingItemsAction,
  copyPricingItemAction,
  createPricingItemAction,
  expirePricingItemAction,
  getProductPricingPanelAction,
  updatePricingItemAction,
} from "@/modules/product/actions/pricing-actions";
import { PRICING_UI_LABELS } from "@/modules/product/pricing-ui-labels";
import type { PricingItemView, ProductPricingPanelView } from "@/modules/product/types";
import { useControlledForm } from "@/lib/forms";
import { dateFieldValue, textFieldValue } from "@/lib/forms/form-field-values";

type ProductPricingPanelProps = {
  productId: string;
  initialData: ProductPricingPanelView;
  disabled?: boolean;
};

type PriceFormValues = {
  pricingCatalogueId: string;
  currencyCode: string;
  unitPrice: string;
  minimumPrice: string;
  maximumPrice: string;
  pricingMethod: string;
  customerSegment: string;
  salesChannel: string;
  region: string;
  effectiveFrom: string;
  effectiveTo: string;
};

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatAmount(value: string, currency: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return `${value} ${currency}`;
  }
  return `${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })} ${currency}`;
}

function emptyPriceForm(data: ProductPricingPanelView): PriceFormValues {
  const defaultCatalogue = data.catalogues[0];
  const defaultCurrency =
    defaultCatalogue?.currencyCode ?? data.currencies[0]?.code ?? "";
  const defaultMethod = data.pricingMethods[0]?.code ?? "FIXED";

  return {
    pricingCatalogueId: textFieldValue(defaultCatalogue?.id),
    currencyCode: textFieldValue(defaultCurrency),
    unitPrice: "",
    minimumPrice: "",
    maximumPrice: "",
    pricingMethod: defaultMethod,
    customerSegment: "",
    salesChannel: "",
    region: "",
    effectiveFrom: dateFieldValue(new Date().toISOString()),
    effectiveTo: "",
  };
}

function priceFormFromItem(item: PricingItemView): PriceFormValues {
  return {
    pricingCatalogueId: item.pricingCatalogueId,
    currencyCode: item.currencyCode,
    unitPrice: item.unitPrice,
    minimumPrice: textFieldValue(item.minimumPrice),
    maximumPrice: textFieldValue(item.maximumPrice),
    pricingMethod: item.pricingMethod,
    customerSegment: textFieldValue(item.customerSegment),
    salesChannel: textFieldValue(item.salesChannel),
    region: textFieldValue(item.region),
    effectiveFrom: dateFieldValue(item.effectiveFrom),
    effectiveTo: dateFieldValue(item.effectiveTo),
  };
}

function PriceTable({
  items,
  disabled,
  onEdit,
  onActivate,
  onExpire,
  onCopy,
  onArchive,
  selectedCompareIds,
  onToggleCompare,
}: {
  items: PricingItemView[];
  disabled?: boolean;
  onEdit: (item: PricingItemView) => void;
  onActivate: (itemId: string) => void;
  onExpire: (itemId: string) => void;
  onCopy: (itemId: string) => void;
  onArchive: (itemId: string) => void;
  selectedCompareIds: string[];
  onToggleCompare: (itemId: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-2 py-2">Catalogue</th>
            <th className="px-2 py-2">Price</th>
            <th className="px-2 py-2">Method</th>
            <th className="px-2 py-2">Segment</th>
            <th className="px-2 py-2">Channel</th>
            <th className="px-2 py-2">Region</th>
            <th className="px-2 py-2">Effective</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b align-top">
              <td className="px-2 py-3">
                <div className="font-medium">{item.catalogueName}</div>
                <div className="text-xs text-muted-foreground">{item.catalogueCode}</div>
              </td>
              <td className="px-2 py-3">{formatAmount(item.unitPrice, item.currencyCode)}</td>
              <td className="px-2 py-3">{item.pricingMethodLabel}</td>
              <td className="px-2 py-3">{item.customerSegment ?? "—"}</td>
              <td className="px-2 py-3">{item.salesChannel ?? "—"}</td>
              <td className="px-2 py-3">{item.region ?? "—"}</td>
              <td className="px-2 py-3">
                {formatDate(item.effectiveFrom)}
                {item.effectiveTo ? (
                  <>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      to {formatDate(item.effectiveTo)}
                    </span>
                  </>
                ) : null}
              </td>
              <td className="px-2 py-3">{item.statusLabel}</td>
              <td className="px-2 py-3">
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled || !item.isEditable}
                    onClick={() => onEdit(item)}
                  >
                    {PRICING_UI_LABELS.edit}
                  </Button>
                  {item.status === "DRAFT" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => onActivate(item.id)}
                    >
                      {PRICING_UI_LABELS.activate}
                    </Button>
                  ) : null}
                  {item.status === "ACTIVE" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => onExpire(item.id)}
                    >
                      {PRICING_UI_LABELS.expire}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => onCopy(item.id)}
                  >
                    <CopyIcon className="mr-1 size-3.5" aria-hidden />
                    {PRICING_UI_LABELS.copy}
                  </Button>
                  {item.status !== "ARCHIVED" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => onArchive(item.id)}
                    >
                      {PRICING_UI_LABELS.archive}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedCompareIds.includes(item.id) ? "default" : "ghost"}
                    disabled={disabled}
                    onClick={() => onToggleCompare(item.id)}
                  >
                    {PRICING_UI_LABELS.compare}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductPricingPanel({
  productId,
  initialData,
  disabled = false,
}: ProductPricingPanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<PricingItemView[] | null>(null);
  const [comparePending, setComparePending] = useState(false);
  const {
    isPending,
    runPanelAction,
    setValidationError,
    requestConfirm,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<ProductPricingPanelView>();

  const initialFormValues = useMemo(
    () =>
      mode === "edit" && editingItemId
        ? priceFormFromItem(
            [
              ...panel.activePrices,
              ...panel.futurePrices,
              ...panel.expiredPrices,
              ...panel.priceHistory,
            ].find((item) => item.id === editingItemId) ?? panel.activePrices[0]
          )
        : emptyPriceForm(panel),
    [mode, editingItemId, panel]
  );

  const priceForm = useControlledForm<PriceFormValues>({
    initial: initialFormValues,
  });

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
  }

  function refreshPanel() {
    return getProductPricingPanelAction(productId);
  }

  function applySuccess(data: ProductPricingPanelView) {
    setPanel(data);
    setMode("list");
    setEditingItemId(null);
  }

  function runPricingMutation(
    action: () => ReturnType<typeof createPricingItemAction>,
    successTitle: string,
    successMessage: string
  ) {
    runPanelAction(
      async () => {
        const mutationResult = await action();
        if (!mutationResult.success) {
          return mutationResult;
        }
        return refreshPanel();
      },
      {
        successTitle,
        successMessage,
        onSuccess: applySuccess,
      }
    );
  }

  function onToggleCompare(itemId: string) {
    setCompareIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : current.length >= 6
          ? current
          : [...current, itemId]
    );
  }

  function onCompare() {
    if (compareIds.length < 2) {
      setValidationError("Select at least two prices to compare.");
      return;
    }

    setComparePending(true);
    void comparePricingItemsAction({ itemIds: compareIds })
      .then((result) => {
        if (!result.success) {
          setValidationError(result.error.message);
          return;
        }
        setComparison(result.data.items);
      })
      .finally(() => setComparePending(false));
  }

  function onSubmitPrice(event: React.FormEvent) {
    event.preventDefault();
    const values = priceForm.values;

    if (!values.pricingCatalogueId) {
      setValidationError("Select a pricing catalogue.");
      return;
    }

    const payload = {
      pricingCatalogueId: values.pricingCatalogueId,
      currencyCode: values.currencyCode,
      unitPrice: Number(values.unitPrice),
      minimumPrice: values.minimumPrice ? Number(values.minimumPrice) : null,
      maximumPrice: values.maximumPrice ? Number(values.maximumPrice) : null,
      pricingMethod: values.pricingMethod,
      customerSegment: values.customerSegment || undefined,
      salesChannel: values.salesChannel || undefined,
      region: values.region || undefined,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo || null,
    };

    if (mode === "edit" && editingItemId) {
      runPricingMutation(
        () => updatePricingItemAction(editingItemId, payload),
        "Price updated.",
        "The price record was saved."
      );
      return;
    }

    runPricingMutation(
      () =>
        createPricingItemAction({
          offeringId: productId,
          ...payload,
        }),
      "Price created.",
      "A new price record was added for this offering."
    );
  }

  function onActivate(itemId: string) {
    requestConfirm({
      title: PRICING_UI_LABELS.activateConfirm,
      description: "This price will become active for its dimension combination.",
      confirmLabel: PRICING_UI_LABELS.activate,
      onConfirm: () => {
        runPricingMutation(
          () => activatePricingItemAction(itemId),
          "Price activated.",
          "The price is now active."
        );
      },
    });
  }

  function onExpire(itemId: string) {
    requestConfirm({
      title: PRICING_UI_LABELS.expireConfirm,
      description: "Expired prices become read-only.",
      confirmLabel: PRICING_UI_LABELS.expire,
      onConfirm: () => {
        runPricingMutation(
          () => expirePricingItemAction(itemId),
          "Price expired.",
          "The price is now expired."
        );
      },
    });
  }

  function onArchive(itemId: string) {
    requestConfirm({
      title: PRICING_UI_LABELS.archiveConfirm,
      description: "Archived prices remain in history but cannot be reactivated.",
      confirmLabel: PRICING_UI_LABELS.archive,
      onConfirm: () => {
        runPricingMutation(
          () => archivePricingItemAction(itemId),
          "Price archived.",
          "The price was archived."
        );
      },
    });
  }

  function onCopy(itemId: string) {
    runPricingMutation(
      () => copyPricingItemAction(itemId),
      "Price copied.",
      "A draft copy of the price was created."
    );
  }

  const tableProps = {
    disabled,
    onEdit: (item: PricingItemView) => {
      setEditingItemId(item.id);
      setMode("edit");
    },
    onActivate,
    onExpire,
    onCopy,
    onArchive,
    selectedCompareIds: compareIds,
    onToggleCompare,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {PRICING_UI_LABELS.panelTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {PRICING_UI_LABELS.panelDescription}
        </p>
        <p className="text-xs text-muted-foreground">
          {PRICING_UI_LABELS.commercialRulesHint}
        </p>
      </div>

      <FormFeedback />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={disabled || mode !== "list"}
          onClick={() => {
            priceForm.reset(emptyPriceForm(panel));
            setMode("add");
            setEditingItemId(null);
          }}
        >
          <PlusIcon className="mr-1 size-4" aria-hidden />
          {PRICING_UI_LABELS.quickActionAddPrice}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || compareIds.length < 2 || comparePending}
          onClick={onCompare}
        >
          <ScaleIcon className="mr-1 size-4" aria-hidden />
          {PRICING_UI_LABELS.quickActionCompare}
        </Button>
      </div>

      {mode === "add" || mode === "edit" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "edit"
                ? PRICING_UI_LABELS.editPriceTitle
                : PRICING_UI_LABELS.addPriceTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmitPrice}>
              <div className="space-y-2">
                <Label htmlFor="pricingCatalogueId">{PRICING_UI_LABELS.catalogue}</Label>
                <select
                  id="pricingCatalogueId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={priceForm.values.pricingCatalogueId}
                  onChange={(event) =>
                    priceForm.setField("pricingCatalogueId", event.target.value)
                  }
                  disabled={disabled}
                >
                  <option value="">Select catalogue</option>
                  {panel.catalogues.map((catalogue) => (
                    <option key={catalogue.id} value={catalogue.id}>
                      {catalogue.name} ({catalogue.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currencyCode">{PRICING_UI_LABELS.currency}</Label>
                <select
                  id="currencyCode"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={priceForm.values.currencyCode}
                  onChange={(event) =>
                    priceForm.setField("currencyCode", event.target.value)
                  }
                  disabled={disabled}
                >
                  {panel.currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} — {currency.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">{PRICING_UI_LABELS.unitPrice}</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.000001"
                  value={priceForm.values.unitPrice}
                  onChange={(event) =>
                    priceForm.setField("unitPrice", event.target.value)
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricingMethod">{PRICING_UI_LABELS.pricingMethod}</Label>
                <select
                  id="pricingMethod"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={priceForm.values.pricingMethod}
                  onChange={(event) =>
                    priceForm.setField("pricingMethod", event.target.value)
                  }
                  disabled={disabled}
                >
                  {panel.pricingMethods.map((method) => (
                    <option key={method.code} value={method.code}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumPrice">{PRICING_UI_LABELS.minimumPrice}</Label>
                <Input
                  id="minimumPrice"
                  type="number"
                  min="0"
                  step="0.000001"
                  value={priceForm.values.minimumPrice}
                  onChange={(event) =>
                    priceForm.setField("minimumPrice", event.target.value)
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maximumPrice">{PRICING_UI_LABELS.maximumPrice}</Label>
                <Input
                  id="maximumPrice"
                  type="number"
                  min="0"
                  step="0.000001"
                  value={priceForm.values.maximumPrice}
                  onChange={(event) =>
                    priceForm.setField("maximumPrice", event.target.value)
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerSegment">{PRICING_UI_LABELS.customerSegment}</Label>
                <Input
                  id="customerSegment"
                  value={priceForm.values.customerSegment}
                  onChange={(event) =>
                    priceForm.setField("customerSegment", event.target.value)
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salesChannel">{PRICING_UI_LABELS.salesChannel}</Label>
                <Input
                  id="salesChannel"
                  value={priceForm.values.salesChannel}
                  onChange={(event) =>
                    priceForm.setField("salesChannel", event.target.value)
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">{PRICING_UI_LABELS.region}</Label>
                <Input
                  id="region"
                  value={priceForm.values.region}
                  onChange={(event) =>
                    priceForm.setField("region", event.target.value)
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">{PRICING_UI_LABELS.effectiveFrom}</Label>
                <Input
                  id="effectiveFrom"
                  type="datetime-local"
                  value={priceForm.values.effectiveFrom.slice(0, 16)}
                  onChange={(event) =>
                    priceForm.setField(
                      "effectiveFrom",
                      new Date(event.target.value).toISOString()
                    )
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveTo">{PRICING_UI_LABELS.effectiveTo}</Label>
                <Input
                  id="effectiveTo"
                  type="datetime-local"
                  value={
                    priceForm.values.effectiveTo
                      ? priceForm.values.effectiveTo.slice(0, 16)
                      : ""
                  }
                  onChange={(event) =>
                    priceForm.setField(
                      "effectiveTo",
                      event.target.value
                        ? new Date(event.target.value).toISOString()
                        : ""
                    )
                  }
                  disabled={disabled}
                />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <PlatformProcessingButton
                  type="submit"
                  isProcessing={isPending}
                  processingLabel="Saving…"
                  idleLabel={PRICING_UI_LABELS.savePrice}
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setMode("list");
                    setEditingItemId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {comparison ? (
        <Card>
          <CardHeader>
            <CardTitle>{PRICING_UI_LABELS.compareTitle}</CardTitle>
            <CardDescription>
              Comparing {comparison.length} price records across dimensions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PriceTable items={comparison} {...tableProps} />
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => setComparison(null)}
            >
              Close Comparison
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{PRICING_UI_LABELS.sectionActive}</CardTitle>
          <CardDescription>{panel.counts.active} active</CardDescription>
        </CardHeader>
        <CardContent>
          {panel.activePrices.length === 0 ? (
            <PlatformEmptyState
              title={PRICING_UI_LABELS.noActivePrices}
              description="Add a price to define how this offering is sold."
            />
          ) : (
            <PriceTable items={panel.activePrices} {...tableProps} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{PRICING_UI_LABELS.sectionFuture}</CardTitle>
          <CardDescription>{panel.counts.future} scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          {panel.futurePrices.length === 0 ? (
            <PlatformSearchState status="empty" emptyTitle={PRICING_UI_LABELS.noFuturePrices} />
          ) : (
            <PriceTable items={panel.futurePrices} {...tableProps} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{PRICING_UI_LABELS.sectionExpired}</CardTitle>
          <CardDescription>{panel.counts.expired} expired</CardDescription>
        </CardHeader>
        <CardContent>
          {panel.expiredPrices.length === 0 ? (
            <PlatformSearchState status="empty" emptyTitle={PRICING_UI_LABELS.noExpiredPrices} />
          ) : (
            <PriceTable items={panel.expiredPrices} {...tableProps} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{PRICING_UI_LABELS.sectionHistory}</CardTitle>
          <CardDescription>{panel.counts.total} total records</CardDescription>
        </CardHeader>
        <CardContent>
          {panel.priceHistory.length === 0 ? (
            <PlatformEmptyState
              title={PRICING_UI_LABELS.noHistory}
              description="Price changes will appear here as they are recorded."
            />
          ) : (
            <PriceTable items={panel.priceHistory} {...tableProps} />
          )}
        </CardContent>
      </Card>

      <ConfirmDialogHost />
    </div>
  );
}
