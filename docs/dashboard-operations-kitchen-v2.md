# Dashboard Operations Kitchen v2 Contract

The Operations dashboard renders the canonical backend contract
`kitchen_operations.v2`.

## Canonical Sources

- Customer: `item.customer`
- Fulfillment: `item.fulfillment`
- Kitchen cards: `item.kitchen.cards`
- Salad preparation details: `card.sections`
- Add-on selections: `item.kitchen.addonGroups`
- Actions: `item.allowedActions`
- Status label: `item.statusLabel`
- Status fallback: `item.status`

## Kitchen Preparation

Kitchen preparation is shown only when `item.kitchen.version === "v2"`.
Preparation cards use:

- `item.kitchen.mealCount`
- `item.kitchen.cards`
- `item.kitchen.addonGroups`
- `item.kitchen.warnings`

If Kitchen v2 is missing or unsupported, the dashboard keeps the customer,
fulfillment, status, and actions visible, and shows an Arabic unsupported
contract warning. The frontend does not reconstruct kitchen cards from older
or raw fields.

## One-Time Orders

One-time orders are pickup-only. They follow:

`confirmed -> in_preparation -> ready_for_pickup -> fulfilled`

`items[].selectedOptions` may be used only for the separate order-item detail
and pricing explanation. It must not be used to build operational kitchen
cards. Kitchen cards for one-time orders still come from `item.kitchen.cards`.

## Actions

Action buttons render only from `item.allowedActions`. Each action must provide
an `endpoint` and `method`. The frontend only executes relative operation
action paths beginning with `/api/dashboard/ops/actions/`.

The request body is canonical:

```ts
{
  entityId,
  entityType,
  source,
  payload?: {
    reason?,
    notes?,
    pickupCode?,
  },
}
```

The frontend does not send top-level `action`, `reason`, or `note`.

## Prohibited Production Inputs

The Operations dashboard must not build kitchen preparation from:

- `item.kitchenDetails`
- `item.kitchenDetails.mealSlots`
- `item.kitchenDetails.addons`
- `item.kitchen.meals`
- `item.kitchen.addons`
- `item.kitchenCards`
- `item.kitchenAddonGroups`
- `card.rawSelection`
- `item.selectedOptions`
- `item.addonSelections`
- `item.addonChoiceGroups`
- `addonSubscriptions.menuProductIds`

Production dashboard API calls must not request `includeLegacy=true` or
`includeRaw=true`.
