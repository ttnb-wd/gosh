"use client";

import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";

export interface DateTimePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  label: string;
  required?: boolean;
  minDate?: Date;
  placeholderText?: string;
  className?: string;
  wrapperClassName?: string;
  showValidationError?: boolean;
  validationMessage?: string;
}

/**
 * Reusable GOSH-themed DateTimePicker component
 * Used across Admin Dashboard for consistent date/time selection
 */
export default function DateTimePicker({
  selected,
  onChange,
  label,
  required = false,
  minDate,
  placeholderText = "Select date and time",
  className = "",
  wrapperClassName = "",
  showValidationError = false,
  validationMessage = "",
}: DateTimePickerProps) {
  return (
    <div className={wrapperClassName}>
      <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <DatePicker
          selected={selected}
          onChange={onChange}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="MMMM d, yyyy h:mm aa"
          className={`w-full rounded-lg border border-[#d4af37]/30 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-[#1f1a14] transition-colors hover:border-[#d4af37]/50 focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:hover:border-[#d4af37]/40 dark:focus:border-[#d4af37] ${className}`}
          wrapperClassName="w-full"
          calendarClassName="gosh-datepicker"
          placeholderText={placeholderText}
          required={required}
          minDate={minDate}
          popperPlacement="bottom-start"
        />
        <Calendar className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#d4af37]" />
      </div>
      {showValidationError && validationMessage && (
        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
          {validationMessage}
        </p>
      )}
    </div>
  );
}
