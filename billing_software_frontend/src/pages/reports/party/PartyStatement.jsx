import { User } from "lucide-react";
import ReportPlaceholder from "../../../components/reports/ReportPlaceholder";

export default function PartyStatement() {
  return (
    <ReportPlaceholder
      title="Party Statement"
      icon={<User size={19} />}
    />
  );
}
