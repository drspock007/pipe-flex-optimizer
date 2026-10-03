import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENGINEERING_DISCLAIMER_APPROVAL, ENGINEERING_DISCLAIMER_PRELIMINARY, ENGINEERING_DISCLAIMER_TITLE } from "@/lib/engineering-disclaimer";

/** Engineering disclaimer card, mirrored from the shared GMC apps layout. */
const Disclaimer = () => (
  <Card className="border-destructive/50 bg-destructive/5">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base text-destructive">
        <AlertTriangle className="w-5 h-5" />
        {ENGINEERING_DISCLAIMER_TITLE}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground space-y-2">
      <p>
        {ENGINEERING_DISCLAIMER_PRELIMINARY}
      </p>
      <p className="font-medium text-foreground">
        {ENGINEERING_DISCLAIMER_APPROVAL}
      </p>
    </CardContent>
  </Card>
);

export default Disclaimer;
