import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RouteErrorProps {
  error: unknown;
  reset: () => void;
}

export function RouteError({ error, reset }: RouteErrorProps) {
  return (
    <div className="flex h-screen items-center justify-center gap-4 p-6 text-center">
      <div className="flex w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold tracking-tight">حدث خطأ غير متوقع</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "تعذر تحميل الصفحة. يرجى المحاولة مرة أخرى لاحقاً."}
        </p>
        <div className="mt-4 flex gap-4">
          <Button variant="default" onClick={() => reset()}>
            إعادة المحاولة
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            العودة لتسجيل الدخول
          </Button>
        </div>
      </div>
    </div>
  );
}
