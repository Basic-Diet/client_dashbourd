import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAllUsersQuery } from "@/hooks/useUsersQuery";
import { Users, Search, Check } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import type { User } from "@/types/userTypes";

interface UserSelectionSectionProps {
  form: UseFormReturn<CreateSubscriptionSchemaType>;
}

export function UserSelectionSection({ form }: UserSelectionSectionProps) {
  const { data: usersResponse, isLoading } = useAllUsersQuery();
  const users = useMemo(() => usersResponse?.data || [], [usersResponse?.data]);
  const [search, setSearch] = useState("");

  const selectedUserId = form.watch("userId");

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u: User) =>
        u.fullName.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const selectedUser = users.find((u: User) => u.id === selectedUserId || u.coreUserId === selectedUserId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Users className="size-4" />
          </div>
          اختيار المستخدم
        </CardTitle>
        <CardDescription>اختر المستخدم الذي تريد إنشاء الاشتراك له</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو رقم الجوال..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Selected user badge */}
        {selectedUser && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{selectedUser.fullName}</p>
              <p className="text-xs text-muted-foreground" dir="ltr">{selectedUser.phone}</p>
            </div>
          </div>
        )}

        {/* Users list */}
        <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              لا يوجد مستخدمين
            </p>
          ) : (
            filteredUsers.map((user: User) => {
              const isSelected = selectedUserId === user.id || selectedUserId === user.coreUserId;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => form.setValue("userId", user.coreUserId || user.id, { shouldValidate: true })}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right transition-all ${
                    isSelected
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 text-start">
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {user.phone}
                    </p>
                  </div>
                  {user.activeSubscriptionsCount > 0 && (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600">
                      {user.activeSubscriptionsCount} اشتراك
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        {form.formState.errors.userId && (
          <p className="text-sm text-destructive">
            {form.formState.errors.userId.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
