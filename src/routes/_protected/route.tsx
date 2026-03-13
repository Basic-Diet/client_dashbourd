import { createFileRoute, Outlet } from "@tanstack/react-router";
import { sessionQueryOptions } from "@/lib/authApi";
import { authMiddleware } from "@/utils/authMiddleware";
import type { AuthResponse } from "@/types/auth";
import { Loader2 } from "lucide-react";
import { RouteError } from "@/components/global/RouteError";

export const Route = createFileRoute("/_protected")({
  beforeLoad: async ({ context, location }) => {
    const data = await context.queryClient.ensureQueryData(sessionQueryOptions);
    authMiddleware(data as AuthResponse, location.pathname);
  },
  component: RouteComponent,
  pendingComponent: () => (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
  errorComponent: RouteError,
});

function RouteComponent() {
  return <Outlet />;
}
