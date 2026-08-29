import { Card, CardHeader, CardTitle, CardDescription } from 'taskflow'

// CardTitle is the heading element inside a CardHeader.
export const InCard = () => (
  <Card style={{ width: 320 }}>
    <CardHeader>
      <CardTitle>Design the onboarding flow</CardTitle>
      <CardDescription>Sketch the first-run experience.</CardDescription>
    </CardHeader>
  </Card>
)
