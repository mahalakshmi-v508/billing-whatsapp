export default function Settings() {
  return (
    <div className="max-w-xl bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Settings</h2>

      <input className="w-full p-3 border mb-3 rounded" placeholder="Shop Name" />
      <input className="w-full p-3 border mb-3 rounded" placeholder="GST Number" />

      <button className="bg-indigo-600 text-white px-4 py-2 rounded">
        Save
      </button>
    </div>
  );
}