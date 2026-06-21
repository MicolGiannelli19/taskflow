import { Input, Label } from 'taskflow'

export const Default = () => (
  <div style={{ display: 'grid', gap: 8, width: 280 }}>
    <Label htmlFor="board-name">Board name</Label>
    <Input id="board-name" placeholder="e.g. Product roadmap" />
  </div>
)

export const WithValue = () => (
  <div style={{ width: 280 }}>
    <Input defaultValue="alice@example.com" />
  </div>
)

export const Disabled = () => (
  <div style={{ width: 280 }}>
    <Input placeholder="Disabled field" disabled />
  </div>
)

export const Types = () => (
  <div style={{ display: 'grid', gap: 10, width: 280 }}>
    <Input type="email" placeholder="you@example.com" />
    <Input type="password" defaultValue="secret123" />
    <Input type="number" defaultValue={42} />
  </div>
)
