import { BookOpen } from "lucide-react";
import ReportPlaceholder from "../../../components/reports/ReportPlaceholder";

export default function DayBook() {
  return (
    <ReportPlaceholder
      title="Day Book"
      icon={<BookOpen size={19} />}
    />
  );
}
