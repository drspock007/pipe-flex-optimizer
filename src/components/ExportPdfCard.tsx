// Modifié par Giovanni malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Card with report metadata inputs and the PDF export action.

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileDown, Info } from "lucide-react";
import { toast } from "sonner";
import { AppInputs } from "@/lib/v2-app/inputs";
import { Derived } from "@/lib/v2-app/bridge";
import { V2Report } from "@/lib/pdf/report-types";
import { generateReportPdf } from "@/lib/pdf/report-pdf";
import { useUnits } from "@/contexts/UnitContext";

interface Props {
  inputs: AppInputs;
  derived: Derived;
  /** null when no current successful result exists (loading, stale or failed). */
  report: V2Report | null;
}

const MAX_LEN = 80;

const FieldHint = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" aria-label={text} className="text-muted-foreground hover:text-foreground">
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-[240px] text-xs">{text}</TooltipContent>
  </Tooltip>
);

const ExportPdfCard = ({ inputs, derived, report }: Props) => {
  const { system } = useUnits();
  const [preparedBy, setPreparedBy] = useState("");
  const [projectName, setProjectName] = useState("");

  const disabled = !preparedBy.trim() || !projectName.trim() || !report;

  const handleExport = () => {
    if (disabled || !report) return;
    try {
      const fileName = generateReportPdf(inputs, derived, report, {
        preparedBy: preparedBy.trim(),
        projectName: projectName.trim(),
        date: new Date(),
        system,
      });
      toast.success("PDF generated", { description: `${fileName}.pdf` });
    } catch (err) {
      console.error("[pdf-export] Generation failed:", err);
      toast.error("PDF generation failed");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileDown className="h-4 w-4 text-primary" /> Export report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="preparedBy" className="text-xs">Prepared by</Label>
              <FieldHint text="Name of the engineer performing the calculation. Printed on the report cover." />
            </div>
            <Input
              id="preparedBy" value={preparedBy} maxLength={MAX_LEN}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder="John Doe, P.Eng." className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="projectName" className="text-xs">Project name</Label>
              <FieldHint text="Used in the report header and in the PDF file name." />
            </div>
            <Input
              id="projectName" value={projectName} maxLength={MAX_LEN}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Pipeline XYZ – Section 4" className="h-9 text-sm"
            />
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block w-full sm:w-auto">
              <Button
                onClick={handleExport} disabled={disabled}
                className="w-full sm:w-auto gap-2" size="sm"
              >
                <FileDown className="h-4 w-4" /> Export to PDF
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px] text-xs">
            {!report
              ? "Export is available only for a current, successful calculation."
              : disabled
              ? "Fill in both the preparer name and the project name to enable the export."
              : "Download a structured PDF report of inputs, section properties and FEM results."}
          </TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
};

export default ExportPdfCard;
