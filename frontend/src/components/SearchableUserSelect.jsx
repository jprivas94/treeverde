import { useState, useRef, useEffect, useMemo } from 'react';
import Avatar from './Avatar';

export default function SearchableUserSelect({
  value,
  onChange,
  users,
  placeholder = 'Seleccionar usuario...',
  filter,
  disabled = false,
  size = 'default',
  // Búsqueda en servidor (opcional): se llama con el texto tras el debounce
  // para que el padre refresque `users` con usersApi.getAll({ search }).
  onSearch,
  searchDebounceMs = 250
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedUser = useMemo(() => users.find((u) => u.id === value), [users, value]);

  const filteredUsers = useMemo(() => {
    let list = filter ? users.filter(filter) : users;
    if (!search.trim()) {
      // Show all available users when focused (no search text yet)
      return isFocused ? list : [];
    }
    const q = search.toLowerCase().trim();
    return list.filter((u) => u.name.toLowerCase().startsWith(q));
  }, [users, search, filter, isFocused]);

  // Búsqueda en servidor con debounce (solo si el padre la provee)
  useEffect(() => {
    if (!onSearch) return undefined;
    const t = setTimeout(() => onSearch(search.trim()), searchDebounceMs);
    return () => clearTimeout(t);
  }, [search, onSearch, searchDebounceMs]);

  // Control open state based on focus
  useEffect(() => {
    if (isFocused) {
      setOpen(true);
    } else {
      setOpen(false);
      setSearch('');
    }
  }, [isFocused]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleFocus = () => {
    if (disabled) return;
    setIsFocused(true);
    setSearch('');
  };

  const handleSelect = (userId) => {
    onChange(userId);
    setIsFocused(false);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
    setIsFocused(true);
    inputRef.current?.focus();
  };

  const sizeClasses = size === 'small'
    ? 'px-2 py-1.5 text-[11px]'
    : 'px-3 py-2 text-sm';

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          value={isFocused ? search : (selectedUser?.name || '')}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          onFocus={handleFocus}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsFocused(false);
              inputRef.current?.blur();
            }
            if (e.key === 'Enter' && filteredUsers.length === 1) {
              handleSelect(filteredUsers[0].id);
              e.preventDefault();
            }
          }}
          placeholder={!selectedUser ? placeholder : undefined}
          disabled={disabled}
          className={'w-full ' + sizeClasses + ' border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-gray-800 dark:text-gray-100 cursor-pointer pr-8' + (disabled ? ' opacity-60 cursor-not-allowed' : '')}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {selectedUser && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-gray-300 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 text-xs leading-none p-0.5"
              title="Limpiar seleccion"
            >
              &times;
            </button>
          )}
          <svg
            className={'w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform ' + (open ? 'rotate-180' : '')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-fade-scale-in"
          role="listbox"
        >
          {filteredUsers.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 text-center">
              {search.trim() ? 'Sin resultados' : 'No hay usuarios disponibles'}
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto py-1">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  role="option"
                  aria-selected={value === u.id}
                  onClick={() => handleSelect(u.id)}
                  className={'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/40 ' + (value === u.id ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium' : 'text-gray-700 dark:text-gray-200')}
                >
                  <Avatar user={u} sizeClass="w-5 h-5 text-[8px]" fallbackClass="bg-gray-300 dark:bg-gray-600 text-white" />
                  <span className="truncate">{u.name}</span>
                  {value === u.id && (
                    <svg className="w-3.5 h-3.5 ml-auto text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
