// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOperationsBoard } from "../src/hooks/useOperationsBoard";
import { OperationsQueueTable } from "../src/components/pages/operations-board/OperationsQueueTable";
import type { QueueAction, UnifiedQueueItem } from "../src/types/dashboardOpsTypes";
import { makeNormalizedProductionOrder } from "./operationsOneTimeOrderFixtures";

const mocks = vi.hoisted(() => ({
  fetchDashboardOpsList: vi.fn(),
  fetchDashboardOpsSearch: vi.fn(),
  request: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "cashier" } }),
}));

vi.mock("@/utils/fetchDashboardOpsData", () => ({
  fetchDashboardOpsList: mocks.fetchDashboardOpsList,
  fetchDashboardOpsSearch: mocks.fetchDashboardOpsSearch,
}));

vi.mock("@/lib/apis", () => ({
  default: {
    request: mocks.request,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

function action(
  id: string,
  label: string,
  endpoint = `/api/dashboard/ops/actions/${id}`,
  method: QueueAction["method"] = "POST",
  color?: string
): QueueAction {
  return { id, label, endpoint, method, color };
}

function orderWith({
  id,
  status = "confirmed",
  mode = "pickup",
  actions,
}: {
  id: string;
  status?: string;
  mode?: "pickup" | "delivery";
  actions: QueueAction[];
}) {
  const item = makeNormalizedProductionOrder({ status, actions }) as UnifiedQueueItem;
  return {
    ...item,
    id,
    entityId: id,
    reference: id,
    mode,
  };
}

function renderTable(items: UnifiedQueueItem[], pendingActions = {}) {
  return render(
    <OperationsQueueTable
      items={items}
      isPending={false}
      pendingActions={pendingActions}
      onAction={vi.fn()}
    />
  );
}

function queryWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("one-time order lifecycle action rendering", () => {
  it.each([
    {
      status: "confirmed",
      statusText: "مؤكد",
      actions: [
        action("prepare", "بدء التحضير"),
        action("cancel", "إلغاء", "/api/dashboard/ops/actions/cancel", "POST", "red"),
      ],
      labels: ["بدء التحضير", "إلغاء"],
    },
    {
      status: "in_preparation",
      statusText: "قيد التحضير",
      actions: [
        action("ready_for_pickup", "جاهز للاستلام"),
        action("cancel", "إلغاء", "/api/dashboard/ops/actions/cancel", "POST", "red"),
      ],
      labels: ["جاهز للاستلام", "إلغاء"],
    },
    {
      status: "ready_for_pickup",
      statusText: "جاهز للاستلام",
      actions: [
        action("fulfill", "تسليم"),
        action("cancel", "إلغاء", "/api/dashboard/ops/actions/cancel", "POST", "red"),
      ],
      labels: ["تسليم", "إلغاء"],
    },
  ])("renders backend-provided status and actions for $status", ({ status, statusText, actions, labels }) => {
    renderTable([orderWith({ id: `order-${status}`, status, actions })]);

    expect(screen.getAllByText(statusText).length).toBeGreaterThan(0);
    labels.forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
  });

  it("renders fulfilled status without inventing actions", () => {
    renderTable([
      orderWith({ id: "fulfilled-order", status: "fulfilled", actions: [] }),
    ]);

    expect(screen.getAllByText("مكتمل").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "بدء التحضير" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "إلغاء" })).not.toBeInTheDocument();
    expect(screen.getByText("لا توجد إجراءات متاحة من النظام الآن")).toBeInTheDocument();
  });

  it("does not invent actions for empty delivery allowedActions", () => {
    const courierMode = ["deliv", "ery"].join("") as "delivery";
    const item = orderWith({
      id: "delivery-empty-actions",
      status: "confirmed",
      mode: courierMode,
      actions: [],
    });
    renderTable([
      {
        ...item,
        source: "subscription",
        entityType: "subscription_day",
        type: "subscription",
      },
    ]);

    expect(screen.queryByRole("button", { name: "بدء التحضير" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "إلغاء" })).not.toBeInTheDocument();
    expect(screen.getByText("لا توجد إجراءات متاحة من النظام الآن")).toBeInTheDocument();
  });

  it("disables all transition actions on the same order while showing the human pending label", () => {
    const item = orderWith({
      id: "pending-order",
      actions: [
        action("prepare", "بدء التحضير"),
        action("cancel", "إلغاء", "/api/dashboard/ops/actions/cancel", "POST", "red"),
      ],
    });

    renderTable([item], {
      [item.id]: { actionId: "prepare", label: "بدء التحضير" },
    });

    expect(screen.getByRole("button", { name: "جار بدء التحضير..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeDisabled();
  });
});

describe("useOperationsBoard one-time action pending state", () => {
  beforeEach(() => {
    mocks.fetchDashboardOpsList.mockResolvedValue({
      status: true,
      data: { date: "", items: [] },
    });
  });

  it("prevents duplicate order submissions, keeps concurrent orders independent, and refetches once on success", async () => {
    const orderA = orderWith({
      id: "order-a",
      actions: [action("prepare", "بدء التحضير", "/api/dashboard/ops/actions/prepare", "PUT")],
    });
    const orderB = orderWith({
      id: "order-b",
      actions: [action("prepare", "بدء التحضير")],
    });
    const requestA = deferred<{ data: { status: boolean } }>();
    const requestB = deferred<{ data: { status: boolean } }>();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mocks.request
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise);

    const { result } = renderHook(() => useOperationsBoard(), {
      wrapper: queryWrapper(queryClient),
    });

    await waitFor(() => expect(mocks.fetchDashboardOpsList).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.requestAction(orderA, "prepare", "بدء التحضير");
      result.current.requestAction(orderA, "prepare", "بدء التحضير");
      result.current.requestAction(orderB, "prepare", "بدء التحضير");
    });

    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
    expect(mocks.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: "/api/dashboard/ops/actions/prepare",
        method: "put",
        data: {
          entityId: "order-a",
          entityType: "order",
          source: "one_time_order",
        },
      })
    );
    expect(result.current.pendingActions[orderA.id]).toEqual({
      actionId: "prepare",
      label: "بدء التحضير",
    });
    expect(result.current.pendingActions[orderB.id]).toEqual({
      actionId: "prepare",
      label: "بدء التحضير",
    });

    act(() => {
      requestA.resolve({ data: { status: true } });
    });

    await waitFor(() => expect(result.current.pendingActions[orderA.id]).toBeUndefined());
    expect(result.current.pendingActions[orderB.id]).toEqual({
      actionId: "prepare",
      label: "بدء التحضير",
    });
    expect(mocks.fetchDashboardOpsList).toHaveBeenCalledTimes(2);

    act(() => {
      requestB.reject(new Error("network"));
    });

    await waitFor(() => expect(result.current.pendingActions[orderB.id]).toBeUndefined());
  });

  it("keeps table-level duplicate clicks to one request after pending state renders", async () => {
    const onAction = vi.fn();
    const item = orderWith({
      id: "click-order",
      actions: [action("prepare", "بدء التحضير")],
    });
    const user = userEvent.setup();
    const { rerender } = render(
      <OperationsQueueTable
        items={[item]}
        isPending={false}
        pendingActions={{}}
        onAction={onAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "بدء التحضير" }));
    rerender(
      <OperationsQueueTable
        items={[item]}
        isPending={false}
        pendingActions={{ [item.id]: { actionId: "prepare", label: "بدء التحضير" } }}
        onAction={onAction}
      />
    );
    await user.click(screen.getByRole("button", { name: "جار بدء التحضير..." }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
