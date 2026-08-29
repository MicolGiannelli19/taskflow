import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from 'taskflow'

// SelectGroup bundles related options, usually under a SelectLabel.
export const Open = () => (
  <div style={{ width: 230, minHeight: 220 }}>
    <Select defaultOpen defaultValue="alice">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Engineering</SelectLabel>
          <SelectItem value="alice">Alice Nguyen</SelectItem>
          <SelectItem value="bob">Bob Martinez</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Design</SelectLabel>
          <SelectItem value="cara">Cara Singh</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
)
