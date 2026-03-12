import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

export const ToastMessage = (message: string, type: ToastType = "info") => {
  const config = {
    success: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      classNames: {
        toast: "border-primary/20 bg-primary/5",
        title: "text-primary font-medium",
        icon: "text-primary",
      },
    },
    error: {
      icon: <XCircle className="h-5 w-5" />,
      classNames: {
        toast: "border-destructive/20 bg-destructive/5",
        title: "text-destructive font-medium",
        icon: "text-destructive",
      },
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5" />,
      classNames: {
        toast: "border-third/20 bg-third/5",
        title: "text-third font-medium",
        icon: "text-third",
      },
    },
    info: {
      icon: <Info className="h-5 w-5" />,
      classNames: {
        toast: "border-muted-foreground/20 bg-muted",
        title: "text-foreground font-medium",
        icon: "text-muted-foreground",
      },
    },
  };

  const { icon, classNames } = config[type];

  toast[type](message, {
    icon,
    classNames,
  });
};
