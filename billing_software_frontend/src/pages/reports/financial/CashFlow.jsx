import { ArrowUpDown } from "lucide-react";
import ReportPlaceholder from "../../../components/reports/ReportPlaceholder";

export default function CashFlow() {
  return (
    <ReportPlaceholder
      title="Cash Flow"
      icon={<ArrowUpDown size={19} />}
    />
  );
}
