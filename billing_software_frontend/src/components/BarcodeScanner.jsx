import BarcodeScanner from "react-qr-barcode-scanner";

export default function Scanner({ onScan }) {
  return (
    <BarcodeScanner
      onUpdate={(err, result) => {
        if (result) onScan(result.text);
      }}
      style={{ width: "100%" }}
    />
  );
}