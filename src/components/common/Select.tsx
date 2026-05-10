import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type SelectOption = {
  value: string;
  label: string;
}

type SelectProps = Omit<React.ComponentPropsWithoutRef<'button'>, 'onChange'> & {
  label?: string;
  icon?: React.ElementType;
  containerClassName?: string;
  options?: SelectOption[] | string[];
  children?: React.ReactNode;
  value?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  placeholder?: string;
  openDirection?: 'up' | 'down';
}

export function Select({ 
  label, 
  icon: Icon, 
  className, 
  containerClassName,
  children, 
  options,
  value,
  onChange,
  name,
  placeholder = "Select option",
  openDirection = 'down',
  ...props 
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // Extract options from props or children
  const getOptionsFromChildren = () => {
    const extracted: SelectOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        const val = child.props.value !== undefined ? String(child.props.value) : child.props.children?.toString() || '';
        extracted.push({
          value: val,
          label: child.props.children?.toString() || val
        });
      }
    });
    return extracted;
  };

  const formattedOptions: SelectOption[] = [
    ...(options?.map(opt =>
      typeof opt === "string" 
        ? { value: opt, label: opt } 
        : { value: String(opt.value), label: String(opt.label) }
    ) || []),
    ...getOptionsFromChildren()
  ];

  // Cast both to string for comparison to avoid type mismatch issues
  const stringValue = value !== undefined && value !== null ? String(value) : "";
  const stringValueNormalized = stringValue.trim();
  const selectedOption = formattedOptions.find(opt => {
    const optVal = opt.value !== undefined && opt.value !== null ? String(opt.value) : "";
    return optVal.trim() === stringValueNormalized;
  });
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      setMenuStyle({
        position: "fixed",
        width: rect.width,
        minWidth: Math.max(rect.width, 200),
        left: rect.left,
        top: openDirection === "up" ? undefined : rect.bottom + 8,
        bottom:
          openDirection === "up"
            ? window.innerHeight - rect.top + 8
            : undefined,
        zIndex: 10000,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, openDirection]);

  const handleSelect = (val: string) => {
    if (onChange) {
      onChange({ target: { value: val, name } });
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-1.5 relative", containerClassName)} ref={dropdownRef}>
      {label && (
        <label className="text-label pl-1 leading-none mb-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <Icon 
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-hover:text-[#0B7A4B] transition-colors pointer-events-none z-10" 
            size={18} 
          />
        )}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "control-field pr-10 text-left flex items-center",
            isOpen && "control-open",
            Icon ? "pl-10" : "pl-3",
            className
          )}
          {...props}
        >
          <span className="truncate">{displayValue}</span>
        </button>
        <ChevronDown 
          size={18} 
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 text-text-muted transition-all duration-200 pointer-events-none",
            isOpen && "rotate-180 text-[#0B7A4B]",
            !isOpen && "group-hover:text-[#1a1a1a]"
          )}
        />

        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  ref={menuRef}
                  initial={{
                    opacity: 0,
                    y: openDirection === "up" ? -4 : 4,
                    scale: 0.98,
                  }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    y: openDirection === "up" ? -4 : 4,
                    scale: 0.98,
                  }}
                  transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
                  className="bg-white border border-border rounded-xl p-2 overflow-hidden transform-gpu"
                  style={menuStyle}
                >
                  <div className="max-h-[280px] overflow-y-auto flex flex-col gap-1 scrollbar-thin scrollbar-thumb-slate-200">
                    {formattedOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-text-muted text-center italic">
                        No options available
                      </div>
                    ) : (
                      formattedOptions.map((opt) => {
                        const optVal =
                          opt.value !== undefined && opt.value !== null
                            ? String(opt.value)
                            : "";
                        const isSelected =
                          optVal.trim() === stringValueNormalized;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelect(opt.value)}
                            className={cn(
                              "control-option justify-between text-left",
                              isSelected
                                ? "control-option-selected"
                                : "text-[#1a1a1a]",
                            )}
                          >
                            <span className="truncate">{opt.label}</span>
                            {isSelected && <Check size={16} strokeWidth={3} />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}
      </div>
    </div>
  );
}
