import { Card, CardHeader, CardTitle, CardContent } from 'taskflow'

// CardContent is the main body region of a Card.
export const InCard = () => (
  <Card style={{ width: 320 }}>
    <CardHeader>
      <CardTitle>Sprint summary</CardTitle>
    </CardHeader>
    <CardContent>
      <p style={{ margin: '0 0 8px', fontSize: 14 }}>
        Most active work sits in the “In Progress” column.
      </p>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>
        3 tickets are blocked and need review.
      </p>
    </CardContent>
  </Card>
)
