import { AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Alert = {
  alert_id: string;
  alert_type: string;
  severity: string;
  learner_name: string;
  learner_id: string;
  concept_name: string;
  evidence: string;
  recommended_action: string;
  created_at?: string;
};

export function EducatorAlertCard({ alert }: { alert: Alert }) {
  const ready = alert.alert_type.includes("Advanced");
  return (
    <Card className="transition hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
        {ready ? <Sparkles className="mt-1 h-5 w-5 text-emerald-600" /> : <AlertTriangle className="mt-1 h-5 w-5 text-amber-600" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{alert.alert_type}</h3>
            <span className="badge">{alert.severity}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{alert.learner_name} / {alert.concept_name}</p>
          {alert.created_at && <p className="mt-1 text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</p>}
          <p className="mt-3 text-sm text-muted-foreground"><span className="font-medium text-foreground">Evidence:</span> {alert.evidence}</p>
          <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Teacher action:</span> {alert.recommended_action}</p>
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
