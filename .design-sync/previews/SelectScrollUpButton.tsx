import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'taskflow'

const people = [
  'Alice Nguyen', 'Bob Martinez', 'Cara Singh', 'Dan Okoro', 'Eve Larsson',
  'Finn Walsh', 'Grace Kim', 'Hugo Diaz', 'Ivy Chen', 'Jack Rowe',
  'Kira Patel', 'Liam Ford',
]

// SelectScrollUpButton appears at the top of an overflowing dropdown once the
// user has scrolled down. Selecting an item far down the list opens the menu
// scrolled, surfacing the up button.
export const Overflowing = () => (
  <div style={{ width: 220, minHeight: 200 }}>
    <Select defaultOpen defaultValue="Liam Ford">
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
