import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";

type UnknownRecord = Record<string, unknown>;

export interface DeliveryAddressDetail {
  key: string;
  label: string;
  value: string;
}

export interface DeliveryAddressPresentation {
  summary: string;
  details: DeliveryAddressDetail[];
  notes: string;
  mapUrl: string | null;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return null;
}

function numericValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRawDelivery(item: UnifiedQueueItem): UnknownRecord {
  const raw = asRecord(item.rawData) ?? {};
  const rawFulfillment = asRecord(raw.fulfillment);

  return (
    asRecord(rawFulfillment?.delivery) ??
    asRecord(raw.delivery) ??
    asRecord(raw.deliveryDetails) ??
    {}
  );
}

function getAddressRecord(item: UnifiedQueueItem): UnknownRecord {
  const raw = asRecord(item.rawData) ?? {};
  const rawDelivery = getRawDelivery(item);

  return (
    asRecord(item.delivery?.address) ??
    asRecord(rawDelivery.address) ??
    asRecord(raw.deliveryAddress) ??
    {}
  );
}

function buildMapUrl(address: UnknownRecord, query: string): string | null {
  const location = asRecord(address.location);
  const coordinates = Array.isArray(location?.coordinates)
    ? location.coordinates
    : Array.isArray(address.coordinates)
      ? address.coordinates
      : null;

  const coordinatesLng = coordinates?.length ? numericValue(coordinates[0]) : null;
  const coordinatesLat = coordinates?.length ? numericValue(coordinates[1]) : null;
  const lat =
    numericValue(address.lat ?? address.latitude) ??
    numericValue(location?.lat ?? location?.latitude) ??
    coordinatesLat;
  const lng =
    numericValue(address.lng ?? address.longitude) ??
    numericValue(location?.lng ?? location?.longitude) ??
    coordinatesLng;

  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

export function getDeliveryAddressPresentation(
  item: UnifiedQueueItem
): DeliveryAddressPresentation {
  const address = getAddressRecord(item);
  const rawDelivery = getRawDelivery(item);
  const seenValues = new Set<string>();

  const detailCandidates: Array<{
    key: string;
    label: string;
    values: unknown[];
  }> = [
    {
      key: "city",
      label: "المدينة",
      values: [address.city, address.cityName],
    },
    {
      key: "district",
      label: "الحي",
      values: [address.district, address.neighborhood, address.area],
    },
    {
      key: "street",
      label: "الشارع",
      values: [address.street, address.streetName],
    },
    {
      key: "building",
      label: "رقم المبنى",
      values: [address.building, address.buildingNumber, address.buildingNo],
    },
    {
      key: "floor",
      label: "الدور",
      values: [address.floor, address.floorNumber],
    },
    {
      key: "apartment",
      label: "الشقة / الوحدة",
      values: [
        address.apartment,
        address.apartmentNumber,
        address.unit,
        address.unitNumber,
      ],
    },
    {
      key: "postalCode",
      label: "الرمز البريدي",
      values: [address.postalCode, address.zipCode],
    },
    {
      key: "additionalNumber",
      label: "الرقم الإضافي",
      values: [address.additionalNumber, address.additionalNo],
    },
    {
      key: "shortAddress",
      label: "العنوان المختصر",
      values: [address.shortAddress, address.nationalAddress],
    },
    {
      key: "landmark",
      label: "علامة مميزة",
      values: [address.landmark, address.nearestLandmark],
    },
  ];

  const details = detailCandidates.flatMap((candidate) => {
    const value = firstText(...candidate.values);
    if (!value) return [];

    const normalized = value.toLocaleLowerCase("ar");
    if (seenValues.has(normalized)) return [];
    seenValues.add(normalized);

    return [{ key: candidate.key, label: candidate.label, value }];
  });

  const fallbackSummary = details
    .map((detail) => `${detail.label}: ${detail.value}`)
    .join("، ");
  const summary =
    firstText(
      item.context.addressSummary,
      item.delivery?.addressSummary,
      rawDelivery.addressSummary,
      address.formattedAddress,
      address.addressSummary,
      address.label,
      fallbackSummary
    ) ?? "لا يوجد عنوان مسجل";
  const notes =
    firstText(
      item.context.addressNotes,
      address.notes,
      address.addressNotes,
      address.deliveryInstructions,
      rawDelivery.addressNotes
    ) ?? "";

  return {
    summary,
    details,
    notes,
    mapUrl: buildMapUrl(address, summary === "لا يوجد عنوان مسجل" ? "" : summary),
  };
}
