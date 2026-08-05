import { useState, useRef, useEffect, useMemo } from 'react';
import { getCloudinaryThumb } from '../utils/images';

export default function SearchableUserSelect({
  value,
  onChange,
  users,
  placeholder = 'Seleccionar usuario...',
  filter,
  disabled = false,
  size = 'default'
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
          className={'w-full ' + sizeClasses + ' border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white cursor-pointer pr-8' + (disabled ? ' opacity-60 cursor-not-allowed' : '')}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {selectedUser && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-gray-300 hover:text-gray-500 text-xs leading-none p-0.5"
              title="Limpiar seleccion"
            >
              &times;
            </button>
          )}
          <svg
            className={'w-3.5 h-3.5 text-gray-400 transition-transform ' + (open ? 'rotate-180' : '')}
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
          className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden animate-fade-scale-in"
          role="listbox"
        >
          {filteredUsers.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 text-center">
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
                  className={'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition hover:bg-emerald-50 ' + (value === u.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700')}
                >
                  {u.profileImage ? (
                    <img src={getCloudinaryThumb(u.profileImage, 64)} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" loading="lazy" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-gray-300 text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                      {u.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
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
