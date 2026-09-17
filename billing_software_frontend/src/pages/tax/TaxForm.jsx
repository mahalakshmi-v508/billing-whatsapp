import { useState } from "react";

export default function TaxForm() {
  const [tax, setTax] = useState({
    name: "",
    percent: "",
  });

  return (
    <div className="max-w-xl bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Add Tax</h2>

      <input
        placeholder="Tax Name (GST, CGST...)"
        className="w-full p-3 border mb-3 rounded"
        onChange={(e) => setTax({ ...tax, name: e.target.value })}
      />

      <input
        placeholder="Tax %"
        className="w-full p-3 border mb-3 rounded"
        onChange={(e) => setTax({ ...tax, percent: e.target.value })}
      />

      <button className="bg-blue-600 text-white px-4 py-2 rounded w-full">
        Save Tax
      </button>
    </div>
  );
}