// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOperationsBoard } from "../src/hooks/useOperationsBoard";
import { OperationsQueueTable } from "../src/components/pages/operations-board/OperationsQueueTable";
import { ReasonActionDialog } from "../src/components/pages/pickup-board/ReasonActionDialog";
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

  it("invalidates the active operations key and renders refreshed backend data after a successful action", async () => {
    const initial = {
      ...orderWith({
        id: "refresh-order",
        status: "confirmed",
        actions: [action("prepare", "Start prep")],
      }),
      statusLabel: "Confirmed card",
    };
    const updated = {
      ...initial,
      status: "in_preparation",
      statusLabel: "Preparing card",
      allowedActions: [action("ready_for_pickup", "Ready for pickup")],
      timestamps: {
        ...initial.timestamps,
        updatedAt: "2026-07-23T14:00:00.000Z",
      },
    };
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    mocks.fetchDashboardOpsList
      .mockResolvedValueOnce({ status: true, data: { date: "", items: [initial] } })
      .mockResolvedValueOnce({ status: true, data: { date: "", items: [updated] } });
    mocks.request.mockResolvedValueOnce({ data: { status: true, data: updated } });

    function BoardPreview() {
      const board = useOperationsBoard();
      return (
        <OperationsQueueTable
          items={board.itemsByScreen.kitchen}
          isPending={board.isPending}
          pendingActions={board.pendingActions}
          onAction={(item, actionId, label, isDangerous) => {
            void board.requestAction(item, actionId, label, isDangerous);
          }}
        />
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <BoardPreview />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Confirmed card")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start prep" }));

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["operations-board", "queue"],
        refetchType: "active",
      })
    );
    expect(await screen.findByText("Preparing card")).toBeInTheDocument();
    expect(screen.queryByText("Confirmed card")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ready for pickup" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start prep" })).not.toBeInTheDocument();
  });

  it("keeps delivery rows visible in the courier tab even when kitchen preparation is still required", async () => {
    const courierMode = ["deliv", "ery"].join("") as "delivery";
    const deliveryItem = {
      ...orderWith({
        id: "delivery-open-2026-07-26",
        status: "open",
        mode: courierMode,
        actions: [action("prepare", "Start prep")],
      }),
      source: "subscription",
      entityType: "subscription_day",
      type: "subscription",
      fulfillment: {
        mode: courierMode,
        deliverySlot: "10:00-12:00",
        delivery: {
          date: "2026-07-26",
          window: "10:00-12:00",
          status: null,
          zoneId: "ZONE-1",
        },
      },
      delivery: {
        date: "2026-07-26",
        window: "10:00-12:00",
        status: null,
        zoneId: "ZONE-1",
      },
      context: {
        date: "2026-07-26",
        window: "10:00-12:00",
      },
    } as UnifiedQueueItem;
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mocks.fetchDashboardOpsList.mockResolvedValueOnce({
      status: true,
      data: { date: "2026-07-26", items: [deliveryItem] },
    });

    const { result } = renderHook(
      () => useOperationsBoard({ date: "2026-07-26" }),
      {
        wrapper: queryWrapper(queryClient),
      }
    );

    await waitFor(() =>
      expect(result.current.itemsByScreen.kitchen.map((item) => item.id)).toContain(
        "delivery-open-2026-07-26"
      )
    );
    expect(result.current.itemsByScreen.courier.map((item) => item.id)).toContain(
      "delivery-open-2026-07-26"
    );
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

describe("reason-required operation dialog", () => {
  function ReasonHarness({
    onSubmit,
  }: {
    onSubmit: (values: { reason: string; notes?: string }) => Promise<boolean>;
  }) {
    const [open, setOpen] = useState(true);
    return (
      <ReasonActionDialog
        dialogState={{
          open,
          item: orderWith({
            id: "reason-order",
            actions: [
              {
                ...action("cancel", "Cancel order", "/api/dashboard/ops/actions/cancel", "POST", "red"),
                requiresReason: true,
              },
            ],
          }),
          action: "cancel",
          actionLabel: "Cancel order",
          isDangerous: true,
        }}
        onOpenChange={setOpen}
        onSubmit={async (values) => {
          const shouldClose = await onSubmit(values);
          if (shouldClose) setOpen(false);
        }}
        isPending={false}
      />
    );
  }

  it("rejects whitespace-only reasons before submitting", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ReasonHarness onSubmit={onSubmit} />);
    const [reasonInput] = screen.getAllByRole("textbox");

    await user.type(reasonInput, "   ");
    await user.click(screen.getByRole("button", { name: /Cancel order/ }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("keeps the dialog open when a reason mutation fails", async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    const user = userEvent.setup();
    render(<ReasonHarness onSubmit={onSubmit} />);
    const [reasonInput] = screen.getAllByRole("textbox");

    await user.type(reasonInput, "Customer requested cancel");
    await user.click(screen.getByRole("button", { name: /Cancel order/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("trims reason and notes then closes after a successful reason mutation", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(<ReasonHarness onSubmit={onSubmit} />);
    const [reasonInput, notesInput] = screen.getAllByRole("textbox");

    await user.type(reasonInput, "  Customer no-show  ");
    await user.type(notesInput, "  Called twice  ");
    await user.click(screen.getByRole("button", { name: /Cancel order/ }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        reason: "Customer no-show",
        notes: "Called twice",
      })
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});
