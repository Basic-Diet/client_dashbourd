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
import useLoginForm from "@/hooks/useLoginForm";
import { useAuth } from "@/hooks/useAuth";
import { ToastMessage } from "@/components/global/ToastMessage";
import { Loader2 } from "lucide-react";
import type { LoginSchemaType } from "@/lib/validations/loginSchema";
import { useRouter } from "@tanstack/react-router";

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useLoginForm();
  const router = useRouter();

  const { login, isLoggingIn } = useAuth();

  const onSubmit = async (data: LoginSchemaType) => {
    try {
      await login(data);
      ToastMessage("تم تسجيل الدخول بنجاح", "success");
      router.navigate({ to: "/" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "فشل تسجيل الدخول";
      ToastMessage(errorMessage, "error");
    }
  };

  return (
    <div className="flex min-w-sm flex-col gap-6 md:min-w-lg">
      <Card>
        <CardHeader className="flex items-center gap-5">
          <img className="h-13 w-13" src="logo.png" alt="logo-image" />
          <div className="space-y-2">
            <CardTitle>تسجيل الدخول إلى حسابك</CardTitle>
            <CardDescription>
              أدخل بريدك الإلكتروني أدناه لتسجيل الدخول إلى حسابك
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">البريد الإلكتروني</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...register("email")}
                  aria-invalid={errors.email ? "true" : "false"}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="password">كلمة المرور</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  {...register("password")}
                  aria-invalid={errors.password ? "true" : "false"}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </Field>

              <Field>
                <Button type="submit" disabled={isLoggingIn} className="w-full">
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    "تسجيل الدخول"
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

export default LoginForm;
