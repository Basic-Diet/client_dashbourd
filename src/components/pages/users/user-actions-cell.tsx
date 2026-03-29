import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontalIcon,
  UserCheckIcon,
  UserXIcon,
  EyeIcon,
  PlusCircleIcon,
} from "lucide-react";
import type { User } from "@/types/userTypes";
import { useUpdateUserMutation } from "@/hooks/useUsersQuery";
import { ToastMessage } from "@/components/global/ToastMessage";
import { Link } from "@tanstack/react-router";

interface UserActionsCellProps {
  user: User;
}

export function UserActionsCell({ user }: UserActionsCellProps) {
  const [open, setOpen] = useState(false);
  const { mutate: updateUser, isPending } = useUpdateUserMutation();

  const handleToggleActive = () => {
    updateUser(
      {
        userId: user.id,
        data: { isActive: !user.isActive },
      },
      {
        onSuccess: () => {
          ToastMessage(
            user.isActive
              ? "تم تعطيل حساب المستخدم"
              : "تم تفعيل حساب المستخدم",
            "success"
          );
          setOpen(false);
        },
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { error?: { message?: string } } } };
          const message =
            err?.response?.data?.error?.message ||
            "حدث خطأ أثناء تحديث حالة المستخدم";
          ToastMessage(message, "error");
        },
      }
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">إجراءات</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link
            to="/users/$userId"
            params={{ userId: user.id }}
            className="flex items-center gap-2"
          >
            <EyeIcon className="size-4" />
            عرض التفاصيل
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            to="/users/$userId/create-subscription"
            params={{ userId: user.id }}
            className="flex items-center gap-2"
          >
            <PlusCircleIcon className="size-4" />
            إنشاء اشتراك
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleToggleActive}
          disabled={isPending}
          className={
            user.isActive
              ? "text-destructive focus:text-destructive"
              : "text-emerald-600 focus:text-emerald-600"
          }
        >
          {user.isActive ? (
            <>
              <UserXIcon className="size-4" />
              تعطيل الحساب
            </>
          ) : (
            <>
              <UserCheckIcon className="size-4" />
              تفعيل الحساب
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
