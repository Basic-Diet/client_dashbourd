import type {
  DeliverySelectionType,
  DeliverySlotOption,
} from "@/types/deliveryTypes";

export const subscriptionFulfillmentSetValueOptions = {
  shouldValidate: true,
  shouldDirty: true,
  shouldTouch: true,
} as const;

export interface PickupFulfillmentResetValues {
  type: "pickup";
  zoneId: string;
  pickupLocationId: string;
  slot: {
    type: "pickup";
    window: string;
    slotId: string;
  };
}

export interface DeliveryFulfillmentResetValues {
  type: "delivery";
  pickupLocationId: string;
  slot: {
    type: "delivery";
    window: string;
    slotId: string;
  };
}

export function getSubscriptionFulfillmentResetValues(
  methodType: "pickup",
  pickupLocationId?: string
): PickupFulfillmentResetValues;
export function getSubscriptionFulfillmentResetValues(
  methodType: "delivery",
  pickupLocationId?: string
): DeliveryFulfillmentResetValues;
export function getSubscriptionFulfillmentResetValues(
  methodType: DeliverySelectionType,
  pickupLocationId = ""
): PickupFulfillmentResetValues | DeliveryFulfillmentResetValues {
  if (methodType === "pickup") {
    return {
      type: "pickup" as const,
      zoneId: "",
      pickupLocationId,
      slot: {
        type: "pickup" as const,
        window: "",
        slotId: "",
      },
    };
  }

  return {
    type: "delivery" as const,
    pickupLocationId: "",
    slot: {
      type: "delivery" as const,
      window: "",
      slotId: "",
    },
  };
}

export function getDeliverySlotSelectionValues(slot: DeliverySlotOption) {
  return {
    type: "delivery" as const,
    window: slot.window,
    slotId: slot.id,
  };
}
