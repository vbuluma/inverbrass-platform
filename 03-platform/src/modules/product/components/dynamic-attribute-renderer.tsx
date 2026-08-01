/**
 * Purpose:
 * Dynamic Attribute Renderer — metadata-driven form fields for product attributes.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ATTRIBUTE_DATA_TYPES } from "@/modules/product/constants";
import type { ProductAttributeFieldView } from "@/modules/product/types";

type DynamicAttributeRendererProps = {
  fields: ProductAttributeFieldView[];
  values: Record<string, unknown>;
  disabled?: boolean;
  onChange: (code: string, value: unknown) => void;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return value.join(",");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function FieldControl({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ProductAttributeFieldView;
  value: unknown;
  disabled?: boolean;
  onChange: (value: unknown) => void;
}) {
  const { definition, options } = field;
  const isDisabled = disabled || definition.isReadOnly;
  const activeOptions = options.filter((option) => option.status === "ACTIVE");

  switch (definition.dataType) {
    case ATTRIBUTE_DATA_TYPES.BOOLEAN:
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 rounded border border-input"
        />
      );
    case ATTRIBUTE_DATA_TYPES.LONG_TEXT:
      return (
        <textarea
          className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          value={formatValue(value)}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case ATTRIBUTE_DATA_TYPES.SELECT:
    case ATTRIBUTE_DATA_TYPES.RADIO:
      return (
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          value={formatValue(value)}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select…</option>
          {activeOptions.map((option) => (
            <option key={option.id} value={option.optionCode}>
              {option.optionLabel}
            </option>
          ))}
        </select>
      );
    case ATTRIBUTE_DATA_TYPES.MULTI_SELECT:
    case ATTRIBUTE_DATA_TYPES.CHECKBOX:
      return (
        <div className="space-y-2">
          {activeOptions.map((option) => {
            const selected = Array.isArray(value)
              ? value.includes(option.optionCode)
              : formatValue(value).split(",").includes(option.optionCode);
            return (
              <label key={option.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={isDisabled}
                  onChange={(event) => {
                    const current = Array.isArray(value)
                      ? [...value]
                      : formatValue(value)
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean);
                    if (event.target.checked) {
                      onChange([...new Set([...current, option.optionCode])]);
                    } else {
                      onChange(current.filter((item) => item !== option.optionCode));
                    }
                  }}
                  className="size-4 rounded border border-input"
                />
                {option.optionLabel}
              </label>
            );
          })}
        </div>
      );
    case ATTRIBUTE_DATA_TYPES.DATE:
      return (
        <Input
          type="date"
          value={formatValue(value)}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case ATTRIBUTE_DATA_TYPES.DATETIME:
      return (
        <Input
          type="datetime-local"
          value={formatValue(value)}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case ATTRIBUTE_DATA_TYPES.INTEGER:
      return (
        <Input
          type="number"
          step="1"
          value={formatValue(value)}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case ATTRIBUTE_DATA_TYPES.DECIMAL:
    case ATTRIBUTE_DATA_TYPES.CURRENCY:
    case ATTRIBUTE_DATA_TYPES.PERCENTAGE:
      return (
        <Input
          type="number"
          step="any"
          value={formatValue(value)}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case ATTRIBUTE_DATA_TYPES.JSON:
      return (
        <textarea
          className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm disabled:opacity-50"
          value={formatValue(value)}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    default:
      return (
        <Input
          type="text"
          value={formatValue(value)}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}

export function DynamicAttributeRenderer({
  fields,
  values,
  disabled,
  onChange,
}: DynamicAttributeRendererProps) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.definition.id} className="space-y-2">
          <Label htmlFor={`attr-${field.definition.code}`}>
            {field.definition.name}
            {field.definition.isMandatory ? (
              <span className="text-destructive"> *</span>
            ) : null}
          </Label>
          {field.definition.description ? (
            <p className="text-xs text-muted-foreground">
              {field.definition.description}
            </p>
          ) : null}
          <FieldControl
            field={field}
            value={values[field.definition.code] ?? field.value}
            disabled={disabled}
            onChange={(nextValue) => onChange(field.definition.code, nextValue)}
          />
          <p className="text-xs text-muted-foreground">
            {field.definition.dataTypeLabel}
            {field.definition.isReadOnly ? " · Read-only" : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
