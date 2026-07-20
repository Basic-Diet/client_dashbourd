from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    content = path.read_text(encoding="utf-8")
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:160]!r}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


utils = Path("src/components/pages/menu/meal-builder/mealPlannerV2Utils.ts")
replace_once(
    utils,
    '''  MealPlannerCatalogCandidate,
  MealPlannerCreatePayloadV2,''',
    '''  MealPlannerCardContractV2,
  MealPlannerCatalogCandidate,
  MealPlannerCreatePayloadV2,''',
)
replace_once(
    utils,
    '''  const explicit = String(section.cardType || section.metadata?.cardType || "");
  if (explicit === "direct_product" || explicit === "option_family") return explicit;
  if (section.sectionType === "product_list" || section.selectedProductIds?.length) {
    return "direct_product";
  }
  if (
    section.sectionType === "option_group" ||
    section.sectionType === "option_family" ||
    section.selectedOptionIds?.length ||
    section.productContextId ||
    section.sourceGroupId
  ) {
    return "option_family";
  }''',
    '''  const selectionType = String(section.selectionType || "");
  const sectionType = String(section.sectionType || "");
  const selectedProductCount = section.selectedProductIds?.length || 0;
  const selectedOptionCount = section.selectedOptionIds?.length || 0;

  // Canonical meal identity wins over contradictory historical card metadata.
  // Production contains legacy sections where a complete sandwich product still
  // carries option-family metadata. Those sections must remain direct meals.
  if (
    selectionType === "full_meal_product" ||
    selectionType === "sandwich" ||
    sectionType === "product_list" ||
    sectionType === "product_category" ||
    (selectedProductCount > 0 && selectedOptionCount === 0)
  ) {
    return "direct_product";
  }

  const explicit = String(section.cardType || section.metadata?.cardType || "");
  if (explicit === "direct_product" || explicit === "option_family") return explicit;
  if (
    sectionType === "option_group" ||
    sectionType === "option_family" ||
    selectedOptionCount > 0 ||
    section.productContextId ||
    section.sourceGroupId
  ) {
    return "option_family";
  }''',
)
replace_once(
    utils,
    '''export function canonicalSelectionType(section: MealPlannerSectionV2) {''',
    '''export function creatableCardTypes(
  contract?: MealPlannerCardContractV2 | null
): Array<"direct_product" | "option_family"> {
  const values = (contract?.dynamicCardTypes || [])
    .map((entry) => String(entry.cardType || ""))
    .filter(
      (value): value is "direct_product" | "option_family" =>
        value === "direct_product" || value === "option_family"
    );
  return values.length
    ? Array.from(new Set(values))
    : ["direct_product", "option_family"];
}

export function allowedOptionRoles(
  contract?: MealPlannerCardContractV2 | null
): MealPlannerOptionRole[] {
  const optionContract = contract?.dynamicCardTypes?.find(
    (entry) => entry.cardType === "option_family"
  );
  const values = (optionContract?.allowedOptionRoles || []).filter(
    (value): value is MealPlannerOptionRole =>
      value === "protein" || value === "carbs"
  );
  return values.length ? Array.from(new Set(values)) : ["protein", "carbs"];
}

export function canonicalSelectionType(section: MealPlannerSectionV2) {''',
)

