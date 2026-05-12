import React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "soft-primary" | "icon" | "icon-sm" | "page";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  as?: any;
}

export const Button = React.forwardRef<HTMLElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      as: Component = "button",
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      danger: "btn-danger",
      ghost: "btn-ghost",
      "soft-primary": "btn-soft-primary",
      icon: "btn-icon",
      "icon-sm": "btn-icon-sm",
      page: "btn-page",
    };

    const sizeClasses = {
      xs: "btn-xs",
      sm: "btn-sm",
      md: "", // Default is h-11 in base classes
      lg: "h-14 px-8",
    };

    return (
      <Component
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          isLoading && "cursor-wait opacity-80",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            {size !== "xs" && <span>Processing...</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </Component>
    );
  }
);

Button.displayName = "Button";
