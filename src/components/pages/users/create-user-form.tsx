import { ToastMessage } from "@/components/global/ToastMessage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import useCreateUserForm from "@/hooks/useCreateUserForm";
import type { CreateUserSchemaType } from "@/lib/validations/createUserSchema";
import { createUser } from "@/utils/fetchUsersData";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export function CreateUserForm() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useCreateUserForm();

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateUserSchemaType) => createUser(data),
    onSuccess: () => {
      ToastMessage("تم إنشاء المستخدم بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate({ to: "/users" });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const message =
        err?.response?.data?.error?.message || "حدث خطأ أثناء إنشاء المستخدم";
      ToastMessage(message, "error");
    },
  });

  const isActive = watch("isActive");

  const onSubmit = (data: CreateUserSchemaType) => {
    mutate(data);
  };

  return (
    <div className="mx-auto w-full max-w-2xl" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>إنشاء مستخدم جديد</CardTitle>
          <CardDescription>
            أدخل بيانات المستخدم الجديد لإنشاء حسابه في التطبيق
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fullName">الاسم الكامل</FieldLabel>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="أدخل الاسم الكامل"
                  {...register("fullName")}
                  aria-invalid={errors.fullName ? "true" : "false"}
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="phoneE164">رقم الهاتف</FieldLabel>
                <Input
                  id="phoneE164"
                  type="tel"
                  dir="ltr"
                  placeholder="+966500000000"
                  {...register("phoneE164")}
                  aria-invalid={errors.phoneE164 ? "true" : "false"}
                  className="text-left"
                />
                {errors.phoneE164 && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.phoneE164.message}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="email">
                  البريد الإلكتروني (اختياري)
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  placeholder="user@example.com"
                  {...register("email")}
                  aria-invalid={errors.email ? "true" : "false"}
                  className="text-left"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="isActive">حالة الحساب</FieldLabel>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {isActive ? "نشط" : "غير نشط"}
                    </span>
                    <Switch
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={(checked) =>
                        setValue("isActive", checked)
                      }
                    />
                  </div>
                </div>
              </Field>

              <Field>
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري إنشاء المستخدم...
                    </>
                  ) : (
                    "إنشاء المستخدم"
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
