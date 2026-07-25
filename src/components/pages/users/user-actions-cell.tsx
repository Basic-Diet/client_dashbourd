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
  EyeIcon,
  KeyRoundIcon,
  MoreHorizontalIcon,
  PlusCircleIcon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import type { User } from "@/types/userTypes";
import { useUpdateUserMutation } from "@/hooks/useUsersQuery";
import { ToastMessage } from "@/components/global/ToastMessage";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  canCreateCustomerSubscription,
  canManageCustomerPasswords,
} from "@/lib/rolePermissions";
import { ResetPasswordDialog } from "./reset-password-dialog";

interface UserActionsCellProps {
  user: User;
}

export function UserActionsCell({ user }: UserActionsCellProps) {
  const [open, setOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const { mutate: updateUser, isPending } = useUpdateUserMutation();
  const { user: sessionUser } = useAuth();
  const canManagePasswords = canManageCustomerPasswords(sessionUser?.role);
  const canUpdateAccount = canManagePasswords;
  const canResetPassword =
    canManagePasswords && user.isActive && user.canResetPassword !== false;
  const canCreateSubscription = canCreateCustomerSubscription(sessionUser?.role);

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
        onError: () => {
          ToastMessage("حدث خطأ أثناء تحديث حالة المستخدم", "error");
        },
      }
    );
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">إجراءات</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link
              to="/users/$userId"
              params={{ userId: user.id }}
              className="flex items-center gap-2"
            >
              <EyeIcon className="size-4" />
              عرض
            </Link>
          </DropdownMenuItem>

          {canCreateSubscription ? (
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
          ) : null}

          {canResetPassword ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setOpen(false);
                setResetOpen(true);
              }}
            >
              <KeyRoundIcon className="size-4" />
              إعادة تعيين كلمة المرور
            </DropdownMenuItem>
          ) : null}

          {canUpdateAccount ? <DropdownMenuSeparator /> : null}

          {canUpdateAccount ? (
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
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ResetPasswordDialog
        user={user}
        open={resetOpen}
        onOpenChange={setResetOpen}
      />
    </>
  );
}