dialog = Path("src/components/pages/menu/meal-builder/MealPlannerCardDialogV2.tsx")
replace_once(
    dialog,
    '''  MealPlannerCatalogCandidate,
  MealPlannerCatalogV2,''',
    '''  MealPlannerCardContractV2,
  MealPlannerCatalogCandidate,
  MealPlannerCatalogV2,''',
)
replace_once(
    dialog,
    '''  buildMealPlannerCreatePayload,
  candidateId,''',
    '''  allowedOptionRoles,
  buildMealPlannerCreatePayload,
  candidateId,
  creatableCardTypes,''',
)
replace_once(
    dialog,
    '''  section,
  catalog,
  pending,''',
    '''  section,
  catalog,
  cardContract,
  pending,''',
)
replace_once(
    dialog,
    '''  section?: MealPlannerSectionV2 | null;
  catalog: MealPlannerCatalogV2;
  pending: boolean;''',
    '''  section?: MealPlannerSectionV2 | null;
  catalog: MealPlannerCatalogV2;
  cardContract?: MealPlannerCardContractV2 | null;
  pending: boolean;''',
)
replace_once(
    dialog,
    '''  const editing = Boolean(section);
  const initialValue = useMemo(
    () => buildInitialValue(section, catalog),
    [catalog, section]
  );''',
    '''  const editing = Boolean(section);
  const cardTypes = useMemo(
    () => creatableCardTypes(cardContract),
    [cardContract]
  );
  const optionRoles = useMemo(
    () => allowedOptionRoles(cardContract),
    [cardContract]
  );
  const initialValue = useMemo(() => {
    const initial = buildInitialValue(section, catalog);
    if (section || cardTypes.includes(initial.cardType)) return initial;
    const cardType = cardTypes[0] || "direct_product";
    return {
      ...initial,
      cardType,
      optionRole: optionRoles[0] || "protein",
    };
  }, [cardTypes, catalog, optionRoles, section]);''',
)
replace_once(
    dialog,
    '''                <TypeChoice
                  active={value.cardType === "direct_product"}
                  disabled={editing}
                  icon={Package}
                  title="منتجات كاملة"
                  description="منتجات تُضاف مباشرة وتستهلك وجبة كاملة"
                  onClick={() => changeType("direct_product")}
                />
                <TypeChoice
                  active={value.cardType === "option_family"}
                  disabled={editing}
                  icon={Layers3}
                  title="خيارات وجبة مركبة"
                  description="خيارات بروتين أو كارب تحتاج كارتًا مكملًا"
                  onClick={() => changeType("option_family")}
                />''',
    '''                {cardTypes.includes("direct_product") ? (
                  <TypeChoice
                    active={value.cardType === "direct_product"}
                    disabled={editing}
                    icon={Package}
                    title="منتجات كاملة"
                    description="منتجات تُضاف مباشرة وتستهلك وجبة كاملة"
                    onClick={() => changeType("direct_product")}
                  />
                ) : null}
                {cardTypes.includes("option_family") ? (
                  <TypeChoice
                    active={value.cardType === "option_family"}
                    disabled={editing}
                    icon={Layers3}
                    title="خيارات وجبة مركبة"
                    description="خيارات بروتين أو كارب تحتاج كارتًا مكملًا"
                    onClick={() => changeType("option_family")}
                  />
                ) : null}''',
)
replace_once(
    dialog,
    '''                    options={[
                      { value: "protein", label: "خيارات بروتين" },
                      { value: "carbs", label: "خيارات كارب" },
                    ]}''',
    '''                    options={optionRoles.map((role) => ({
                      value: role,
                      label: role === "protein" ? "خيارات بروتين" : "خيارات كارب",
                    }))}''',
)

workspace = Path("src/components/pages/menu/meal-builder/MealPlannerWorkspaceV2.tsx")
replace_once(
    workspace,
    '''          section={editor === "create" ? null : editor}
          catalog={catalog}
          pending={cardMutation.isPending}''',
    '''          section={editor === "create" ? null : editor}
          catalog={catalog}
          cardContract={state.cardContract ?? catalog.cardContract}
          pending={cardMutation.isPending}''',
)

payload_tests = Path("tests/mealPlannerV2Payloads.test.ts")
replace_once(
    payload_tests,
    '''  ERROR_MESSAGES,
  canonicalSelectionType,''',
    '''  ERROR_MESSAGES,
  canonicalSelectionType,
  normalizeCardType,''',
)
replace_once(
    payload_tests,
    '''  it("normalizes historical sandwich data for display", () => {
    expect(
      canonicalSelectionType({
        key: "sandwiches",
        sectionType: "product_list",
        selectionType: "sandwich",
      })
    ).toBe("full_meal_product");
  });''',
    '''  it("normalizes historical sandwich data for display", () => {
    expect(
      canonicalSelectionType({
        key: "sandwiches",
        sectionType: "product_list",
        selectionType: "sandwich",
      })
    ).toBe("full_meal_product");
  });

  it("keeps a canonical full-meal sandwich direct despite contradictory legacy metadata", () => {
    const section = {
      key: "sandwich",
      cardType: "option_family",
      sectionType: "product_category",
      selectionType: "full_meal_product",
      selectedProductIds: ["product-1"],
      selectedOptionIds: [],
      optionRole: "protein",
    } as const;

    expect(normalizeCardType(section)).toBe("direct_product");
    expect(canonicalSelectionType(section)).toBe("full_meal_product");
  });''',
)

