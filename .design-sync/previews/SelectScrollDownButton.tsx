import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'taskflow'

const people = [
  'Alice Nguyen', 'Bob Martinez', 'Cara Singh', 'Dan Okoro', 'Eve Larsson',
  'Finn Walsh', 'Grace Kim', 'Hugo Diaz', 'Ivy Chen', 'Jack Rowe',
  'Kira Patel', 'Liam Ford',
]

// SelectScrollDownButton appears at the bottom of an overflowing dropdown,
// letting the user scroll further. Forced here with a short, item-heavy menu.
export const Overflowing = () => (
  <div style={{ width: 220, minHeight: 200 }}>
    <Select defaultOpen defaultValue="Alice Nguyen">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent style={{ maxHeight: 150 }}>
        {people.map((p) => (
          <SelectItem key={p} value={p}>
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)
