// Figma Integration Service
export interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  content?: string;
  styles?: any;
  children?: FigmaComponent[];
}

export interface FigmaTheme {
  colors: Record<string, string>;
  fonts: string[];
}

export interface FigmaSchema {
  fileKey: string;
  name: string;
  pages: {
    id: string;
    name: string;
    frames: FigmaComponent[];
  }[];
  theme: FigmaTheme;
}

export class FigmaService {
  private static API_BASE = "http://localhost:3001/figma";

  static extractFileKey(url: string): string | null {
    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  static async fetchFile(url: string): Promise<FigmaSchema> {
    const fileKey = this.extractFileKey(url);
    if (!fileKey) throw new Error("Invalid Figma URL");

    const response = await fetch(`${this.API_BASE}/files/${fileKey}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to fetch Figma file");
    }

    const data = await response.json();
    return this.parseFigmaData(fileKey, data);
  }

  private static parseFigmaData(fileKey: string, data: any): FigmaSchema {
    const schema: FigmaSchema = {
      fileKey,
      name: data.name,
      pages: [],
      theme: {
        colors: {},
        fonts: [],
      },
    };

    // Extract pages and frames
    if (data.document && data.document.children) {
      schema.pages = data.document.children.map((page: any) => ({
        id: page.id,
        name: page.name,
        frames: this.extractFrames(page.children || []),
      }));
    }

    // Basic Style Extraction (In a real app, this would be much more complex)
    this.extractStyles(data, schema.theme);

    return schema;
  }

  private static extractFrames(nodes: any[]): FigmaComponent[] {
    return nodes
      .filter((node) => node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE")
      .map((node) => ({
        id: node.id,
        name: node.name,
        type: this.mapType(node),
        styles: this.extractNodeStyles(node),
        children: node.children ? this.extractSubElements(node.children) : [],
      }));
  }

  private static extractSubElements(nodes: any[]): FigmaComponent[] {
    return nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: this.mapType(node),
      content: node.characters,
      styles: this.extractNodeStyles(node),
      children: node.children ? this.extractSubElements(node.children) : [],
    }));
  }

  private static mapType(node: any): string {
    if (node.type === "TEXT") return "TEXT";
    if (node.name.toLowerCase().includes("button")) return "BUTTON";
    if (node.name.toLowerCase().includes("input")) return "INPUT";
    if (node.name.toLowerCase().includes("navbar")) return "NAVBAR";
    if (node.name.toLowerCase().includes("hero")) return "HERO";
    if (node.type === "RECTANGLE") return "CONTAINER";
    return node.type;
  }

  private static extractNodeStyles(node: any): any {
    const styles: any = {};
    if (node.fills && node.fills.length > 0 && node.fills[0].color) {
      const c = node.fills[0].color;
      styles.backgroundColor = `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a})`;
    }
    if (node.absoluteBoundingBox) {
      styles.width = node.absoluteBoundingBox.width;
      styles.height = node.absoluteBoundingBox.height;
    }
    return styles;
  }

  private static extractStyles(data: any, theme: FigmaTheme) {
    // In a full implementation, we'd traverse the whole document for style definitions
    // For now, we'll just collect unique font names used in the doc
    const findFonts = (node: any) => {
      if (node.type === "TEXT" && node.style && node.style.fontFamily) {
        if (!theme.fonts.includes(node.style.fontFamily)) {
          theme.fonts.push(node.style.fontFamily);
        }
      }
      if (node.children) node.children.forEach(findFonts);
    };
    findFonts(data.document);
  }
}
