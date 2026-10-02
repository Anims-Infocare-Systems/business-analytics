import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";

export default function DebouncedSearchInput({
  value = "",
  onChange,
  onEnter,
  placeholder = "Search...",
  className = "sa-search-input",
  wrapperClassName = "",
  debounceMs = 250,
  disabled = false,
  showClear = true,
  icon = true,
  autoFocus = false,
  style = {},
  inputStyle = {},
  id,
  title,
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const inputRef = useRef(null);

  // Sync external prop changes (e.g. on reset or filter apply)
  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  // Debounced parent notification
  useEffect(() => {
    if (localValue === (value || "")) return;
    const handler = setTimeout(() => {
      if (onChange) onChange(localValue);
    }, debounceMs);
    return () => clearTimeout(handler);
  }, [localValue, debounceMs, onChange, value]);

  const handleClear = useCallback((e) => {
    if (e) e.stopPropagation();
    setLocalValue("");
    if (onChange) onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      if (onChange) onChange(localValue);
      if (onEnter) onEnter(localValue);
    } else if (e.key === "Escape") {
      handleClear(e);
    }
  }, [localValue, onChange, onEnter, handleClear]);

  return (
    <div
      className={wrapperClassName || "sa-search-wrapper"}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", ...style }}
    >
      {icon && <Search className="sa-search-icon-inside" size={13} style={{ flexShrink: 0 }} />}
      <input
        ref={inputRef}
        id={id}
        type="text"
        title={title}
        autoFocus={autoFocus}
        className={className}
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={{
          ...inputStyle,
          paddingRight: showClear && localValue ? "24px" : undefined,
        }}
      />
      {showClear && localValue && !disabled && (
        <button
          type="button"
          tabIndex={-1}
          className="sa-search-clear-btn"
          style={{
            position: "absolute",
            right: "6px",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px",
            color: "#94a3b8",
            zIndex: 2,
          }}
          onClick={handleClear}
          title="Clear search"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
