/**
 * Route curtain: an eclipse iris that closes over the page before a
 * navigation, holds while the next page loads, and opens once it is ready.
 * <RouteCurtain /> (components/common) renders it; this module is the shared
 * state between it, links and pages.
 *
 * Pages that need more than a render to look right (the events atlas waits
 * for its art) call `holdCurtain()` on mount and release when ready.
 */

type Controller = { close(pathname: string): Promise<void> };

let controller: Controller | null = null;
let holds = 0;
const releaseListeners = new Set<() => void>();

/** Called by <RouteCurtain /> on mount; returns its unregister. */
export function registerCurtain(next: Controller) {
  controller = next;
  return () => {
    if (controller === next) controller = null;
  };
}

/**
 * Closes the curtain, then runs `go` (the actual navigation). Same-page and
 * external links, or no mounted curtain, navigate straight away.
 */
export async function curtainNavigate(href: string, go: () => void) {
  const url = new URL(href, window.location.href);
  if (!controller || url.origin !== window.location.origin || url.pathname === window.location.pathname) {
    go();
    return;
  }
  await controller.close(url.pathname);
  go();
}

/** Keeps the curtain shut until the returned release is called (idempotent). */
export function holdCurtain(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
    releaseListeners.forEach((fn) => fn());
  };
}

export const curtainHeld = () => holds > 0;

export function onCurtainRelease(fn: () => void) {
  releaseListeners.add(fn);
  return () => {
    releaseListeners.delete(fn);
  };
}
