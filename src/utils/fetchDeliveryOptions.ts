import api from "@/lib/apis";
import type {
  DeliveryArea,
  DeliveryOptionsResponse,
  DeliverySlotOption,
  PickupLocation,
} from "@/types/deliveryTypes";
import type { DashboardSettingsResponse, PickupLocationSetting } from "@/types/settingsTypes";

type ApiRecord = Record<string, unknown>;

type ZoneRow = {
  _id?: unknown;
  id?: unknown;
  name?: unknown;
  deliveryFeeHalala?: unknown;
  feeHalala?: unknown;
  isActive?: unknown;
};

type ZonesResponse = {
  data?: unknown;
};

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const readNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readLocalized = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (!isRecord(value)) return "";
  return (
    readString(value.ar) ||
    readString(value.en) ||
    readString(value.name) ||
    readString(value.label)
  );
};

const formatFee = (feeHalala: number) => {
  if (!feeHalala) return "مجاني";
  const feeSar = feeHalala / 100;
  return `${Number.isInteger(feeSar) ? feeSar : feeSar.toFixed(2)} ريال`;
};

const normalizeSlots = (
  windows: unknown,
  type: "delivery" | "pickup"
): DeliverySlotOption[] => {
  const source = Array.isArray(windows) ? windows : [];
  return source
    .map((window) => readString(window))
    .filter(Boolean)
    .map((window, index) => ({
      id: `${type}-${window || index}`,
      type,
      window,
      label: window,
    }));
};

const normalizeZones = (value: unknown): DeliveryArea[] => {
  const rows = Array.isArray(value) ? (value as ZoneRow[]) : [];

  return rows
    .map((zone) => {
      const zoneId = readString(zone._id) || readString(zone.id);
      const name = readLocalized(zone.name) || zoneId;
      const feeHalala = readNumber(zone.deliveryFeeHalala ?? zone.feeHalala);
      const isActive = zone.isActive !== false;

      return {
        id: zoneId,
        zoneId,
        name,
        label: feeHalala ? `${name} - ${formatFee(feeHalala)}` : name,
        feeHalala,
        feeSar: feeHalala / 100,
        feeLabel: formatFee(feeHalala),
        isActive,
        availability: isActive ? "available" : "inactive",
        availabilityLabel: isActive ? "متاح" : "غير نشط",
      };
    })
    .filter((area) => area.zoneId && area.isActive);
};

const normalizePickupAddress = (branch: PickupLocationSetting) => {
  const addressAr = branch.address?.ar || "";
  const addressEn = branch.address?.en || "";
  const line1 = addressAr || addressEn;

  return {
    line1,
    line2: addressEn && addressEn !== line1 ? addressEn : "",
    city: "",
    district: "",
    street: "",
    building: "",
    apartment: "",
    notes: "",
  };
};

const normalizePickupLocations = (
  value: unknown,
  slots: DeliverySlotOption[]
): PickupLocation[] => {
  const rows = Array.isArray(value) ? (value as PickupLocationSetting[]) : [];

  return rows
    .filter((branch) => branch && branch.isActive !== false)
    .map((branch, index) => {
      const id = branch.id || `pickup-${index + 1}`;
      const name = branch.name?.ar || branch.name?.en || id;
      return {
        id,
        name,
        label: name,
        address: normalizePickupAddress(branch),
        slots,
      };
    });
};

export const fetchDeliveryOptions = async (): Promise<DeliveryOptionsResponse> => {
  const [zonesResponse, settingsResponse] = await Promise.all([
    api.get<ZonesResponse>("/api/dashboard/zones", {
      params: { isActive: true },
    }),
    api.get<DashboardSettingsResponse>("/api/dashboard/settings"),
  ]);

  const settings = (settingsResponse.data?.data || {}) as Record<string, unknown>;
  const deliveryWindows = settings.delivery_windows;
  const deliverySlots = normalizeSlots(deliveryWindows, "delivery");
  const pickupSlots = normalizeSlots(deliveryWindows, "pickup");
  const areas = normalizeZones(zonesResponse.data?.data);
  const pickupLocations = normalizePickupLocations(
    settings.pickup_locations,
    pickupSlots
  );

  return {
    status: true,
    data: {
      methods: [
        {
          id: "delivery",
          type: "delivery",
          title: "توصيل",
          subtitle: "توصيل الطلب إلى عنوان العميل",
          feeHalala: areas[0]?.feeHalala || 0,
          feeSar: areas[0]?.feeSar || 0,
          feeLabel: areas[0]?.feeLabel || "حسب المنطقة",
          helperText: "اختر منطقة التوصيل وأدخل العنوان",
          areaSelectionRequired: true,
          requiresAddress: true,
          slots: deliverySlots,
        },
        {
          id: "pickup",
          type: "pickup",
          title: "استلام من الفرع",
          subtitle: "العميل يستلم الطلب من الفرع",
          feeHalala: 0,
          feeSar: 0,
          feeLabel: "مجاني",
          helperText: "سيتم تجهيز الطلب للاستلام من الفرع",
          areaSelectionRequired: false,
          requiresAddress: false,
          slots: pickupSlots,
        },
      ],
      areas,
      pickupLocations,
      defaults: {
        type: "delivery",
        slotId: deliverySlots[0]?.id || "",
        window: deliverySlots[0]?.window || "",
        zoneId: areas[0]?.zoneId || "",
        areaId: areas[0]?.id || "",
        pickupLocationId: pickupLocations[0]?.id || "",
      },
    },
  };
};
