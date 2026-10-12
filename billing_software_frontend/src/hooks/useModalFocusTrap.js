import { useEffect } from "react";
import { setDeletePinModalState } from "../utils/deletePinModalState";

const FOCUSABLE_SELECTOR = [
  "input:not([type='hidden']):not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/**
 * Keeps keyboard focus inside an open modal.
 *
 * Some global shortcuts / page elements (for example the main sidebar
 * "Quick Search Menus" box) can steal focus while a delete-confirmation
 * modal is open. This hook makes sure the modal keeps focus:
 *
 *  - Focuses `initialFocusRef` (usually the PIN input) as soon as the modal
 *    opens, retrying a few times so it wins regardless of when the underlying
 *    page tries to grab focus.
 *  - If focus ever lands outside `containerRef` (the modal card), it is pulled
 *    back into the modal.
 *
 * @param {boolean} active  Whether the modal is currently open.
 * @param {React.RefObject<HTMLElement>} containerRef  The modal card element.
 * @param {React.RefObject<HTMLElement>} [initialFocusRef]  Preferred element to focus first.
 */
export default function useModalFocusTrap(active, containerRef, initialFocusRef) {
  useEffect(() => {
    if (!active) return;

    const getContainer = () => containerRef?.current || null;
    const sidebar = document.querySelector("[data-app-sidebar]");
    const previousSidebarInert = sidebar?.inert ?? false;
    const previousAriaHidden = sidebar?.getAttribute("aria-hidden");

    if (sidebar) {
      if (sidebar.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      sidebar.inert = true;
      sidebar.setAttribute("aria-hidden", "true");
    }
    setDeletePinModalState(true);

    const getInitialTarget = () => {
      const preferred = initialFocusRef?.current;
      if (preferred && !preferred.disabled) return preferred;
      const container = getContainer();
      if (!container) return null;
      return container.querySelector(FOCUSABLE_SELECTOR);
    };

    const focusInitial = () => {
      const target = getInitialTarget();
      if (target && document.activeElement !== target) {
        try {
          target.focus();
        } catch {
          /* ignore focus failures */
        }
      }
    };

    // Retry so the modal wins even if the page steals focus slightly later
    // (e.g. right after the action-menu portal unmounts).
    const timers = [
      setTimeout(focusInitial, 0),
      setTimeout(focusInitial, 60),
      setTimeout(focusInitial, 200),
    ];

    const handleFocusIn = (event) => {
      const container = getContainer();
      if (!container) return;
      if (!container.contains(event.target)) {
        focusInitial();
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => {
      timers.forEach((t) => clearTimeout(t));
      document.removeEventListener("focusin", handleFocusIn);
      if (sidebar) {
        sidebar.inert = previousSidebarInert;
        if (previousAriaHidden === null) {
          sidebar.removeAttribute("aria-hidden");
        } else {
          sidebar.setAttribute("aria-hidden", previousAriaHidden);
        }
      }
      setDeletePinModalState(false);
    };
  }, [active, containerRef, initialFocusRef]);
}
