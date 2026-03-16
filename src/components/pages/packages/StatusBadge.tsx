import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon, XCircleIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Package } from "@/types/packageTypes";
import { fetchTogglePlanStatus } from "@/utils/fetchTogglePlanStatus";
import { useQueryClient } from "@tanstack/react-query";
import { packagesQueryOptions } from "@/hooks/usePackagesQuery";
import { ToastMessage } from "@/components/global/ToastMessage";

export function StatusBadge({ pkg }: { pkg: Package }) {
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await fetchTogglePlanStatus(pkg._id);
      await queryClient.invalidateQueries(packagesQueryOptions());
      ToastMessage(
        pkg.isActive
          ? "تم تعطيل الباقة بنجاح"
          : "تم تفعيل الباقة بنجاح",
        "success"
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      ToastMessage(
        err?.response?.data?.message || "حدث خطأ أثناء تغيير حالة الباقة",
        "error"
      );
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Badge
      variant="outline"
      onClick={handleToggle}
      className={cn(
        "cursor-pointer select-none transition-all hover:opacity-80",
        isToggling && "pointer-events-none opacity-60",
        pkg.isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
      )}
    >
      {isToggling ? (
        <Loader2 className="ml-1 size-3.5 animate-spin" />
      ) : pkg.isActive ? (
        <CheckCircleIcon className="ml-1 size-3.5" />
      ) : (
        <XCircleIcon className="ml-1 size-3.5" />
      )}
      {pkg.isActive ? "نشطة" : "غير نشطة"}
    </Badge>
  );
}
