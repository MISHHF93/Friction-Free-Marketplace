import type { ComponentType, HTMLAttributes, ReactNode, SVGProps } from "react";

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type ComponentTone = "default" | "commerce" | "trust" | "ai" | "safety" | "premium" | "warning" | "risk";

export type ComponentSize = "sm" | "md" | "lg";

export type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon?: IconComponent;
  badge?: ReactNode;
  current?: boolean;
  disabled?: boolean;
};

export type ActionItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: IconComponent;
  tone?: ComponentTone;
  disabled?: boolean;
};

export interface ThemeableComponentProps {
  className?: string;
}

export interface WithChildren {
  children?: ReactNode;
}

export interface BaseDivProps extends HTMLAttributes<HTMLDivElement>, ThemeableComponentProps {}
