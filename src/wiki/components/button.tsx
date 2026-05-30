import { createClassName } from "../utils.ts";
import { type ButtonHTMLAttributes, type ReactNode } from "react";

const solidStyles: Record<Variant, string> = {
    default: "bg-white text-black hover:bg-white/95 focus-visible:outline-white",
    primary: "bg-primary text-primary-foreground hover:brightness-120 focus-visible:outline-primary",
    secondary: "bg-secondary text-secondary-foreground hover:brightness-120 focus-visible:outline-secondary",
    success: "bg-success text-success-foreground hover:brightness-120 focus-visible:outline-success",
    info: "bg-info text-info-foreground hover:brightness-120 focus-visible:outline-info",
    warning: "bg-warning text-warning-foreground hover:brightness-120 focus-visible:outline-warning",
    danger: "bg-destructive text-destructive-foreground hover:brightness-120 focus-visible:outline-destructive",
};

const outlineStyles: Record<Variant, string> = {
    default: "border border-white/50 text-white/80 hover:bg-white/5 hover:text-white/90 focus-visible:outline-white",
    primary: "border border-primary text-primary hover:bg-primary/10 focus-visible:outline-primary",
    secondary: "border border-secondary text-secondary hover:bg-secondary/10 focus-visible:outline-secondary",
    success: "border border-success text-success hover:bg-success/10 focus-visible:outline-success",
    info: "border border-info text-info hover:bg-info/10 focus-visible:outline-info",
    warning: "border border-warning text-warning hover:bg-warning/10 focus-visible:outline-warning",
    danger: "border border-destructive text-destructive hover:bg-destructive/10 focus-visible:outline-destructive",
};

const roundedStyles: Record<Rounded, string> = {
    none: "rounded-none",
    rounded: "rounded-md",
    full: "rounded-full",
};

type Variant = "default" | "primary" | "secondary" | "success" | "info" | "warning" | "danger";
type Rounded = "none" | "rounded" | "full";
type Outline = "none" | "solid" | "dashed" | "dotted";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    outlined?: Outline;
    rounded?: Rounded;
    children: ReactNode;
}

export const Button = (props: ButtonProps) => {

    const buttonStyle = createClassName(
        "px-4 py-2 text-sm font-medium transition cursor-pointer",
        "focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50",
        roundedStyles[props.rounded ?? "none"],
        props.outlined
            ? outlineStyles[props.variant ?? "default"]
            : solidStyles[props.variant ?? "default"],
        props.outlined ? "outline-offset-1" : "outline-offset-3",
        props.outlined ? ("border-"+ props.outlined) : "",
        props.className
    );

    return (
        <button {...props} className={buttonStyle}>
            {props.children}
        </button>
    )
}
