import { useNavigate } from "react-router-dom";

export default function TaxList() {
  const navigate = useNavigate();

  const taxes = [
    { name: "GST 18%", percent: 18 },
    { name: "GST 5%", percent: 5 },
  ];

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-bold">Taxes</h1>

        <button
          onClick={() => navigate("/tax/add")}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Tax
        </button>
      </div>

      <table className="w-full bg-white rounded shadow">
        <thead className="bg-gray-200">
          <tr>
            <th>Name</th>
            <th>Percentage</th>
          </tr>
        </thead>

        <tbody>
          {taxes.map((t, i) => (
            <tr key={i} className="text-center">
              <td>{t.name}</td>
              <td>{t.percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}