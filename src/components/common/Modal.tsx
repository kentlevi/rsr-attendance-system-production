import React, { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-2xl",
}: ModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div id="global-modal-overlay" className="fixed inset-0 z-[10000] flex sm:items-center justify-center p-0 sm:p-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            className={`relative w-full h-fit flex flex-col min-h-[100dvh] sm:min-h-0 sm:h-auto sm:max-h-[85vh] ${maxWidth} bg-white rounded-none sm:rounded-3xl shadow-2xl`}
          >
            {/* Header */}
            <div className="px-5 py-4 sm:px-8 sm:py-6 border-b border-border flex items-center justify-between shrink-0 sticky top-0 bg-white z-[12] sm:static sm:z-auto sm:rounded-t-3xl">
              <h3 className="text-[17px] sm:text-[20px] font-bold text-[#1a1a1a] tracking-tight">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div id="modal-scroll-container" className="flex-1 sm:overflow-y-auto custom-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-5 py-4 sm:px-8 sm:py-6 bg-white sm:bg-slate-50/50 border-t border-border shrink-0 mt-auto sticky bottom-0 z-[12] sm:static sm:z-auto sm:rounded-b-3xl">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return null;
}
