import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle, Trash2, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <Trash2 size={28} className="text-red-600" />,
          iconBg: "bg-red-50",
          confirmBtn: "bg-red-600 hover:bg-red-700 text-white border-none",
        };
      case "warning":
        return {
          icon: <AlertTriangle size={28} className="text-amber-600" />,
          iconBg: "bg-amber-50",
          confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white border-none",
        };
      default:
        return {
          icon: <XCircle size={28} className="text-primary" />,
          iconBg: "bg-primary/10",
          confirmBtn: "bg-primary hover:bg-primary-dark text-white border-none",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-[400px]"
    >
      <div className="flex flex-col items-center p-6 sm:p-8 text-center">
        {/* Icon */}
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm", styles.iconBg)}>
          {styles.icon}
        </div>

        {/* Content */}
        <h3 className="text-[20px] font-bold text-slate-900 mb-2 leading-tight">
          {title}
        </h3>
        <p className="text-[14px] text-slate-500 font-medium leading-relaxed mb-8">
          {message}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full sm:flex-1 h-12 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 border-none transition-all active:scale-[0.98]"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            isLoading={isLoading}
            className={cn("w-full sm:flex-1 h-12 rounded-xl font-bold shadow-sm transition-all active:scale-[0.98]", styles.confirmBtn)}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
