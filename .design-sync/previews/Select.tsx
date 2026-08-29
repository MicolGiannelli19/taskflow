import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from 'taskflow'

export const Priority = () => (
  <div style={{ width: 220 }}>
    <Select defaultValue="medium">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="high">High</SelectItem>
      </SelectContent>
    </Select>
  </div>
)

export const Placeholder = () => (
  <div style={{ width: 220 }}>
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Assign to…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="alice">Alice Nguyen</SelectItem>
        <SelectItem value="bob">Bob Martinez</SelectItem>
      </SelectContent>
    </Select>
  </div>
)

export const Open = () => (
  <div style={{ width: 220, minHeight: 220 }}>
    <Select defaultOpen defaultValue="medium">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Priority</SelectLabel>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectSeparator />
          <SelectItem value="none">No priority</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
)
