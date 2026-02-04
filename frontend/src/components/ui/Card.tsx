import * as React from "react"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  collapsible?: boolean
  defaultOpen?: boolean
  headerRight?: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, collapsible, defaultOpen = true, headerRight, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    const hasHeader = title || headerRight

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-border bg-card p-6 shadow-sm",
          className
        )}
        {...props}
      >
        {hasHeader && (
          <div
            className={cn(
              "flex items-center justify-between",
              collapsible && "cursor-pointer select-none",
              children && isOpen && "mb-5"
            )}
            onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
          >
            <div className="flex items-center gap-3">
              {collapsible && (
                <ChevronDown
                  size={18}
                  className={cn(
                    "text-muted-foreground transition-transform duration-200",
                    !isOpen && "-rotate-90"
                  )}
                />
              )}
              {title && (
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
              )}
            </div>
            {headerRight && (
              <div onClick={(e) => e.stopPropagation()}>
                {headerRight}
              </div>
            )}
          </div>
        )}
        {(!collapsible || isOpen) && children}
      </div>
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
export default Card
