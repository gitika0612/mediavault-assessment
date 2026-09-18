import { useEffect, useState } from "react";

// Lets a component pick a different layout on narrow screens, the same way a
// media query would, when the change is structural and CSS alone can't do it.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const update = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}
