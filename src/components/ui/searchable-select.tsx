import { useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { Icon, type IconName } from "./icon";
import "./searchable-select.css";

export interface SearchableOption {
  value: string;
  label: string;
  /** Extra search terms, such as a name in another language. */
  keywords?: string;
}

/** Case- and diacritic-insensitive text for matching (Latin accents and Arabic harakat). */
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٰٟ]/g, "")
    .toLocaleLowerCase()
    .trim();
}

/**
 * Accessible single-select combobox (WAI-ARIA combobox with listbox popup).
 * Typing filters the options; arrows move, Enter selects, Escape restores.
 */
export function SearchableSelect({
  id,
  label,
  value,
  options,
  onChange,
  onBlur,
  placeholder,
  emptyMessage,
  resultsMessage,
  icon,
  disabled = false,
  invalid = false,
  describedBy,
  inputRef,
  name,
}: {
  id: string;
  /** Visible field label, also used to name the listbox. */
  label: string;
  value: string;
  options: readonly SearchableOption[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  emptyMessage: string;
  resultsMessage: (count: number) => string;
  icon?: IconName;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  inputRef?: Ref<HTMLInputElement>;
  name?: string;
}) {
  const listboxId = `${id}-listbox`;
  const statusId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return options;
    const starts: SearchableOption[] = [];
    const contains: SearchableOption[] = [];
    for (const option of options) {
      const haystack = normalize(`${option.label} ${option.keywords ?? ""}`);
      if (normalize(option.label).startsWith(needle)) starts.push(option);
      else if (haystack.includes(needle)) contains.push(option);
    }
    return [...starts, ...contains];
  }, [options, query]);

  function openList(initialQuery = "") {
    setQuery(initialQuery);
    const index = filteredIndexFor(initialQuery);
    setActive(index);
    setOpen(true);
  }

  function filteredIndexFor(nextQuery: string) {
    if (nextQuery) return 0;
    const index = options.findIndex((option) => option.value === value);
    return index < 0 ? 0 : index;
  }

  function choose(option: SearchableOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  function moveActive(next: number) {
    if (!filtered.length) return;
    const index = (next + filtered.length) % filtered.length;
    setActive(index);
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) openList();
      else moveActive(active + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openList();
      else moveActive(active - 1);
    } else if (event.key === "Enter") {
      if (open) {
        event.preventDefault();
        const option = filtered[active];
        if (option) choose(option);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        close();
      }
    } else if (event.key === "Tab") {
      close();
    }
  }

  return (
    <div className={`searchable-select${open ? " is-open" : ""}`}>
      <div className={`input-wrap${icon ? " input-wrap--icon" : ""} input-wrap--end`}>
        {icon && <Icon name={icon} className="input-icon" />}
        <input
          ref={inputRef}
          id={id}
          name={name}
          className="input"
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && filtered[active] ? `${id}-option-${active}` : undefined}
          aria-invalid={invalid}
          aria-describedby={[describedBy, open ? statusId : undefined].filter(Boolean).join(" ") || undefined}
          aria-required="true"
          disabled={disabled}
          placeholder={placeholder}
          value={open ? query : selected?.label ?? ""}
          onChange={(event) => {
            const next = event.target.value;
            if (!open) setOpen(true);
            setQuery(next);
            setActive(0);
          }}
          onClick={() => {
            if (!open) openList();
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // Accept an exact typed match; otherwise keep the previous selection.
            const exact = query && options.find((option) => normalize(option.label) === normalize(query));
            if (exact) onChange(exact.value);
            close();
            onBlur?.();
          }}
        />
        <Icon name="chevron" className="searchable-select__chevron" aria-hidden="true" />
      </div>
      <div className="searchable-select__popup" hidden={!open}>
        <p id={statusId} className="sr-only" role="status" aria-live="polite">
          {open ? (filtered.length ? resultsMessage(filtered.length) : emptyMessage) : ""}
        </p>
        <ul ref={listRef} id={listboxId} role="listbox" aria-label={label}>
          {filtered.map((option, index) => (
            // Keyboard selection happens on the combobox input via aria-activedescendant.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              data-index={index}
              role="option"
              aria-selected={option.value === value}
              className={index === active ? "is-active" : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.value === value && <Icon name="check" aria-hidden="true" />}
            </li>
          ))}
        </ul>
        {!filtered.length && <p className="searchable-select__empty">{emptyMessage}</p>}
      </div>
    </div>
  );
}
