import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, Play, Search } from "lucide-react";

const ITEMS = [
  { id: 1, name: "rice", type: "product" },
  { id: 2, name: "Sugar", type: "product" },
  { id: 3, name: "Wheat", type: "product" },
  { id: 4, name: "Groundnut Oil", type: "product" },
  { id: 5, name: "Installation", type: "service" },
  { id: 6, name: "Repair Service", type: "service" },
  { id: 7, name: "AMC Service", type: "service" },
];

const FILTERS = [
  { id: "all", label: "All Items" },
  { id: "product", label: "Products" },
  { id: "service", label: "Services" },
];

export default function SelectItemsForReminder() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  const visibleItems = useMemo(() => {
    return ITEMS.filter((item) => {
      const typeOk = filter === "all" || item.type === filter;
      const nameOk = item.name.toLowerCase().includes(search.trim().toLowerCase());
      return typeOk && nameOk;
    });
  }, [filter, search]);

  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((item) => selected.includes(item.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const keep = new Set(selected.filter((id) => !visibleItems.some((i) => i.id === id)));
      setSelected([...keep]);
    } else {
      setSelected([...new Set([...selected, ...visibleItems.map((i) => i.id)])]);
    }
  };

  const toggleItem = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden min-h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-[22px] font-bold text-gray-900 truncate">
            Select Items for Reminder
          </h2>
          <button
            type="button"
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-[15px] flex-shrink-0"
          >
            <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <Play size={12} fill="currentColor" strokeWidth={0} className="ml-0.5" />
            </span>
            See how it works
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          title="Close"
          className="w-9 h-9 rounded-full bg-gray-300 hover:bg-gray-400 text-white flex items-center justify-center transition-colors flex-shrink-0"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl mx-auto px-6 py-6 flex flex-col">
        {/* Filter + Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[16px] font-medium text-gray-700">Filter by:</span>
            <div className="flex items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-4 h-[34px] text-[14px] font-semibold transition-colors ${
                    filter === f.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex-shrink-0">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items"
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-full text-[14px] text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Items list */}
        <div className="mt-7">
          {/* Select all header */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              className="w-5 h-5 cursor-pointer shrink-0 rounded-[4px]"
              style={{ accentColor: "#2563eb" }}
            />
            <h3 className="text-[15px] font-bold text-gray-800 tracking-wide">ALL ITEMS</h3>
          </div>
          <div className="h-px bg-gray-200 mt-3" />

          {/* Rows */}
          {visibleItems.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-gray-400">No items found</p>
          ) : (
            visibleItems.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 py-3 ${
                  idx !== visibleItems.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="w-5 h-5 cursor-pointer shrink-0 rounded-[4px]"
                  style={{ accentColor: "#2563eb" }}
                />
                <span className="text-[16px] text-gray-800">{item.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}