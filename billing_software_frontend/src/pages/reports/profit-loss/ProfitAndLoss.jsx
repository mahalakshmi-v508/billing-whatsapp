import { TrendingUp } from "lucide-react";
import ReportPlaceholder from "../../../components/reports/ReportPlaceholder";

export default function ProfitAndLoss() {
  return (
    <ReportPlaceholder
      title="Profit And Loss"
      icon={<TrendingUp size={19} />}
    />
  );
}
