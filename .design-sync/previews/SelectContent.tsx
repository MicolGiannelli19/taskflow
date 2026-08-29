import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'taskflow'

// SelectContent is the popover panel that holds the options when open.
export const Open = () => (
  <div style={{ width: 220, minHeight: 180 }}>
    <Select defaultOpen defaultValue="doing">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todo">To do</SelectItem>
        <SelectItem value="doing">In progress</SelectItem>
        <SelectItem value="review">In review</SelectItem>
        <SelectItem value="done">Done</SelectItem>
      </SelectContent>
    </Select>
  </div>
)
