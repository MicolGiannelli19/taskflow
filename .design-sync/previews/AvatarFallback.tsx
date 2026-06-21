import { Avatar, AvatarFallback } from 'taskflow'

// AvatarFallback shows when no image is set or the image fails to load.
export const Initials = () => (
  <Avatar>
    <AvatarFallback>AN</AvatarFallback>
  </Avatar>
)
