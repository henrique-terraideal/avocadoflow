import React from "react";
import { Input } from "@/components/ui/input";

/**
 * Renderiza os campos customizados de um template.
 * values: { [field_label]: string }
 * onChange: (newValues) => void
 */
export default function CustomFieldsInput({ fields, values, onChange }) {
  if (!fields || fields.length === 0) return null;

  const handleChange = (label, value) => {
    onChange({ ...values, [label]: value });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">Detalhes da Atividade</p>
      {fields.map((field) => (
        <div key={field.id}>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {field.field_label}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </label>
          {field.field_type === "textarea" ? (
            <textarea
              value={values[field.field_label] || ""}
              onChange={(e) => handleChange(field.field_label, e.target.value)}
              placeholder={field.field_label}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          ) : (
            <Input
              type={field.field_type === "number" ? "number" : "text"}
              value={values[field.field_label] || ""}
              onChange={(e) => handleChange(field.field_label, e.target.value)}
              placeholder={field.field_label}
              className="h-11 rounded-xl"
            />
          )}
        </div>
      ))}
    </div>
  );
}