component_tests = Path("tests/mealPlannerV2Components.test.tsx")
replace_once(
    component_tests,
    '''  it("submits a direct card using the canonical full_meal_product payload", async () => {''',
    '''  it("reads creatable card types and option roles from cardContract", async () => {
    const user = userEvent.setup();
    render(
      <MealPlannerCardDialogV2
        catalog={emptyCatalog}
        cardContract={{
          dynamicCardTypes: [
            {
              cardType: "option_family",
              allowedOptionRoles: ["carbs"],
            },
          ],
        }}
        pending={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    );

    expect(
      screen.queryByRole("button", { name: /منتجات كاملة/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /خيارات وجبة مركبة/ })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "نوع الخيارات" }));
    expect(screen.queryByText("خيارات بروتين")).not.toBeInTheDocument();
    expect(screen.getByText("خيارات كارب")).toBeInTheDocument();
  });

  it("submits a direct card using the canonical full_meal_product payload", async () => {''',
)
replace_once(
    component_tests,
    '''  it("renders Premium first as read-only while dynamic cards keep contextual actions", () => {''',
    '''  it("renders contradictory historical sandwich metadata as a complete direct meal", () => {
    render(
      <MealPlannerCardGridV2
        premiumSection={{ automatic: true, items: [] }}
        sections={[
          {
            key: "sandwich",
            cardType: "option_family",
            sectionType: "product_category",
            selectionType: "full_meal_product",
            optionRole: "protein",
            titleOverride: { ar: "ساندوتشات", en: "Sandwiches" },
            selectedProductIds: ["product-1"],
            selectedOptionIds: [],
            selectedProducts: [{ id: "product-1", label: "برجر لحم" }],
            visible: true,
          },
        ]}
        issues={[]}
        pending={false}
        onEdit={vi.fn()}
        onManageItems={vi.fn()}
        onToggleVisibility={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("وجبة كاملة")).toBeInTheDocument();
    expect(screen.getByText(/يُحتسب كوجبة كاملة/)).toBeInTheDocument();
    expect(screen.queryByText("خيارات بروتين")).not.toBeInTheDocument();
  });

  it("renders Premium first as read-only while dynamic cards keep contextual actions", () => {''',
)

qa = Path(".qa/meal-builder-authenticated-qa.mjs")
replace_once(
    qa,
    '''  card = dynamicCard(page, updatedTitle);
  await card.getByRole("button", { name: "حذف الكارت" }).click();
  const deleteDialog = page.getByRole("alertdialog").filter({
    hasText: updatedTitle,
  });
  await deleteDialog.waitFor();
  await deleteDialog.getByRole("button", { name: "حذف الكارت" }).click();
  await page.getByRole("heading", { name: updatedTitle, exact: true }).waitFor({
    state: "detached",
    timeout: 45_000,
  });
  check("Deleted the QA card through the UI");

  const stateResult = await apiRequest(
    token,
    "GET",
    "/api/dashboard/meal-builder?lang=ar"
  );
  if (!stateResult.response.ok) {
    throw new Error(`State verification failed with ${stateResult.response.status}`);
  }
  const editableSections =
    stateResult.payload?.data?.draft?.sections ||
    stateResult.payload?.data?.published?.sections ||
    [];
  const editableSectionKeys = Array.isArray(editableSections)
    ? editableSections.map((section) => String(section?.key || ""))
    : [];
  if (
    editableSectionKeys.includes(originalKey) ||
    editableSectionKeys.includes(renamedKey)
  ) {
    throw new Error("Deleted QA card is still present in editable Backend sections");
  }
  check("Authoritative Backend sections confirm QA card cleanup", {
    editableSectionCount: editableSectionKeys.length,
  });''',
    '''  card = dynamicCard(page, updatedTitle);
  await card.getByRole("button", { name: "حذف الكارت" }).click();
  const deleteDialog = page.getByRole("alertdialog").filter({
    hasText: updatedTitle,
  });
  await deleteDialog.waitFor();
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" &&
      new URL(response.url()).pathname.endsWith(
        `/api/dashboard/meal-builder/sections/${encodeURIComponent(renamedKey)}`
      ),
    { timeout: 45_000 }
  );
  await deleteDialog.getByRole("button", { name: "حذف الكارت" }).click();
  const deleteResponse = await deleteResponsePromise;
  const deletePayload = await deleteResponse.json().catch(() => null);
  const deleteDraftKeys = Array.isArray(deletePayload?.data?.draft?.sections)
    ? deletePayload.data.draft.sections.map((section) => String(section?.key || ""))
    : [];
  report.apiResponses.push({
    operation: "delete",
    status: deleteResponse.status(),
    contractVersion: deletePayload?.data?.contractVersion || null,
    action: deletePayload?.data?.action || null,
    previousSectionKey: deletePayload?.data?.previousSectionKey || null,
    responseHasDraft: Array.isArray(deletePayload?.data?.draft?.sections),
    remainingQaKeys: deleteDraftKeys.filter(
      (key) => key === originalKey || key === renamedKey
    ),
    errorCode: deletePayload?.error?.code || null,
  });
  if (!deleteResponse.ok()) {
    throw new Error(`Delete failed with ${deleteResponse.status()}`);
  }
  if (
    deletePayload?.data?.action !== "deleted" ||
    deletePayload?.data?.previousSectionKey !== renamedKey ||
    deleteDraftKeys.includes(originalKey) ||
    deleteDraftKeys.includes(renamedKey)
  ) {
    throw new Error("Delete response did not return a clean authoritative draft");
  }
  await page.getByRole("heading", { name: updatedTitle, exact: true }).waitFor({
    state: "detached",
    timeout: 45_000,
  });
  check("Deleted the QA card and verified the authoritative mutation draft", {
    remainingSectionCount: deleteDraftKeys.length,
  });''',
)

