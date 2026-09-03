import { ShoppingCart } from "lucide-react";
import ReportPlaceholder from "../../../components/reports/ReportPlaceholder";

export default function Purchase() {
  return (
    <ReportPlaceholder
      title="Purchase"
      icon={<ShoppingCart size={19} />}
      notes="Connect the purchase data source here."
    />
  );
}
