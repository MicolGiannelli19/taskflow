import { Textarea } from 'taskflow'

export const Default = () => (
  <div style={{ width: 300 }}>
    <Textarea placeholder="Describe the ticket…" />
  </div>
)

export const WithValue = () => (
  <div style={{ width: 300 }}>
    <Textarea defaultValue={"Cover the empty state and the invite step.\nKeep the copy short."} />
  </div>
)

export const Disabled = () => (
  <div style={{ width: 300 }}>
    <Textarea placeholder="Disabled" disabled />
  </div>
)
