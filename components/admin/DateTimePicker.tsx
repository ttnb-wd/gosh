"use client";

import React, { useId, useRef, useState } from "react";
import DatePicker, { CalendarContainer } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";
import { businessCalendarDate, businessCalendarSelection, formatBusinessPicker, formatBusinessSchedule, parseBusinessPicker } from "@/lib/business-schedule";

function BusinessCalendarContainer({ children, ...props }: React.ComponentProps<typeof CalendarContainer>) {
  // Place the string-based time panel beside the calendar, exactly where the
  // library's time panel sits, rather than in its footer children wrapper.
  return <CalendarContainer {...props}>{React.Children.map(children, child => {
    if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(child) && child.props.className === "react-datepicker__children-container") return child.props.children;
    if (React.isValidElement<{ className?: string }>(child) && child.props.className?.split(" ").includes("react-datepicker__navigation--next")) {
      return React.cloneElement(child, { className: `${child.props.className} react-datepicker__navigation--next--with-time` });
    }
    return child;
  })}</CalendarContainer>;
}

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
  businessSchedule?: boolean;
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
  businessSchedule = false,
}: DateTimePickerProps) {
  const id = useId();
  const picker = useRef<DatePicker>(null);
  const [rawInput, setRawInput] = useState<string | null>(null);
  const businessDay = businessSchedule ? businessCalendarDate(selected || new Date()) : null;
  const businessTime = selected ? formatBusinessSchedule(selected).slice(11) : "00:00";
  function clearInputError() {
    if (picker.current?.input instanceof HTMLInputElement) picker.current.input.setCustomValidity("");
  }
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className="studio-field-label">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <DatePicker
          ref={picker}
          id={id}
          ariaInvalid={showValidationError ? "true" : undefined}
          ariaDescribedBy={showValidationError ? `${id}-error` : undefined}
          selected={businessSchedule && selected ? businessDay : selected}
          openToDate={businessDay || undefined}
          onChange={(date: Date | null) => {
            setRawInput(null);
            clearInputError();
            onChange(businessSchedule && date ? businessCalendarSelection(date, businessTime) : date);
          }}
          value={businessSchedule ? rawInput ?? (selected ? formatBusinessPicker(selected) : "") : undefined}
          onChangeRaw={businessSchedule ? (event) => {
            if (!event || !(event.target instanceof HTMLInputElement)) return;
            // Own the text parsing so DST gaps cannot normalize a typed time.
            event.preventDefault();
            const value = event.target.value;
            const date = parseBusinessPicker(value);
            setRawInput(value);
            event.target.setCustomValidity(value && !date ? "Enter a valid date and time, for example October 6, 2026 9:00 AM." : "");
            onChange(date);
          } : undefined}
          showTimeSelect={!businessSchedule}
          shouldCloseOnSelect={!businessSchedule}
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="MMMM d, yyyy h:mm aa"
          className={`w-full rounded-lg border border-line bg-surface px-4 py-2.5 pr-10 text-sm font-medium text-ink transition-colors hover:border-line focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20      ${className}`}
          wrapperClassName="w-full"
          calendarClassName="gosh-datepicker"
          calendarContainer={businessSchedule ? BusinessCalendarContainer : undefined}
          placeholderText={placeholderText}
          required={required}
          minDate={businessSchedule && minDate ? businessCalendarDate(minDate) : minDate}
          popperPlacement="bottom-start"
          portalId={businessSchedule ? "gosh-business-schedule" : undefined}
        >
          {businessSchedule && businessDay && (
            // Keep the existing time-panel classes/design. Values are plain
            // HH:mm strings: a phone's DST cannot remove or shift a time slot.
            <div className="react-datepicker__time-container">
              <div className="react-datepicker__header react-datepicker__header--time">
                <div className="react-datepicker-time__header">Time</div>
              </div>
              <div className="react-datepicker__time">
                <div className="react-datepicker__time-box">
                  <ul className="react-datepicker__time-list" aria-label="Myanmar time" style={{ height: 215 }} ref={list => {
                    const selectedTime = list?.querySelector<HTMLElement>(".react-datepicker__time-list-item--selected");
                    if (list && selectedTime) list.scrollTop = selectedTime.offsetTop - list.offsetTop - list.clientHeight / 2;
                  }}>
                    {Array.from({ length: 96 }, (_, index) => {
                      const time = `${String(Math.floor(index / 4)).padStart(2, "0")}:${String(index % 4 * 15).padStart(2, "0")}`;
                      return (
                        <li key={time} className={`react-datepicker__time-list-item ${time === businessTime ? "react-datepicker__time-list-item--selected" : ""}`}>
                          <button type="button" className="w-full" aria-pressed={time === businessTime} onClick={() => {
                            setRawInput(null);
                            clearInputError();
                            onChange(businessCalendarSelection(businessDay, time));
                            picker.current?.setOpen(false);
                          }}>{time}</button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </DatePicker>
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
