import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'taskflow'

// SelectItem is a single selectable option; the active one shows a checkmark.
export const Open = () => (
  <div style={{ width: 220, minHeight: 180 }}>
    <Select defaultOpen defaultValue="medium">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="urgent" disabled>
          Urgent (locked)
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
)
