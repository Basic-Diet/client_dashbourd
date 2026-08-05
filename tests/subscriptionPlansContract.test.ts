import assert from "node:assert/strict";
import {
  filterCanonicalSubscriptionPlans,
  isEditableSubscriptionPlan,
} from "../src/constants/menuCatalog";
import { test } from "vitest";

test("subscriptionPlansContract.test", () => {
  const dynamicPlan = {
    id: "6a61cff1956d3e6c07e0abad",
    _id: "6a61cff1956d3e6c07e0abad",
    name: {
      ar: "اشتراك وجبات لمدة 7 أيام",
      en: "7-day meal subscription",
    },
    daysCount: 7,
    timelineExtraDays: 1,
    durationDays: 7,
    gramsOptions: [
      {
        grams: 100,
        mealsOptions: [{ mealsPerDay: 1, priceHalala: 11700 }],
      },
    ],
  };
  const plans = [
    { key: "subscription_1_meal_7_days_100g", isActive: true },
    { key: "subscription_7_days", gramsOptions: [] },
    { key: "subscription_26_days", gramsOptions: [] },
    { key: "subscription_30_days", gramsOptions: [] },
    { key: "subscription_2_meal_26_days_150g", isActive: true },
    dynamicPlan,
    { key: "other_plan", gramsOptions: [] },
  ];

  assert.equal(isEditableSubscriptionPlan(dynamicPlan), true);
  assert.deepEqual(
    filterCanonicalSubscriptionPlans(plans).map((plan) => plan.key ?? plan.id),
    [
      "subscription_7_days",
      "subscription_26_days",
      "subscription_30_days",
      "6a61cff1956d3e6c07e0abad",
    ]
  );
});
