import { Calculator } from "lucide-react";
import ReportPlaceholder from "../../../components/reports/ReportPlaceholder";

export default function BillWiseProfit() {
  return (
    <ReportPlaceholder
      title="Bill Wise Profit"
      icon={<Calculator size={19} />}
    />
  );
}
