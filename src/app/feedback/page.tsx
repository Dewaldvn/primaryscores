import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackForm } from "@/components/feedback-form";

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Report bugs, flow or logic issues, things you don't like, or suggestions for the beta
          release.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send feedback</CardTitle>
          <CardDescription>
            This sends an email to the Schools Scores SA team with subject <strong>SSS Beta1 Errors</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackForm />
        </CardContent>
      </Card>
    </div>
  );
}
