import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-card-border bg-card p-5 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: "primary" | "success" | "warning" | "accent";
}) {
  const accentColors = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    accent: "text-accent bg-accent/10",
  };

  return (
    <Card className="flex items-start gap-4">
      <div className={cn("rounded-lg p-2.5", accentColors[accent])}>{icon}</div>
      <div>
        <p className="text-sm text-muted">{title}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
      </div>
    </Card>
  );
}
