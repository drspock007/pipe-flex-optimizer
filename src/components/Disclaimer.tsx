import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Engineering disclaimer card, mirrored from the shared GMC apps layout. */
const Disclaimer = () => (
  <Card className="border-destructive/50 bg-destructive/5">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base text-destructive">
        <AlertTriangle className="w-5 h-5" />
        Engineering Disclaimer
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground space-y-2">
      <p>
        This calculator is provided as an engineering tool for preliminary analysis purposes.
        Results should be independently verified by a qualified professional engineer.
      </p>
      <p className="font-medium text-foreground">
        Do not use these calculations for final design or construction without proper
        professional review and approval.
      </p>
    </CardContent>
  </Card>
);

export default Disclaimer;
