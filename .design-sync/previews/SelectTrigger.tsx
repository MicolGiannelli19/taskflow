import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'taskflow'

// SelectTrigger is the clickable control that opens the dropdown.
export const Default = () => (
  <div style={{ width: 220 }}>
    <Select defaultValue="doing">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todo">To do</SelectItem>
        <SelectItem value="doing">In progress</SelectItem>
        <SelectItem value="done">Done</SelectItem>
      </SelectContent>
    </Select>
  </div>
)
