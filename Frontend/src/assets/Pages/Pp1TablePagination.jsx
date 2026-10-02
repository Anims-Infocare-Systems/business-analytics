import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pp1TablePagination({
  currentPage = 1,
  pageSize = 25,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = "",
  style = {}
}) {
  const isAll = pageSize === "all" || pageSize >= 999999;
  const numericSize = isAll ? totalItems : Number(pageSize) || 25;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / numericSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIdx = totalItems === 0 ? 0 : isAll ? 1 : (validPage - 1) * numericSize + 1;
  const endIdx = isAll ? totalItems : Math.min(validPage * numericSize, totalItems);

  return (
    <div
      className={`pp1-pagination-bar ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px",
        padding: "8px 14px",
        background: "#ffffff",
        borderTop: "1px solid rgba(0, 0, 0, 0.08)",
        fontSize: "12px",
        color: "#64748b",
        userSelect: "none",
        ...style
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span>Showing</span>
        <strong style={{ color: "#0f172a", fontWeight: 700 }}>{startIdx}</strong>
        <span>to</span>
        <strong style={{ color: "#0f172a", fontWeight: 700 }}>{endIdx}</strong>
        <span>of</span>
        <strong style={{ color: "var(--pp1-blue, #2563eb)", fontWeight: 700 }}>
          {totalItems.toLocaleString()}
        </strong>
        <span>entries</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const val = e.target.value === "all" ? "all" : Number(e.target.value);
              onPageSizeChange?.(val);
              onPageChange?.(1);
            }}
            style={{
              padding: "3px 6px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#334155",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "5px",
              cursor: "pointer",
              outline: "none"
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            <option value="all">All</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            type="button"
            disabled={validPage <= 1 || isAll}
            onClick={() => onPageChange?.(validPage - 1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "26px",
              height: "26px",
              borderRadius: "5px",
              border: "1px solid #cbd5e1",
              background: validPage <= 1 || isAll ? "#f1f5f9" : "#ffffff",
              color: validPage <= 1 || isAll ? "#94a3b8" : "#334155",
              cursor: validPage <= 1 || isAll ? "not-allowed" : "pointer",
              transition: "all 0.15s ease"
            }}
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          <span style={{ fontSize: "11px", fontWeight: 700, padding: "0 6px", color: "#0f172a" }}>
            {validPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={validPage >= totalPages || isAll}
            onClick={() => onPageChange?.(validPage + 1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "26px",
              height: "26px",
              borderRadius: "5px",
              border: "1px solid #cbd5e1",
              background: validPage >= totalPages || isAll ? "#f1f5f9" : "#ffffff",
              color: validPage >= totalPages || isAll ? "#94a3b8" : "#334155",
              cursor: validPage >= totalPages || isAll ? "not-allowed" : "pointer",
              transition: "all 0.15s ease"
            }}
            title="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
