import { Button } from 'taskflow'
import { Plus, Trash2 } from 'lucide-react'

export const Variants = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
    <Button>Create board</Button>
    <Button variant="secondary">Cancel</Button>
    <Button variant="destructive">Delete</Button>
    <Button variant="outline">Filter</Button>
    <Button variant="ghost">Skip</Button>
    <Button variant="link">Learn more</Button>
  </div>
)

export const Sizes = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
    <Button size="icon" aria-label="Add ticket"><Plus /></Button>
  </div>
)

export const WithIcons = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
    <Button><Plus /> New ticket</Button>
    <Button variant="destructive"><Trash2 /> Delete board</Button>
  </div>
)

export const Disabled = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button disabled>Saving…</Button>
    <Button variant="outline" disabled>Unavailable</Button>
  </div>
)
