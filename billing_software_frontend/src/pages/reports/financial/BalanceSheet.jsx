import { Layers } from "lucide-react";
import ReportPlaceholder from "../../../components/reports/ReportPlaceholder";

export default function BalanceSheet() {
  return (
    <ReportPlaceholder
      title="Balance Sheet"
      icon={<Layers size={19} />}
    />
  );
}
