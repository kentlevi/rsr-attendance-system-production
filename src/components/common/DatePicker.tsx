import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface DatePickerProps {
  value: string; // YYYY-MM-DD format preferred
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function DatePicker({ value, onChange, placeholder = "Select date", className, disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Parse initial date
  const dateObj = value ? new Date(value) : new Date();
  const initialYear = dateObj.getFullYear();
  const initialMonth = dateObj.getMonth();
  const initialDay = dateObj.getDate();

  const [tempYear, setTempYear] = useState(initialYear);
  const [tempMonth, setTempMonth] = useState(initialMonth);
  const [tempDay, setTempDay] = useState(initialDay);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setTempYear(d.getFullYear());
        setTempMonth(d.getMonth());
        setTempDay(d.getDate());
      }
    }
  }, [value]);

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

  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const handleSelect = (y: number, m: number, d: number) => {
    const maxDays = daysInMonth(y, m);
    const actualDay = d > maxDays ? maxDays : d;
    
    // Format as YYYY-MM-DD for consistency
    const formattedDate = `${y}-${(m + 1).toString().padStart(2, '0')}-${actualDay.toString().padStart(2, '0')}`;
    onChange(formattedDate);
  };

  const formatDateLabel = (val: string) => {
    if (!val) return placeholder;
    const d = new Date(val);
    if (isNaN(d.getTime())) return placeholder;
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 31 }, (_, i) => currentYear - 15 + i);
  const days = Array.from({ length: daysInMonth(tempYear, tempMonth) }, (_, i) => i + 1);

  // Refs for auto-scroll
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const yearScrollRef = useRef<HTMLDivElement>(null);

  // Use useLayoutEffect to set scroll positions before the browser paints
  // This prevents the "scrolling jump" from January to May
  useLayoutEffect(() => {
    if (isOpen) {
      // Sync scroll positions immediately
      const syncScroll = () => {
        [monthScrollRef, dayScrollRef, yearScrollRef].forEach(ref => {
          if (ref.current) {
            const selected = ref.current.querySelector('[data-selected="true"]') as HTMLElement;
            if (selected) {
              ref.current.scrollTop = selected.offsetTop - ref.current.clientHeight / 2 + selected.clientHeight / 2;
            }
          }
        });
      };

      syncScroll();
      // Double check after animation frame to catch edge cases with motion
      const handle = requestAnimationFrame(syncScroll);
      return () => cancelAnimationFrame(handle);
    }
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "control-field pl-10 pr-10 cursor-pointer flex items-center justify-between text-left relative",
          isOpen && "control-open",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Calendar className={cn("absolute left-3 top-1/2 -translate-y-1/2 transition-colors", isOpen ? "text-[#0B7A4B]" : "text-[#64748B]")} size={16} />
        <span className={cn("font-medium truncate", !value ? "text-text-muted" : "text-slate-800")}>
          {formatDateLabel(value)}
        </span>
        <ChevronDown className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] transition-transform duration-200", isOpen && "rotate-180 text-[#0B7A4B]")} size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className={cn(
              "absolute top-full mt-2 w-[340px] bg-white border border-border rounded-xl z-[9999] p-2 flex gap-1 h-[260px]",
              className?.includes("right") || className?.includes("left-0") ? "left-0" : "right-0 md:left-0"
            )}
          >
            {/* Month Column */}
            <div 
              ref={monthScrollRef}
              className="flex-[1.4] overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar"
              style={{ scrollbarWidth: "none" }}
            >
              {MONTHS.map((m, idx) => {
                const isSelected = tempMonth === idx;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setTempMonth(idx);
                      handleSelect(tempYear, idx, tempDay);
                    }}
                    data-selected={isSelected}
                    className={cn(
                      "control-option justify-start text-left",
                      isSelected ? "control-option-selected" : "text-slate-700"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            <div className="w-[1px] bg-slate-100 my-2"></div>

            {/* Day Column */}
            <div 
              ref={dayScrollRef}
              className="flex-1 overflow-y-auto flex flex-col gap-1 px-1 custom-scrollbar"
              style={{ scrollbarWidth: "none" }}
            >
              {days.map(d => {
                const isSelected = tempDay === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setTempDay(d);
                      handleSelect(tempYear, tempMonth, d);
                    }}
                    data-selected={isSelected}
                    className={cn(
                      "control-option justify-center px-2 text-center",
                      isSelected ? "control-option-selected" : "text-slate-700"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <div className="w-[1px] bg-slate-100 my-2"></div>

            {/* Year Column */}
            <div 
              ref={yearScrollRef}
              className="flex-1 overflow-y-auto flex flex-col gap-1 pl-1 custom-scrollbar"
              style={{ scrollbarWidth: "none" }}
            >
              {years.map(y => {
                const isSelected = tempYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setTempYear(y);
                      handleSelect(y, tempMonth, tempDay);
                    }}
                    data-selected={isSelected}
                    className={cn(
                      "control-option justify-center px-2 text-center",
                      isSelected ? "control-option-selected" : "text-slate-700"
                    )}
                  >
                    {y}
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
