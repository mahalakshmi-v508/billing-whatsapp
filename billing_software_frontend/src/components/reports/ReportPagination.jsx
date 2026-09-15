import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

const footerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  padding: "8px 14px",
  background: "#fff",
  borderTop: "1px solid #e2e8f0",
  fontSize: 12.5,
  color: "#475569",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const infoStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const pagerStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const navBtnStyle = {
  width: 30,
  height: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#475569",
  cursor: "pointer",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const navBtnDisabled = {
  ...navBtnStyle,
  opacity: 0.4,
  cursor: "not-allowed",
};

const pageBtnStyle = {
  minWidth: 30,
  height: 30,
  padding: "0 6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
  background: "#2563eb",
  border: "1px solid #2563eb",
  color: "#fff",
  fontWeight: 700,
  fontSize: 12.5,
  cursor: "pointer",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

/**
 * Footer/pagination bar matching the Reports reference design:
 *   Showing X to Y of Z entries    Rows: [ 10 ▼ ]    [ < ] [ 1 ] [ > ]
 *
 * pure UI-only: parent still slices the rows and passes `total`, `page`,
 * `rowsPerPage` plus the two change callbacks.
 */
export default function ReportPagination({
  total,
  page,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}) {
  if (!total || total <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * rowsPerPage + 1;
  const to = Math.min(safePage * rowsPerPage, total);

  return (
    <div style={footerStyle}>
      <div style={infoStyle}>
        <span>
          Showing <strong style={{ color: "#1e1b4b" }}>{from}</strong> to{" "}
          <strong style={{ color: "#1e1b4b" }}>{to}</strong> of{" "}
          <strong style={{ color: "#1e1b4b" }}>{total}</strong> entries
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>Rows:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange && onRowsPerPageChange(Number(e.target.value))}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              padding: "3px 6px",
              fontSize: 12,
              background: "#fff",
              color: "#334155",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              outline: "none",
            }}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </span>
      </div>

      <div style={pagerStyle}>
        <button
          type="button"
          title="Previous page"
          disabled={safePage <= 1}
          onClick={() => onPageChange && onPageChange(safePage - 1)}
          style={safePage <= 1 ? navBtnDisabled : navBtnStyle}
        >
          <ChevronLeft size={16} />
        </button>
        <button type="button" style={pageBtnStyle}>
          {safePage}
        </button>
        <button
          type="button"
          title="Next page"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange && onPageChange(safePage + 1)}
          style={safePage >= totalPages ? navBtnDisabled : navBtnStyle}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}