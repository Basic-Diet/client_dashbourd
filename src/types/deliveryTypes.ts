export interface DeliverySlotOption {
  id: string;
  type: string;
  window: string;
  label: string;
}

export interface DeliveryMethod {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  pricingMode?: string;
  feeHalala: number;
  feeSar: number;
  feeLabel: string;
  helperText: string;
  areaSelectionRequired?: boolean;
  requiresAddress?: boolean;
  slots: DeliverySlotOption[];
}

export interface DeliveryArea {
  id: string;
  zoneId: string;
  name: string;
  label: string;
  feeHalala: number;
  feeSar: number;
  feeLabel: string;
  isActive: boolean;
  availability: string;
  availabilityLabel: string;
}

export interface PickupLocationAddress {
  line1: string;
  line2: string;
  city: string;
  district: string;
  street: string;
  building: string;
  apartment: string;
  notes: string;
}

export interface PickupLocation {
  id: string;
  name: string;
  label: string;
  address: PickupLocationAddress;
  slots: DeliverySlotOption[];
}

export interface DeliveryDefaults {
  type: string;
  slotId: string;
  window: string;
  zoneId: string;
  areaId: string;
  pickupLocationId: string;
}

export interface DeliveryOptionsData {
  methods: DeliveryMethod[];
  areas: DeliveryArea[];
  pickupLocations: PickupLocation[];
  defaults: DeliveryDefaults;
}

export interface DeliveryOptionsResponse {
  status: boolean;
  data: DeliveryOptionsData;
}
