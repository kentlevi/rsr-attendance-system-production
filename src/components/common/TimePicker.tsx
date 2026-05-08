import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface TimePickerProps {
  value: string; // HH:mm format, 24-hour
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const safeValue = value || "00:00";
  const [hourStr, minStr] = safeValue.split(":");
  let hourNum = parseInt(hourStr || "0", 10);
  const ampm = hourNum >= 12 ? "PM" : "AM";
  
  if (hourNum > 12) hourNum -= 12;
  if (hourNum === 0) hourNum = 12;
  
  const displayHour = hourNum.toString().padStart(2, "0");
  const displayMin = (minStr || "00").padStart(2, "0");

  const displayTime = `${displayHour}:${displayMin} ${ampm}`;

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

  const handleHourChange = (newHour: string) => {
    let h = parseInt(newHour, 10);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    onChange(`${h.toString().padStart(2, '0')}:${displayMin}`);
  };

  const handleMinChange = (newMin: string) => {
    onChange(`${hourStr.padStart(2, '0')}:${newMin.padStart(2, '0')}`);
  };

  const handleAmPmChange = (newAmPm: string) => {
    if (newAmPm === ampm) return;
    let h = parseInt(hourStr || "0", 10);
    if (newAmPm === "PM" && h < 12) h += 12;
    if (newAmPm === "AM" && h >= 12) h -= 12;
    onChange(`${h.toString().padStart(2, '0')}:${displayMin}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  // Create refs to auto-scroll to selected time
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minScrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    [hourScrollRef, minScrollRef].forEach((ref) => {
      const selected = ref.current?.querySelector(
        '[data-selected="true"]',
      ) as HTMLElement | null;

      if (ref.current && selected) {
        ref.current.scrollTop =
          selected.offsetTop -
          ref.current.clientHeight / 2 +
          selected.clientHeight / 2;
      }
    });
  }, [isOpen, displayHour, displayMin]);

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "control-field pr-10 cursor-pointer flex items-center justify-between text-left",
          isOpen && "control-open"
        )}
      >
        <span className="font-medium text-slate-800">{displayTime}</span>
        <Clock className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isOpen ? "text-[#0B7A4B]" : "text-[#64748B]")} size={16} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
            className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-white border border-border rounded-xl z-[9999] p-2 flex gap-1 h-[240px] transform-gpu"
          >
            <div 
              ref={hourScrollRef} 
              className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar"
              style={{ scrollbarWidth: "none" }}
            >
              {hours.map(h => {
                const isSelected = displayHour === h;
                return (
                  <button
                    key={`h-${h}`}
                    type="button"
                    onClick={() => handleHourChange(h)}
                    data-selected={isSelected}
                    className={cn(
                      "control-option justify-center px-2 text-center",
                      isSelected ? "control-option-selected" : "text-slate-700"
                    )}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
            
            <div className="w-[1px] bg-slate-100 my-2"></div>
            
            <div 
              ref={minScrollRef} 
              className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 pl-1 custom-scrollbar"
              style={{ scrollbarWidth: "none" }}  
            >
              {minutes.map(m => {
                const isSelected = displayMin === m;
                return (
                  <button
                    key={`m-${m}`}
                    type="button"
                    onClick={() => handleMinChange(m)}
                    data-selected={isSelected}
                    className={cn(
                      "control-option justify-center px-2 text-center",
                      isSelected ? "control-option-selected" : "text-slate-700"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            <div className="w-[1px] bg-slate-100 my-2"></div>

            <div className="flex-1 flex flex-col gap-1 pl-1">
              <button
                 type="button"
                 onClick={() => handleAmPmChange("AM")}
                 className={cn(
                   "control-option justify-center px-2 text-center",
                   ampm === "AM" ? "control-option-selected" : "text-slate-700"
                 )}
              >
                AM
              </button>
              <button
                 type="button"
                 onClick={() => handleAmPmChange("PM")}
                 className={cn(
                   "control-option justify-center px-2 text-center",
                   ampm === "PM" ? "control-option-selected" : "text-slate-700"
                 )}
              >
                PM
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
