// components/Sign-Out.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";

// ── Config ────────────────────────────────────────────────────────────────────

/** How long the user can be idle before auto sign-out (ms) */
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

/**
 * How long (ms) the tab must be hidden before we treat it as "user left".
 * This prevents signing out on normal alt-tab / switching tabs briefly.
 * Set to 0 if you want truly instant sign-out on any hide event.
 */
const HIDDEN_GRACE_MS = 30 * 1000; // 30 seconds

// ── Beacon helper ─────────────────────────────────────────────────────────────

/**
 * Invalidates the DB session via a fire-and-forget POST.
 * sendBeacon survives tab close, works when fetch would be cancelled.
 * Does NOT redirect — the client-side signOut() handles that.
 */
function sendSignoutBeacon() {
  try {
    navigator.sendBeacon("/api/signout-beacon");
  } catch {
    // sendBeacon can throw in some SSR contexts — silently ignore
  }
}

// ── SignOutButton ─────────────────────────────────────────────────────────────

export const SignOutButton = () => (
  <button
    onClick={() => signOut({ callbackUrl: "/" })}
    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
  >
    Sign Out
  </button>
);

// ── IdleTimer ─────────────────────────────────────────────────────────────────

/**
 * Handles two sign-out scenarios:
 *
 * 1. IDLE TIMEOUT — user is inactive for IDLE_TIMEOUT_MS → signOut()
 *    Activity events (mouse, keyboard, scroll, touch) reset the clock.
 *
 * 2. TAB/WINDOW CLOSE — user closes the tab or navigates away:
 *    a. `pagehide`         — most reliable cross-browser close event
 *    b. `visibilitychange` — catches backgrounding on mobile + most closes
 *    Both:
 *      - Start a HIDDEN_GRACE_MS timer → if still hidden → beacon + signOut
 *      - Cancel the timer if the user comes back (visibilityState = "visible")
 *    This avoids false sign-outs when the user just switches tabs briefly.
 *
 * Renders nothing — side-effects only.
 */
export const IdleTimer = () => {
  const { data: session } = useSession();
  const idleTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHiddenRef    = useRef(false);

  // ── Sign-out handler ──────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    if (!session) return;
    sendSignoutBeacon();           // invalidate DB session immediately
    signOut({ callbackUrl: "/" }); // redirect to login page
  }, [session]);

  // ── Idle timer reset ──────────────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(handleLogout, IDLE_TIMEOUT_MS);
  }, [handleLogout]);

  // ── Hidden grace timer ────────────────────────────────────────────────────
  const startHiddenTimer = useCallback(() => {
    if (hiddenTimerRef.current) return; // already running
    hiddenTimerRef.current = setTimeout(() => {
      // Still hidden after grace period → treat as "user left"
      handleLogout();
    }, HIDDEN_GRACE_MS);
  }, [handleLogout]);

  const cancelHiddenTimer = useCallback(() => {
    if (hiddenTimerRef.current) {
      clearTimeout(hiddenTimerRef.current);
      hiddenTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    // ── Activity events that reset the idle clock ─────────────────────────
    const ACTIVITY_EVENTS = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "pointerdown",
    ] as const;

    // ── visibilitychange: tab hidden / restored ───────────────────────────
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        isHiddenRef.current = true;
        startHiddenTimer();
      } else {
        // User came back — cancel any pending hidden-grace logout
        isHiddenRef.current = false;
        cancelHiddenTimer();
        resetIdleTimer(); // refresh idle clock on return
      }
    };

    // ── pagehide: most reliable close/navigate-away event ────────────────
    // persisted=true  → page went into bfcache (back-forward cache), not closed
    // persisted=false → page is truly being unloaded / closed
    const handlePageHide = (e: PageTransitionEvent) => {
      if (!e.persisted) {
        // True unload — beacon immediately, no grace period needed
        sendSignoutBeacon();
      }
      // If persisted, visibilitychange already fired (hidden) and grace timer
      // is running — cancel it so we don't double-logout on bfcache restore
    };

    // ── beforeunload: extra safety net for fast closes ────────────────────
    // Note: cannot reliably redirect here, beacon is best effort
    const handleBeforeUnload = () => {
      sendSignoutBeacon();
    };

    // Start idle clock
    resetIdleTimer();

    // Register all listeners
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Clean up all timers and listeners
      if (idleTimerRef.current)   clearTimeout(idleTimerRef.current);
      if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session, resetIdleTimer, startHiddenTimer, cancelHiddenTimer]);

  return null;
};