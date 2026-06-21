import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectSeparator,
} from 'taskflow'

// SelectSeparator draws a divider between options or groups.
export const Open = () => (
  <div style={{ width: 220, minHeight: 200 }}>
    <Select defaultOpen defaultValue="medium">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectSeparator />
        <SelectItem value="none">No priority</SelectItem>
      </SelectContent>
    </Select>
  </div>
)
