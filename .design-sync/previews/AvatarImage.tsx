import { Avatar, AvatarImage, AvatarFallback } from 'taskflow'

const img =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%239B6B2F'/%3E%3Ctext x='40' y='52' font-size='34' fill='%23FAFAF7' text-anchor='middle' font-family='sans-serif'%3EAN%3C/text%3E%3C/svg%3E"

// AvatarImage renders inside Avatar; it shows once the image loads, otherwise
// the sibling AvatarFallback is shown.
export const Loaded = () => (
  <Avatar>
    <AvatarImage src={img} alt="Alice Nguyen" />
    <AvatarFallback>AN</AvatarFallback>
  </Avatar>
)
