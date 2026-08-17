import assert from "node:assert/strict";
import { test } from "vitest";
import { getDeliveryAddressPresentation } from "../src/lib/deliveryAddress";
import type { UnifiedQueueItem } from "../src/types/dashboardOpsTypes";

function makeDeliveryItem(): UnifiedQueueItem {
  return {
    id: "delivery-address-fixture",
    entityId: "delivery-address-fixture",
    entityType: "subscription_day",
    source: "subscription",
    type: "subscription",
    mode: "delivery",
    reference: "SUB-ADDRESS",
    status: "ready_for_delivery",
    statusLabel: "جاهز للتوصيل",
    ui: { label: "جاهز للتوصيل", color: "green" },
    customer: { id: "customer-1", name: "عميل", phone: "0500000000" },
    fulfillment: {
      mode: "delivery",
      delivery: {
        address: {
          city: "جدة",
          district: "حي الروضة",
          street: "شارع الأمير سعود",
          buildingNumber: "14",
          floor: "3",
          apartmentNumber: "8",
          postalCode: "23433",
          additionalNumber: "6124",
          landmark: "بجوار المسجد",
          notes: "اتصل قبل الوصول",
          location: { coordinates: [39.155, 21.58] },
        },
      },
    },
    delivery: {
      addressSummary: "حي الروضة، شارع الأمير سعود، مبنى 14، جدة",
      address: {
        city: "جدة",
        district: "حي الروضة",
        street: "شارع الأمير سعود",
        buildingNumber: "14",
        floor: "3",
        apartmentNumber: "8",
        postalCode: "23433",
        additionalNumber: "6124",
        landmark: "بجوار المسجد",
        notes: "اتصل قبل الوصول",
        location: { coordinates: [39.155, 21.58] },
      },
    },
    context: {
      date: "2026-07-30",
      addressSummary: "حي الروضة، شارع الأمير سعود، مبنى 14، جدة",
    },
    allowedActions: [],
    timestamps: { createdAt: null, updatedAt: null },
  } as UnifiedQueueItem;
}

test("builds a complete structured delivery address without hiding fields", () => {
  const address = getDeliveryAddressPresentation(makeDeliveryItem());

  assert.equal(address.summary, "حي الروضة، شارع الأمير سعود، مبنى 14، جدة");
  assert.deepEqual(
    address.details.map((detail) => [detail.label, detail.value]),
    [
      ["المدينة", "جدة"],
      ["الحي", "حي الروضة"],
      ["الشارع", "شارع الأمير سعود"],
      ["رقم المبنى", "14"],
      ["الدور", "3"],
      ["الشقة / الوحدة", "8"],
      ["الرمز البريدي", "23433"],
      ["الرقم الإضافي", "6124"],
      ["علامة مميزة", "بجوار المسجد"],
    ]
  );
  assert.equal(address.notes, "اتصل قبل الوصول");
  assert.equal(
    address.mapUrl,
    "https://www.google.com/maps/search/?api=1&query=21.58,39.155"
  );
});
