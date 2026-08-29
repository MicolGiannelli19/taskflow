import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from 'taskflow'

export const TaskCard = () => (
  <Card style={{ width: 320 }}>
    <CardHeader>
      <CardTitle>Design the onboarding flow</CardTitle>
      <CardDescription>Sketch the first-run experience for new workspaces.</CardDescription>
    </CardHeader>
    <CardContent>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
        Cover the empty state, the sample board, and the invite step. Keep it to three screens.
      </p>
    </CardContent>
    <CardFooter style={{ justifyContent: 'space-between' }}>
      <Badge variant="secondary">In progress</Badge>
      <Button size="sm">Open</Button>
    </CardFooter>
  </Card>
)

export const Summary = () => (
  <Card style={{ width: 320 }}>
    <CardHeader>
      <CardTitle>Product roadmap</CardTitle>
      <CardDescription>12 tickets · 3 columns</CardDescription>
    </CardHeader>
    <CardContent>
      <p style={{ margin: 0, fontSize: 14 }}>
        Most active work sits in the “In Progress” column this week.
      </p>
    </CardContent>
  </Card>
)
