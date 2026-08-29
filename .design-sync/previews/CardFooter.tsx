import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Badge } from 'taskflow'

// CardFooter holds actions or metadata at the bottom of a Card.
export const InCard = () => (
  <Card style={{ width: 320 }}>
    <CardHeader>
      <CardTitle>Design the onboarding flow</CardTitle>
    </CardHeader>
    <CardContent>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>
        Keep it to three screens.
      </p>
    </CardContent>
    <CardFooter style={{ justifyContent: 'space-between' }}>
      <Badge variant="secondary">In progress</Badge>
      <Button size="sm">Open</Button>
    </CardFooter>
  </Card>
)
