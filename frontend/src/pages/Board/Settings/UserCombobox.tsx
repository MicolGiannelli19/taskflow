import { useId, useRef, useState, type KeyboardEvent } from "react";
import UserAvatar from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserSearch, MIN_SEARCH_LENGTH, type UserSuggestion } from "@/hooks/useUserSearch";
import styles from "./BoardSettings.module.css";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Already on the board — offering them would only earn a 409. */
  excludeIds: Set<string>;
  describedBy?: string;
  inputId: string;
}

/**
 * Email field with a name-matching typeahead.
 *
 * You can still type a full address and ignore the list — the suggestions are
 * a shortcut for "I know their name, not their email", not a required step.
 * Built by hand rather than with a combobox library: none is installed, and
 * the ARIA pattern is small enough to write correctly.
 */
export default function UserCombobox({
  label,
  value,
  onChange,
  excludeIds,
  describedBy,
  inputId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const listId = useId();
  const blurTimer = useRef<number | undefined>(undefined);

  const { data = [], isSearching, searchedTerm } = useUserSearch(value);
  const suggestions = data.filter((u) => !excludeIds.has(u.id));

  // Nothing to show until a search has actually run for what's been typed.
  const ready = isSearching && searchedTerm === value.trim();
  const showList = open && ready;
  const showEmpty = showList && suggestions.length === 0;

  const choose = (user: UserSuggestion) => {
    onChange(user.email);
    setOpen(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
      return;
    }
    if (!showList || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      // Only swallow Enter when a suggestion is actually highlighted; otherwise
      // it submits the form, which is what someone typing a full address wants.
      e.preventDefault();
      choose(suggestions[highlighted]);
    }
  };

  return (
    <div className={styles.addField}>
      <Label htmlFor={inputId}>{label}</Label>

      <div className={styles.comboWrap}>
        <Input
          id={inputId}
          type="email"
          value={value}
          placeholder="Name or email"
          autoComplete="off"
          autoFocus
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlighted >= 0 ? `${listId}-${highlighted}` : undefined
          }
          aria-describedby={describedBy}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onFocus={() => setOpen(true)}
          // A click on an option would otherwise be lost to the blur that
          // precedes it, so closing waits a tick.
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={handleKeyDown}
        />

        {showEmpty && (
          <p className={styles.comboEmpty}>No people match “{searchedTerm}”.</p>
        )}

        {showList && suggestions.length > 0 && (
          <ul className={styles.comboList} id={listId} role="listbox">
            {suggestions.map((user, index) => (
              <li
                key={user.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === highlighted}
                className={
                  index === highlighted ? styles.comboOptionActive : styles.comboOption
                }
                onMouseEnter={() => setHighlighted(index)}
                onMouseDown={() => {
                  // Beat the blur timer: mousedown fires before blur.
                  window.clearTimeout(blurTimer.current);
                }}
                onClick={() => choose(user)}
              >
                <UserAvatar
                  name={user.name}
                  email={user.email}
                  avatar={user.avatar}
                  size="sm"
                />
                <span className={styles.comboName}>{user.name?.trim() || user.email}</span>
                <span className={styles.comboEmail}>{user.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {value.trim().length > 0 && value.trim().length < MIN_SEARCH_LENGTH && (
        <span className={styles.comboHint}>
          Keep typing to search by name.
        </span>
      )}
    </div>
  );
}
