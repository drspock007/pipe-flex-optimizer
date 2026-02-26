// src/components/PipeSchematicSVG.tsx

const PipeSchematicSVG = () => (
  <svg
    viewBox="0 0 600 250"
    className="w-full max-w-2xl mt-3"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Schematic of pipe lowering into trench"
  >
    {/* Defs: arrowheads & hatch pattern */}
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6 Z" className="fill-muted-foreground" />
      </marker>
      <marker id="arrow-rev" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto-start-reverse">
        <path d="M0,0 L8,3 L0,6 Z" className="fill-muted-foreground" />
      </marker>
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" className="stroke-muted-foreground/40" strokeWidth="1" />
      </pattern>
    </defs>

    {/* Ground level line */}
    <line x1="30" y1="70" x2="570" y2="70" className="stroke-muted-foreground/50" strokeWidth="1" strokeDasharray="4 3" />
    <text x="575" y="74" className="fill-muted-foreground/50 text-[9px]" textAnchor="start">GL</text>

    {/* Ground hatch above trench */}
    <rect x="400" y="70" width="170" height="12" fill="url(#hatch)" className="opacity-40" />

    {/* Trench profile */}
    <polyline
      points="430,70 430,200 560,200 560,70"
      className="stroke-muted-foreground"
      strokeWidth="1.5"
      fill="none"
    />
    {/* Trench hatch (walls) */}
    <rect x="420" y="70" width="10" height="130" fill="url(#hatch)" className="opacity-30" />
    <rect x="560" y="70" width="10" height="130" fill="url(#hatch)" className="opacity-30" />

    {/* Sideboom crane (simplified) */}
    {/* Vertical mast */}
    <line x1="80" y1="30" x2="80" y2="70" className="stroke-foreground" strokeWidth="2.5" />
    {/* Boom arm */}
    <line x1="80" y1="30" x2="130" y2="30" className="stroke-foreground" strokeWidth="2" />
    {/* Cable */}
    <line x1="130" y1="30" x2="130" y2="48" className="stroke-muted-foreground" strokeWidth="1" strokeDasharray="3 2" />
    {/* Base/tracks */}
    <rect x="60" y="70" width="40" height="10" rx="2" className="fill-foreground/80" />
    {/* Wheels */}
    <circle cx="65" cy="83" r="4" className="fill-foreground/60" />
    <circle cx="95" cy="83" r="4" className="fill-foreground/60" />
    <text x="80" y="100" className="fill-muted-foreground text-[9px]" textAnchor="middle">Sideboom</text>

    {/* Pipe S-curve (Bézier) */}
    <path
      d="M 130,50 C 200,50 350,50 400,120 S 470,195 495,195"
      className="stroke-primary"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    {/* Small circle at pipe contact with trench bottom */}
    <circle cx="495" cy="195" r="3" className="fill-primary" />

    {/* Intermediate support (optional, dashed) */}
    <polygon
      points="320,128 312,145 328,145"
      className="stroke-muted-foreground/50"
      strokeWidth="1"
      strokeDasharray="3 2"
      fill="none"
    />
    <text x="320" y="158" className="fill-muted-foreground/40 text-[8px]" textAnchor="middle">
      (optional support)
    </text>

    {/* Annotation: h (vertical) */}
    <line
      x1="415" y1="52" x2="415" y2="195"
      className="stroke-muted-foreground"
      strokeWidth="1"
      markerStart="url(#arrow-rev)"
      markerEnd="url(#arrow)"
    />
    <text x="408" y="130" className="fill-muted-foreground text-[11px] font-semibold" textAnchor="end">h</text>

    {/* Annotation: L (horizontal) */}
    <line
      x1="130" y1="215"  x2="495" y2="215"
      className="stroke-muted-foreground"
      strokeWidth="1"
      markerStart="url(#arrow-rev)"
      markerEnd="url(#arrow)"
    />
    <text x="312" y="232" className="fill-muted-foreground text-[11px] font-semibold" textAnchor="middle">L</text>

    {/* Horizontal tick marks for L */}
    <line x1="130" y1="210" x2="130" y2="220" className="stroke-muted-foreground" strokeWidth="1" />
    <line x1="495" y1="210" x2="495" y2="220" className="stroke-muted-foreground" strokeWidth="1" />

    {/* Vertical tick marks for h */}
    <line x1="410" y1="52" x2="420" y2="52" className="stroke-muted-foreground" strokeWidth="1" />
    <line x1="410" y1="195" x2="420" y2="195" className="stroke-muted-foreground" strokeWidth="1" />
  </svg>
);

export default PipeSchematicSVG;
