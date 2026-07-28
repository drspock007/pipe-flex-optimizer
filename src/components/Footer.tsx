import { Facebook, Linkedin } from "lucide-react";

/** Site footer mirroring giovannimalagninoconsulting.com: Italy address, Canada address, social links.
 * Typography, colors, and social icon styling are matched to the source site's computed styles:
 * Roboto 14px/500, color #020202, white background; 32x32 icons with 3px radius, brand-color backgrounds. */
export const Footer = () => {
  const textStyle: React.CSSProperties = {
    fontFamily: 'Roboto, Helvetica, Arial, Lucida, sans-serif',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '23.8px',
    color: '#020202',
    letterSpacing: 'normal',
    margin: 0,
  };

  const linkStyle: React.CSSProperties = { ...textStyle, textDecoration: 'none' };

  const iconLinkBase: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    textDecoration: 'none',
  };

  return (
    <footer style={{ backgroundColor: '#ffffff' }}>
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Italy */}
          <div className="text-center md:text-left space-y-1" style={textStyle}>
            <p style={textStyle}>Giovanni Malagnino Consulting</p>
            <p style={textStyle}>Address in Italy:</p>
            <p style={textStyle}>Via Selva 79</p>
            <p style={textStyle}>63835 Montappone FM</p>
            <p style={textStyle}>Italie</p>
            <p style={textStyle}>
              <a href="tel:+393927290392" style={linkStyle}>+39 392 729 0392</a>
            </p>
            <p style={textStyle}>
              <a
                href="mailto:giovanni@giovannimalagninoconsulting.com"
                style={linkStyle}
                className="break-all"
              >
                giovanni@giovannimalagninoconsulting.com
              </a>
            </p>
          </div>

          {/* Column 2: Canada */}
          <div className="text-center md:text-left space-y-1" style={textStyle}>
            <p style={textStyle}>&nbsp;</p>
            <p style={textStyle}>Address in Canada:</p>
            <p style={textStyle}>1395, Rue Fleury Est, Bureau 102.2</p>
            <p style={textStyle}>Montréal, QC, H2C 1R7</p>
            <p style={textStyle}>Canada</p>
            <p style={textStyle}>
              <a href="tel:+14384480997" style={linkStyle}>+1 438 448 0997</a>
            </p>
          </div>

          {/* Column 3: Social links (Facebook brand blue #3B5998, LinkedIn brand blue #007BB6) */}
          <div className="flex items-start justify-center md:justify-end gap-2">
            <a
              href="https://www.facebook.com/giovannimalagninoconsulting"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow on Facebook"
              style={{ ...iconLinkBase, backgroundColor: '#3B5998' }}
            >
              <Facebook size={16} fill="#ffffff" strokeWidth={0} />
            </a>
            <a
              href="https://www.linkedin.com/in/giovannimalagnino/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow on LinkedIn"
              style={{ ...iconLinkBase, backgroundColor: '#007BB6' }}
            >
              <Linkedin size={16} fill="#ffffff" strokeWidth={0} />
            </a>
          </div>
        </div>

        {/* Disclaimer + version bar (project-specific requirement) */}
        <div className="mt-8 pt-4 border-t border-border text-center space-y-1">
          <p className="text-[11px] text-muted-foreground leading-snug max-w-2xl mx-auto">
            Disclaimer — Results are provided for informational purposes only and shall not replace verification by a qualified engineer.
            The user assumes full responsibility for the use and interpretation of the output.
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            © {new Date().getFullYear()}{" "}
            <a
              href="https://www.giovannimalagninoconsulting.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Giovanni Malagnino Consulting
            </a>
            {" "}— Pipe Lowering — All rights reserved. — v202607281045
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
