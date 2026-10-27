'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DatePickerProps {
  value: string;
  onChange: (formattedDate: string) => void;
  className?: string;
}

export default function DatePicker({ value, onChange, className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse incoming value string (e.g. "24 May 2026") or default to now
  const parseDateString = (str: string): Date => {
    if (!str) return new Date();
    const parsed = new Date(str);
    return !isNaN(parsed.getTime()) ? parsed : new Date();
  };

  const selectedDate = parseDateString(value);

  // View state for browsing different months in the calendar
  const [viewYear, setViewYear] = useState<number>(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(selectedDate.getMonth());

  // Sync view state when value changes from outside
  useEffect(() => {
    const d = parseDateString(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  // Click outside listener to close the popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle month navigation
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Generate days for grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handleSelectDay = (day: number) => {
    const chosenDate = new Date(viewYear, viewMonth, day);
    const formatted = `${day} ${MONTH_NAMES[viewMonth]} ${viewYear}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  // Year range options (from 2 years ago to 10 years ahead)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 15 }, (_, i) => currentYear - 2 + i);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button (Acts like a protected, non-editable input) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-4 py-2.5 rounded-xl border border-[#1C2820]/20 bg-white text-xs font-semibold text-[#1C2820] focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all flex items-center justify-between shadow-sm hover:border-[#1C2820]/40"
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-[#2D4A3A] shrink-0" />
          <span className="truncate">{value || 'Select celebration date...'}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#1C2820]/40 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#2D4A3A]' : ''
          }`}
        />
      </button>

      {/* Floating Calendar Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 w-72 bg-white rounded-2xl shadow-xl border border-[#1C2820]/10 p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header: Month/Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-[#E9EFEA] text-[#1C2820] transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C2820]">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-transparent font-bold cursor-pointer hover:text-[#2D4A3A] focus:outline-none"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-transparent font-bold cursor-pointer hover:text-[#2D4A3A] focus:outline-none"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-[#E9EFEA] text-[#1C2820] transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[10px] font-bold text-[#1C2820]/45 uppercase py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank leading cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <span key={`blank-${i}`} className="h-8 w-8" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                    selected
                      ? 'bg-[#2D4A3A] text-white shadow-sm font-bold scale-105'
                      : today
                      ? 'border border-[#2D4A3A] text-[#2D4A3A] hover:bg-[#E9EFEA]'
                      : 'text-[#1C2820] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

