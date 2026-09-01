import { useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import ReportsNavDropdown from "./ReportsNavDropdown";
import { findReportByPath } from "./reportNavigation";
import { recordReportView } from "./reportUsage";

/**
 * Module-scoped guard so a single page entry is counted exactly once, even
 * under React StrictMode (dev double-mount + double effect) and across
 * re-renders. Keyed by React Router's `location.key`, which is unique per
 * navigation and stable for the same page entry. A new navigation produces a
 * new key → one more view, exactly as intended.
 */
let lastRecordedNavigationKey = null;

/**
 * ReportsLayout wraps every report page with the Reports navigation dropdowns
 * (left: all reports selector; right: dynamic Frequently Used) at the top and
 * the report content below it. It lives INSIDE the MainLayout content area, so
 * the global sidebar remains completely untouched.
 *
 * Usage counting happens HERE, at the route/page level (not in any dropdown
 * click handler), so a report visit is recorded regardless of how the user
 * reaches it: main dropdown, Frequently Used dropdown, existing sidebar,
 * direct route navigation, or any other valid route.
 */
export default function ReportsLayout() {
  const location = useLocation();

  useEffect(() => {
    const current = findReportByPath(location.pathname);
    if (!current) return;
    // One page entry (unique navigation key) = one view count.
    if (lastRecordedNavigationKey === location.key) return;
    lastRecordedNavigationKey = location.key;
    recordReportView(current.slug);
  }, [location.key, location.pathname]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ReportsNavDropdown />
      <div style={{ flex: 1, minHeight: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}
