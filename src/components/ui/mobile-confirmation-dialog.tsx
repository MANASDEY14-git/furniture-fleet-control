import * as React from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface MobileConfirmationDialogProps {
  trigger: React.ReactNode
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm: () => void
  onCancel?: () => void
}

export function MobileConfirmationDialog({
  trigger,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel
}: MobileConfirmationDialogProps) {
  const isMobile = useIsMobile()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className={cn(
        isMobile && "fixed inset-x-4 bottom-4 top-auto translate-y-0 rounded-xl max-w-none"
      )}>
        <AlertDialogHeader className={isMobile ? "text-center pb-4" : ""}>
          <AlertDialogTitle className={isMobile ? "text-xl" : ""}>{title}</AlertDialogTitle>
          <AlertDialogDescription className={isMobile ? "text-base" : ""}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={cn(
          isMobile && "flex-col-reverse gap-3 sm:flex-col-reverse"
        )}>
          <AlertDialogCancel 
            onClick={onCancel}
            className={cn(
              isMobile && "h-12 text-base w-full"
            )}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={cn(
              isMobile && "h-12 text-base w-full",
              variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}