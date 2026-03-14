import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "full-screen";
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

export function Loader({
  variant = "default",
  size = "md",
  label,
  className,
  ...props
}: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Loader2
          className={cn(
            "animate-spin text-primary",
            sizeClasses[size],
            "relative z-10"
          )}
        />
        <div
          className={cn(
            "absolute inset-0 animate-ping opacity-20 bg-primary rounded-full",
            sizeClasses[size]
          )}
        />
      </div>
      {label && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {label}
        </p>
      )}
    </div>
  );

  if (variant === "full-screen") {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
          className
        )}
        {...props}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-center p-8", className)}
      {...props}
    >
      {content}
    </div>
  );
}
