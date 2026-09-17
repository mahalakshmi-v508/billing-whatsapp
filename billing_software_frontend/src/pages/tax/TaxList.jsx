import { useNavigate } from "react-router-dom";
import { Plus, Percent } from "lucide-react";
import {
  TableContainer,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
} from "../../components/table";

export default function TaxList() {
  const navigate = useNavigate();

  const taxes = [
    { name: "GST 0%", percent: 0 },
    { name: "GST 5%", percent: 5 },
    { name: "GST 12%", percent: 12 },
    { name: "GST 18%", percent: 18 },
    { name: "GST 28%", percent: 28 },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🏷️</span> Tax Slabs
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage GST tax rates and calculation slabs</p>
        </div>

        <button
          onClick={() => navigate("/tax/add")}
          className="app-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus size={16} />
          Add Tax Slab
        </button>
      </div>

      <TableContainer title="Tax Rates" badge={taxes.length}>
        <Table>
          <Thead>
            <Tr>
              <Th className="w-14">#</Th>
              <Th>Tax Name / Description</Th>
              <Th align="right" className="w-40">Rate / Percentage</Th>
            </Tr>
          </Thead>

          <Tbody>
            {taxes.map((t, i) => (
              <Tr key={i}>
                <Td className="font-semibold text-slate-500">{i + 1}</Td>
                <Td>
                  <span className="font-bold text-slate-800">{t.name}</span>
                </Td>
                <Td align="right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {t.percent}%
                  </span>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </div>
  );
}