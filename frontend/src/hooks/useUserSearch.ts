import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import instance from "../api/axios";

export interface UserSuggestion {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

/** Matches the endpoint's own minimum — below this it refuses the query. */
export const MIN_SEARCH_LENGTH = 2;

/** Keystrokes settle for this long before a request goes out. */
const DEBOUNCE_MS = 250;

/**
 * Users matching what's been typed, for the invite typeahead.
 *
 * The term is debounced so typing an address doesn't fire a request per
 * character, and results are cached per term by React Query — backspacing
 * through a word re-renders from cache instead of refetching.
 */
export function useUserSearch(term: string) {
  const [debounced, setDebounced] = useState(term);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [term]);

  const trimmed = debounced.trim();
  const enabled = trimmed.length >= MIN_SEARCH_LENGTH;

  const query = useQuery({
    queryKey: ["user-search", trimmed],
    queryFn: () =>
      instance
        .get<UserSuggestion[]>("/users/search", { params: { q: trimmed } })
        .then((r) => r.data),
    enabled,
  });

  return {
    ...query,
    /** True once the debounce has caught up and a search actually ran. */
    isSearching: enabled,
    /** The term the current results belong to. */
    searchedTerm: trimmed,
  };
}
