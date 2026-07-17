import { safeText } from "@/lib/operationsBoard";
import type {
  KitchenAddonGroup,
  KitchenAddonItem,
  KitchenCard,
  KitchenSection,
  KitchenSectionItem,
  KitchenV2,
  UnifiedQueueItem,
} from "@/types/dashboardOpsTypes";

export const UNSUPPORTED_KITCHEN_MESSAGE =
  "تعذر عرض تفاصيل التحضير: إصدار بيانات المطبخ غير مدعوم";

export function formatOperationsSar(value: number | null | undefined): string {
  if (!value || value <= 0) return "";
  return `${(value / 100).toFixed(2)} ر.س`;
}

function text(value: unknown, fallback = "") {
  return safeText(value, fallback);
}

function countItems(sections: KitchenSection[] = []) {
  return sections.reduce((sum, section) => sum + (section.items?.length ?? 0), 0);
}

function paidSectionItems(sections: KitchenSection[] = []) {
  return sections.flatMap((section) =>
    (section.items ?? [])
      .filter((item) => (item.payableTotalHalala ?? 0) > 0)
      .map((item) => ({
        sectionLabel: text(section.label ?? section.title, "قسم"),
        name: text(item.name, "مكون"),
        amount: item.payableTotalHalala ?? 0,
        grams: item.grams ?? null,
      }))
  );
}

function paidAddonItems(groups: KitchenAddonGroup[] = []) {
  return groups.flatMap((group) =>
    (group.items ?? [])
      .filter((item) => (item.payableTotalHalala ?? 0) > 0)
      .map((item) => ({
        groupLabel: text(group.label ?? group.title, "إضافات"),
        name: text(item.name, "إضافة"),
        amount: item.payableTotalHalala ?? 0,
      }))
  );
}

export function isKitchenV2(kitchen: unknown): kitchen is KitchenV2 {
  return Boolean(
    kitchen &&
      typeof kitchen === "object" &&
      (kitchen as KitchenV2).version === "v2" &&
      Array.isArray((kitchen as KitchenV2).cards) &&
      Array.isArray((kitchen as KitchenV2).addonGroups)
  );
}

export function getKitchenV2(item: UnifiedQueueItem): KitchenV2 | null {
  return isKitchenV2(item.kitchen) ? item.kitchen : null;
}

export interface PresentedKitchenSectionItem {
  name: string;
  quantity: number | null;
  grams: number | null;
  paidAmountHalala: number;
  paidLabel: string;
}

export interface PresentedKitchenSection {
  label: string;
  items: PresentedKitchenSectionItem[];
}

export interface PresentedKitchenCard {
  key: string;
  type: string;
  title: string;
  badge: string | null;
  quantity: number;
  lines: string[];
  notes: string | null;
  warnings: string[];
  sectionCount: number;
  itemCount: number;
  paidExtras: Array<{
    sectionLabel: string;
    name: string;
    amount: number;
    label: string;
    grams: number | null;
  }>;
  sections: PresentedKitchenSection[];
  componentLines: string[];
}

export interface PresentedKitchenAddonGroup {
  key: string;
  label: string;
  items: Array<{
    name: string;
    quantity: number;
    paidAmountHalala: number;
    paidLabel: string;
  }>;
}

export interface PresentedKitchenV2 {
  supported: boolean;
  unsupportedMessage?: string;
  mealCount: number;
  cardCount: number;
  addonGroupCount: number;
  addonItemCount: number;
  warningMessages: string[];
  cards: PresentedKitchenCard[];
  addonGroups: PresentedKitchenAddonGroup[];
  paidAddonItems: Array<{
    groupLabel: string;
    name: string;
    amount: number;
    label: string;
  }>;
  isEmptyKitchenDay: boolean;
  searchText: string;
}

function sectionItem(item: KitchenSectionItem): PresentedKitchenSectionItem {
  const paidAmountHalala = item.payableTotalHalala ?? 0;
  return {
    name: text(item.name, "مكون"),
    quantity: item.quantity ?? null,
    grams: item.grams ?? null,
    paidAmountHalala,
    paidLabel: paidAmountHalala > 0 ? formatOperationsSar(paidAmountHalala) : "",
  };
}

function section(section: KitchenSection): PresentedKitchenSection {
  return {
    label: text(section.label ?? section.title, "قسم"),
    items: (section.items ?? []).map(sectionItem),
  };
}

