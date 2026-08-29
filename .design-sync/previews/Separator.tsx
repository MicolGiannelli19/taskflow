import { Separator } from 'taskflow'

export const Horizontal = () => (
  <div style={{ width: 280 }}>
    <div style={{ fontSize: 14, fontWeight: 600 }}>Board settings</div>
    <Separator style={{ margin: '12px 0' }} />
    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
      Manage members, columns, and visibility.
    </div>
  </div>
)

export const Vertical = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 20 }}>
    <span style={{ fontSize: 13 }}>Boards</span>
    <Separator orientation="vertical" />
    <span style={{ fontSize: 13 }}>Members</span>
    <Separator orientation="vertical" />
    <span style={{ fontSize: 13 }}>Settings</span>
  </div>
)