option_qa = Path(".qa/meal-builder-option-family-qa.mjs")
content = option_qa.read_text(encoding="utf-8")
old = '''  const itemsDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: new RegExp("إدارة عناصر") }),
  });
  await itemsDialog.waitFor();
  const selectedButton = itemsDialog.locator('button[aria-pressed="true"]:not([disabled])').first();
  await selectedButton.waitFor({ timeout: 45_000 });
  const removedText = (await selectedButton.innerText()).trim();
  const selectedCandidates = pickerPayload?.data?.candidates || [];
  const removedCandidate = selectedCandidates.find((candidate) => {
    const id = String(candidate?.optionId || candidate?.id || candidate?._id || "");
    return candidate?.selected === true && originalIds.includes(id);
  });
  removedId = String(
    removedCandidate?.optionId || removedCandidate?.id || removedCandidate?._id || ""
  );
  if (!removedId) {
    throw new Error("Could not resolve the selected Option canonical ID");
  }
  await selectedButton.click();'''
new = '''  const itemsDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: new RegExp("إدارة عناصر") }),
  });
  await itemsDialog.waitFor();
  const selectedCandidates = pickerPayload?.data?.candidates || [];
  const removedCandidate = selectedCandidates.find((candidate) => {
    const id = String(candidate?.optionId || candidate?.id || candidate?._id || "");
    return candidate?.selected === true && originalIds.includes(id);
  });
  removedId = String(
    removedCandidate?.optionId || removedCandidate?.id || removedCandidate?._id || ""
  );
  const removedKey = String(removedCandidate?.key || "");
  if (!removedId || !removedKey) {
    throw new Error("Could not resolve the selected Option canonical identity");
  }
  const selectedButton = itemsDialog
    .locator('button[aria-pressed="true"]:not([disabled])')
    .filter({ hasText: removedKey })
    .first();
  await selectedButton.waitFor({ timeout: 45_000 });
  const removedText = (await selectedButton.innerText()).trim();
  await selectedButton.click();'''
if content.count(old) != 1:
    raise RuntimeError(f"{option_qa}: selected Option block mismatch")
content = content.replace(old, new, 1)
old_restore = '''  const restoreButton = restoreDialog
    .locator('button[aria-pressed="false"]:not([disabled])')
    .filter({ hasText: removedText })
    .first();'''
new_restore = '''  const restoreButton = restoreDialog
    .locator('button[aria-pressed="false"]:not([disabled])')
    .filter({ hasText: removedKey })
    .first();'''
if content.count(old_restore) != 1:
    raise RuntimeError(f"{option_qa}: restore Option block mismatch")
content = content.replace(old_restore, new_restore, 1)
option_qa.write_text(content, encoding="utf-8")
