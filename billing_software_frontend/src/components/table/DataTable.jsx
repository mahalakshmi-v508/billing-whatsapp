export function Table({ children, className = "", ...props }) {
  return (
    <table
      className={`w-full text-left text-xs border-collapse font-sans ${className}`}
      {...props}
    >
      {children}
    </table>
  );
}

export function TableHeader({ children, className = "", ...props }) {
  return (
    <thead
      className={`bg-slate-50 border-b border-slate-200 text-slate-700 font-bold select-none ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableHead({
  children,
  align = "left",
  showFilter = false,
  className = "",
  noBorder = false,
  ...props
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
      ? "text-center"
      : "text-left";

  return (
    <th
      className={`py-3 px-3.5 ${
        noBorder ? "" : "border-r border-slate-200"
      } whitespace-nowrap text-slate-700 font-bold ${alignClass} ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableBody({ children, className = "", ...props }) {
  return (
    <tbody className={`divide-y divide-slate-100 font-medium ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  onClick,
  active = false,
  className = "",
  ...props
}) {
  return (
    <tr
      onClick={onClick}
      className={`group transition-colors duration-150 text-slate-700 ${
        active
          ? "bg-blue-50/70"
          : "hover:bg-[#eaedf2]"
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  align = "left",
  noBorder = false,
  className = "",
  ...props
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
      ? "text-center"
      : "text-left";

  return (
    <td
      className={`py-3.5 px-3.5 ${
        noBorder ? "" : "border-r border-slate-200"
      } whitespace-nowrap text-slate-700 ${alignClass} ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

// Aliases for shorthand syntax
export const Thead = TableHeader;
export const Th = TableHead;
export const Tbody = TableBody;
export const Tr = TableRow;
export const Td = TableCell;