function componentLines(card: KitchenCard): string[] {
  const components = card.components ?? {};
  const lines: string[] = [];
  const protein = components.protein;
  const product = components.product;
  const carbs = Array.isArray(components.carbs)
    ? components.carbs
    : components.carbs
      ? [components.carbs]
      : [];

  if (protein) {
    const grams = protein.grams ? ` - ${protein.grams} جم` : "";
    lines.push(`بروتين: ${text(protein.name ?? protein.label, "بروتين")}${grams}`);
  }
  if (carbs.length) {
    lines.push(
      `كارب: ${carbs.map((carb) => text(carb.name ?? carb.label, "كارب")).join("، ")}`
    );
  }
  if (product) {
    lines.push(`الصنف: ${text(product.name ?? product.label, "صنف")}`);
  }
  return lines;
}

function card(card: KitchenCard, index: number): PresentedKitchenCard {
  const sections = (card.sections ?? []).map(section);
  const paidExtras = paidSectionItems(card.sections ?? []).map((item) => ({
    ...item,
    label: formatOperationsSar(item.amount),
  }));
  const warnings = (card.warnings ?? [])
    .map((warning) => text(warning, ""))
    .filter(Boolean);

  return {
    key: card.id ?? `${card.type}-${index}`,
    type: card.type,
    title: text(card.title, `بطاقة ${index + 1}`),
    badge: text(card.badge, "") || null,
    quantity: card.quantity ?? 1,
    lines: (card.lines ?? []).map((line) => text(line, "")).filter(Boolean),
    notes: text(card.notes, "") || null,
    warnings,
    sectionCount: sections.length,
    itemCount: countItems(card.sections ?? []),
    paidExtras,
    sections,
    componentLines: componentLines(card),
  };
}

function addonGroup(group: KitchenAddonGroup, index: number): PresentedKitchenAddonGroup {
  return {
    key: `${text(group.label ?? group.title, "addons")}-${index}`,
    label: text(group.label ?? group.title, "إضافات"),
    items: (group.items ?? []).map((item: KitchenAddonItem) => {
      const paidAmountHalala = item.payableTotalHalala ?? 0;
      return {
        name: text(item.name, "إضافة"),
        quantity: item.quantity ?? 1,
        paidAmountHalala,
        paidLabel: paidAmountHalala > 0 ? formatOperationsSar(paidAmountHalala) : "",
      };
    }),
  };
}

export function buildKitchenV2Presentation(item: UnifiedQueueItem): PresentedKitchenV2 {
  const kitchen = getKitchenV2(item);
  if (!kitchen) {
    return {
      supported: false,
      unsupportedMessage: UNSUPPORTED_KITCHEN_MESSAGE,
      mealCount: 0,
      cardCount: 0,
      addonGroupCount: 0,
      addonItemCount: 0,
      warningMessages: [],
      cards: [],
      addonGroups: [],
      paidAddonItems: [],
      isEmptyKitchenDay: false,
      searchText: "",
    };
  }

  const cards = kitchen.cards.map(card);
  const addonGroups = kitchen.addonGroups.map(addonGroup);
  const warningMessages = kitchen.warnings
    .map((warning) => text(warning, ""))
    .filter(Boolean);
  const paidAddons = paidAddonItems(kitchen.addonGroups).map((item) => ({
    ...item,
    label: formatOperationsSar(item.amount),
  }));
  const addonItemCount = addonGroups.reduce(
    (sum, group) => sum + group.items.reduce((inner, item) => inner + item.quantity, 0),
    0
  );
  const searchText = [
    ...cards.flatMap((entry) => [
      entry.title,
      entry.badge,
      ...entry.lines,
      ...entry.componentLines,
      ...entry.sections.flatMap((section) => [
        section.label,
        ...section.items.map((item) => item.name),
      ]),
      ...entry.warnings,
    ]),
    ...addonGroups.flatMap((group) => [
      group.label,
      ...group.items.map((item) => item.name),
    ]),
    ...warningMessages,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    supported: true,
    mealCount: kitchen.mealCount,
    cardCount: cards.length,
    addonGroupCount: addonGroups.length,
    addonItemCount,
    warningMessages,
    cards,
    addonGroups,
    paidAddonItems: paidAddons,
    isEmptyKitchenDay:
      kitchen.mealCount === 0 &&
      kitchen.cards.length === 0 &&
      kitchen.addonGroups.length === 0,
    searchText,
  };
}
