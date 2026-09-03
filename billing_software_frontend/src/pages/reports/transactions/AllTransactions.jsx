import { ListOrdered } from "lucide-react";
import ReportPlaceholder from "../../../components/reports/ReportPlaceholder";

export default function AllTransactions() {
  return (
    <ReportPlaceholder
      title="All Transactions"
      icon={<ListOrdered size={19} />}
    />
  );
}
