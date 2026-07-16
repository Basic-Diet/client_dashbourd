import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

interface CatalogErrorStateProps {
  title: string;
  description: string;
  errorMessage?: string;
  onRetry: () => void;
}

export function CatalogErrorState({
  title,
  description,
  errorMessage,
  onRetry,
}: CatalogErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-right"
    >
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold text-destructive">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            {errorMessage ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {errorMessage}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onRetry}
          >
            <RefreshCwIcon className="size-3.5" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    </div>
  );
}
