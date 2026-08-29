import { Card, CardHeader, CardTitle, CardDescription } from 'taskflow'

// CardDescription is the muted supporting text under a CardTitle.
export const InCard = () => (
  <Card style={{ width: 320 }}>
    <CardHeader>
      <CardTitle>Invite teammates</CardTitle>
      <CardDescription>
        Add people by email to start collaborating on this board.
      </CardDescription>
    </CardHeader>
  </Card>
)
