import { Label, Input, Textarea } from 'taskflow'

export const WithInput = () => (
  <div style={{ display: 'grid', gap: 6, width: 280 }}>
    <Label htmlFor="ticket-title">Ticket title</Label>
    <Input id="ticket-title" placeholder="Short summary" />
  </div>
)

export const WithTextarea = () => (
  <div style={{ display: 'grid', gap: 6, width: 280 }}>
    <Label htmlFor="ticket-desc">Description</Label>
    <Textarea id="ticket-desc" placeholder="Add details…" />
  </div>
)
