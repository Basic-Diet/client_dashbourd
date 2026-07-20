from pathlib import Path

path = Path("src/components/pages/menu/meal-builder/MealPlannerCardDialogV2.tsx")
content = path.read_text(encoding="utf-8")

content = content.replace(
    'import { useMemo, useState } from "react";',
    'import { useId, useMemo, useState } from "react";',
    1,
)

content = content.replace(
    '''} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={type}
        value={value}''',
    '''} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  const id = useId();
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}''',
    1,
)

content = content.replace(
    '''  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <Select value={value || undefined} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="w-full">''',
    '''  onChange: (value: string) => void;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  return (
    <div className="space-y-2">
      <FieldLabel id={labelId}>{label}</FieldLabel>
      <Select value={value || undefined} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-labelledby={labelId}>''',
    1,
)

content = content.replace(
    '''function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}''',
    '''function FieldLabel({
  children,
  htmlFor,
  id,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  id?: string;
}) {
  return (
    <label id={id} htmlFor={htmlFor} className="text-sm font-medium">
      {children}
    </label>
  );
}''',
    1,
)

content = content.replace(
    '''  function changeType(cardType: "direct_product" | "option_family") {
    if (editing || cardType === value.cardType) return;
    setValue((current) => ({
      ...current,
      cardType,
      selectedIds: [],
      optionRole: "protein",
      familyKey: "",
      productContextId: "",
      sourceGroupId: "",
      maxSelections: 1,
      multiSelect: false,
    }));
  }''',
    '''  function changeType(cardType: "direct_product" | "option_family") {
    if (editing || cardType === value.cardType) return;
    const defaultRole = optionRoles[0] || "protein";
    setValue((current) => ({
      ...current,
      cardType,
      selectedIds: [],
      optionRole: defaultRole,
      familyKey: "",
      productContextId: "",
      sourceGroupId: "",
      maxSelections: defaultRole === "carbs" ? 2 : 1,
      multiSelect: defaultRole === "carbs",
    }));
  }''',
    1,
)

required = [
    'import { useId, useMemo, useState } from "react";',
    '<FieldLabel htmlFor={id}>{label}</FieldLabel>',
    'aria-labelledby={labelId}',
    'htmlFor?: string;',
    'const defaultRole = optionRoles[0] || "protein";',
]
missing = [marker for marker in required if marker not in content]
if missing:
    raise RuntimeError(f"form hardening markers missing after patch: {missing}")

path.write_text(content, encoding="utf-8")
