import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthPageShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AuthPageShell({
  title,
  description,
  children,
  footer,
  className,
}: AuthPageShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className={cn("w-full max-w-md space-y-6", className)}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        {footer ? (
          <div className="text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}
