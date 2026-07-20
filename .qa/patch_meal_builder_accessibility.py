from pathlib import Path

path = Path("src/components/pages/menu/meal-builder/MealPlannerCardDialogV2.tsx")
content = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str) -> None:
    global content
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"expected one match, found {count}: {old[:160]!r}")
    content = content.replace(old, new, 1)


replace_once(
    '''import { useMemo, useState } from "react";''',
    '''import { useId, useMemo, useState } from "react";''',
)
replace_once(
    '''}) {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={type}
        value={value}''',
    '''}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}''',
)
replace_once(
    '''}) {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <Select value={value || undefined} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="w-full">''',
    '''}) {
  const id = useId();
  const labelId = `${id}-label`;
  return (
    <div className="space-y-2">
      <FieldLabel id={labelId}>{label}</FieldLabel>
      <Select value={value || undefined} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-labelledby={labelId}>''',
)
replace_once(
    '''}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-background p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}''',
    '''}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-background p-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p
          id={descriptionId}
          className="mt-1 text-xs leading-5 text-muted-foreground"
        >
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        aria-describedby={descriptionId}
        onCheckedChange={onChange}
      />
    </div>
  );
}

function FieldLabel({
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
)

path.write_text(content, encoding="utf-8")
