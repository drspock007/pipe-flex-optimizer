import FieldHelp from '@/components/FieldHelp';
import {fieldHelp} from '@/lib/field-help';
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

function labelText(node:React.ReactNode):string {
 return React.Children.toArray(node).map(v=>typeof v==='string'||typeof v==='number'?String(v):React.isValidElement<{children?:React.ReactNode}>(v)?labelText(v.props.children):'').join('');
}
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, children, ...props }, ref) => {
 const help=props.title??fieldHelp(labelText(children));
 return <span className="inline-flex items-center gap-1"><LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props}>{children}</LabelPrimitive.Root>{help&&<FieldHelp text={help}/>}</span>;
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
