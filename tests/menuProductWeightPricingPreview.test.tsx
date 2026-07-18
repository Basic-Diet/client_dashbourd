/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductWeightPricingPreview } from "../src/components/pages/menu/products/ProductWeightPricingPreview";
import type { WeightPricingDescriptor } from "../src/types/menuTypes";

const descriptor: WeightPricingDescriptor = {
  contractVersion: "weight_pricing.v1",
  strategy: "base_plus_steps",
  requiresWeightSelection: true,
  basePriceHalala: 1900,
  baseWeightGrams: 100,
  defaultWeightGrams: 100,
  minWeightGrams: 100,
  maxWeightGrams: 300,
  stepGrams: 50,
  stepPriceHalala: 500,
  choices: [
    { weightGrams: 100, priceHalala: 1900 },
    { weightGrams: 175, priceHalala: 2775 },
    { weightGrams: 300, priceHalala: 4100 },
  ],
};

describe("ProductWeightPricingPreview", () => {
  it("renders the spicy chicken target choices returned by the backend", () => {
    render(
      <ProductWeightPricingPreview
        weightPricing={{
          ...descriptor,
          choices: [
            { weightGrams: 100, priceHalala: 1900 },
            { weightGrams: 150, priceHalala: 2400 },
            { weightGrams: 200, priceHalala: 2900 },
            { weightGrams: 250, priceHalala: 3400 },
            { weightGrams: 300, priceHalala: 3900 },
          ],
        }}
      />
    );

    expect(screen.getByText("100 جم")).toBeInTheDocument();
    expect(screen.getByText("19.00 ر.س")).toBeInTheDocument();
    expect(screen.getByText("150 جم")).toBeInTheDocument();
    expect(screen.getByText("24.00 ر.س")).toBeInTheDocument();
    expect(screen.getByText("200 جم")).toBeInTheDocument();
    expect(screen.getByText("29.00 ر.س")).toBeInTheDocument();
    expect(screen.getByText("250 جم")).toBeInTheDocument();
    expect(screen.getByText("34.00 ر.س")).toBeInTheDocument();
    expect(screen.getByText("300 جم")).toBeInTheDocument();
    expect(screen.getByText("39.00 ر.س")).toBeInTheDocument();
  });

  it("renders backend choices exactly without calculating missing rows", () => {
    render(<ProductWeightPricingPreview weightPricing={descriptor} />);

    expect(screen.getByText("100 جم")).toBeInTheDocument();
    expect(screen.getByText("19.00 ر.س")).toBeInTheDocument();
    expect(screen.getByText("175 جم")).toBeInTheDocument();
    expect(screen.getByText("27.75 ر.س")).toBeInTheDocument();
    expect(screen.getByText("300 جم")).toBeInTheDocument();
    expect(screen.getByText("41.00 ر.س")).toBeInTheDocument();
    expect(screen.queryByText("150 جم")).not.toBeInTheDocument();
    expect(screen.queryByText("24.00 ر.س")).not.toBeInTheDocument();
  });

  it("shows a backend-confirmation note when choices are missing", () => {
    render(<ProductWeightPricingPreview weightPricing={null} />);

    expect(
      screen.getByText(/ستظهر المعاينة المعتمدة بعد تأكيد إعداد الوزن من الخادم/)
    ).toBeInTheDocument();
  });
});
