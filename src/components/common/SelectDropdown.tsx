import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[] | string[];
  className?: string;
  placeholder?: string;
}

export function SelectDropdown({ value, onChange, options, className, placeholder }: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const formattedOptions: SelectOption[] = options.map(opt =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  const selectedOption = formattedOptions.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder || value;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (scrollRef.current) {
          const selectedEl = scrollRef.current.querySelector('[data-selected="true"]') as HTMLElement;
          if (selectedEl) {
            scrollRef.current.scrollTop = selectedEl.offsetTop - scrollRef.current.clientHeight / 2 + selectedEl.clientHeight / 2;
          }
        }
      }, 50);
    }
  }, [isOpen]);

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "control-field cursor-pointer flex items-center justify-between text-left",
          isOpen && "control-open",
          !selectedOption && placeholder ? "text-slate-400" : "text-[#1a1a1a]"
        )}
      >
        <span className="font-medium truncate mr-2">{displayValue}</span>
        <ChevronDown className={cn("text-[#64748B] transition-transform duration-200 shrink-0", isOpen && "rotate-180 text-[#0B7A4B]")} size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
            className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white border border-border rounded-xl z-[9999] p-2 transform-gpu"
          >
            <div 
              ref={scrollRef} 
              className="max-h-[240px] overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar"
              style={{ scrollbarWidth: "none" }}
            >
              {formattedOptions.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    data-selected={isSelected}
                    className={cn(
                      "control-option justify-between text-left",
                      isSelected ? "control-option-selected" : "text-slate-700"
                    )}
                  >
                    <span className="truncate pr-4">{opt.label}</span>
                    {isSelected && <Check size={16} className="text-[#0B7A4B] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
