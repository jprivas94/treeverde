import { useState, useMemo } from 'react';

const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function DatePickerModal({ value, onSelect, onClose }) {
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    return { firstDay, totalDays };
  }, [viewYear, viewMonth]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const selectedStr = value ? `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}` : null;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (day) => {
    const selected = new Date(viewYear, viewMonth, day);
    onSelect(selected);
    onClose();
  };

  const handleToday = () => {
    const now = new Date();
    onSelect(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    onClose();
  };

  const handleClear = () => {
    onSelect(null);
    onClose();
  };

  const days = [];
  for (let i = 0; i < daysInMonth.firstDay; i++) {
    days.push(<div key={`empty-${i}`} />);
  }
  for (let d = 1; d <= daysInMonth.totalDays; d++) {
    const dayStr = `${viewYear}-${viewMonth}-${d}`;
    const isToday = dayStr === todayStr;
    const isSelected = dayStr === selectedStr;

    days.push(
      <button
        key={d}
        type="button"
        onClick={() => handleDayClick(d)}
        className={`w-9 h-9 rounded-full text-sm font-medium transition flex items-center justify-center ${
          isSelected
            ? 'bg-emerald-600 text-white shadow-md'
            : isToday
            ? 'bg-emerald-100 text-emerald-700 font-bold'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del mes */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold text-gray-900">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-0 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="w-9 h-8 flex items-center justify-center text-[11px] font-bold text-gray-400 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Cuadrícula de días */}
        <div className="grid grid-cols-7 gap-0">
          {days}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleToday}
            className="flex-1 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition"
          >
            Hoy
          </button>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
            >
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
