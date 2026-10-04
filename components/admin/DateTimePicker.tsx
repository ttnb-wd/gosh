"use client";

import React, { useId } from "react";
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
  const id = useId();
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className="studio-field-label">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <DatePicker
          id={id}
          ariaInvalid={showValidationError ? "true" : undefined}
          ariaDescribedBy={showValidationError ? `${id}-error` : undefined}
          selected={selected}
          onChange={onChange}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="MMMM d, yyyy h:mm aa"
          className={`w-full rounded-lg border border-line bg-surface px-4 py-2.5 pr-10 text-sm font-medium text-ink transition-colors hover:border-line focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20      ${className}`}
          wrapperClassName="w-full"
          calendarClassName="gosh-datepicker"
          placeholderText={placeholderText}
          required={required}
          minDate={minDate}
          popperPlacement="bottom-start"
        />
        <Calendar className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
      </div>
      {showValidationError && validationMessage && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-destructive">
          {validationMessage}
        </p>
      )}
    </div>
  );
}
