import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminMergePlaceholderPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Merge duplicates (coming later)</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        MVP ships with navigation only. A future iteration will let admins merge duplicate schools or teams
        while re-pointing fixtures and results.
      </CardContent>
    </Card>
  );
}
