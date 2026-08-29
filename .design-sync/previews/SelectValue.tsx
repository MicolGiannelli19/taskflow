import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'taskflow'

// SelectValue shows the current selection, or a placeholder when empty.
export const Selected = () => (
  <div style={{ width: 220 }}>
    <Select defaultValue="high">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="high">High</SelectItem>
      </SelectContent>
    </Select>
  </div>
)

export const WithPlaceholder = () => (
  <div style={{ width: 220 }}>
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Choose priority…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="high">High</SelectItem>
      </SelectContent>
    </Select>
  </div>
)
