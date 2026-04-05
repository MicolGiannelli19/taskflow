import type { ColumnType } from "../../../types";

interface ColumnSelectorProps {
  columns: ColumnType[];
  value: string;
  onChange: (columnId: string) => void;
}

export default function ColumnSelector({ columns, value, onChange }: ColumnSelectorProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select column</option>
      {columns.map((col) => (
        <option key={col.id} value={col.id}>
          {col.name}
        </option>
      ))}
    </select>
  );
}
