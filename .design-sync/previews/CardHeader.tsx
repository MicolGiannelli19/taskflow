import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'taskflow'

// CardHeader groups the title and description at the top of a Card.
export const InCard = () => (
  <Card style={{ width: 320 }}>
    <CardHeader>
      <CardTitle>Product roadmap</CardTitle>
      <CardDescription>Plan the next two sprints.</CardDescription>
    </CardHeader>
    <CardContent>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>
        12 tickets across 3 columns.
      </p>
    </CardContent>
  </Card>
)
