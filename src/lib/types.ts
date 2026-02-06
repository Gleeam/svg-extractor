export interface SvgPart {
  id: string;
  content: string;
  tag: string;
  label: string;
}

export interface ExtractedSVG {
  id: string;
  content: string;
  source: string;
  label: string;
  width: number | null;
  height: number | null;
  parts: SvgPart[];
}
