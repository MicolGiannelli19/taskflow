import { Badge } from 'taskflow'

export const Variants = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
    <Badge>Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
  </div>
)

export const Statuses = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
    <Badge>In progress</Badge>
    <Badge variant="secondary">Backlog</Badge>
    <Badge variant="destructive">Blocked</Badge>
    <Badge variant="outline">Done</Badge>
  </div>
)
