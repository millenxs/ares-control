import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  variant?: "card" | "transparent";
  className?: string;
  children: ReactNode;
}

export function Panel({
  title,
  subtitle,
  badge,
  variant = "card",
  className = "",
  children,
}: PanelProps) {
  return (
    <section
      className={`panel panel-${variant} ${className}`.trim()}
      aria-label={title}
    >
      <header className="panel-header">
        <div>
          <h2 className="panel-title">{title}</h2>
          {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
        </div>
        {badge ? <div>{badge}</div> : null}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

interface BadgeProps {
  tone?: "neutral" | "mars" | "amber" | "dark";
  children: ReactNode;
}

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "dark";
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`.trim()}
      {...props}
    />
  );
}
