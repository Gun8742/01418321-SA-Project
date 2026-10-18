type NavigationGuard = () => boolean;
const guards = new Set<NavigationGuard>();
let installed = false;
const indexKey = "saWorkforceHistoryIndex";

function historyIndex(state: unknown): number | null {
  if (typeof state !== "object" || state === null || !(indexKey in state))
    return null;
  const index = state[indexKey];
  return typeof index === "number" && Number.isInteger(index) ? index : null;
}
function indexedState(state: unknown, index: number) {
  const preserved = typeof state === "object" && state !== null ? state : {};
  return { ...preserved, [indexKey]: index };
}

// Track entries without adding sentinels so cancelled traversals retain Forward history.
export function installHistoryGuard() {
  if (installed) return;
  installed = true;
  let currentIndex = historyIndex(history.state) ?? 0;
  let restoring = false;
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  replace(indexedState(history.state, currentIndex), "");
  history.pushState = function pushIndexedState(state: unknown, unused, url) {
    push(indexedState(state, currentIndex + 1), unused, url);
    currentIndex++;
  };
  history.replaceState = function replaceIndexedState(
    state: unknown,
    unused,
    url,
  ) {
    replace(indexedState(state, currentIndex), unused, url);
  };
  function handleTraversal(event: PopStateEvent) {
    const destination = historyIndex(event.state);
    if (destination === null) return;
    if (restoring) {
      event.stopImmediatePropagation();
      restoring = false;
      return;
    }
    const distance = currentIndex - destination;
    if (distance && [...guards].some((allow) => !allow())) {
      event.stopImmediatePropagation();
      restoring = true;
      history.go(distance);
      return;
    }
    currentIndex = destination;
  }
  window.addEventListener("popstate", handleTraversal, { capture: true });
}

export function registerHistoryGuard(allow: NavigationGuard) {
  installHistoryGuard();
  guards.add(allow);
  return () => {
    guards.delete(allow);
  };
}
