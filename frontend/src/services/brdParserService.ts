// BRD/LLD/HLD Document Parser Service
// Extracts structured requirements from uploaded documents
// RULES: No summarization, no hallucination, exact wording preserved

export interface BRDSection {
  title: string;
  content: string;
  items: string[];
}

export interface BRDStructuredData {
  documentType: 'BRD' | 'LLD' | 'HLD' | 'Generic';
  project_name: string;
  modules: string[];
  functional_requirements: string[];
  non_functional_requirements: string[];
  user_flows: string[];
  entities: string[];
  scope: string;
  raw_sections: Record<string, BRDSection>;
  isValid: boolean;
  validationError?: string;
  sourceFiles: string[];
  debug: {
    rawTextPreview: string;
    parsedSectionTitles: string[];
    extractionTimestamp: string;
    totalCharsExtracted: number;
  };
}

// Keyword map for matching section titles to requirement categories
const SECTION_KEYWORD_MAP: Record<string, string[]> = {
  functional_requirements: [
    'functional requirement', 'functional req', 'system requirement',
    'feature list', 'features', 'system function', 'functional specification',
    'business requirement', 'application requirement',
    '機能要件', '業務要件', 'システム要件', '機能一覧',
  ],
  non_functional_requirements: [
    'non-functional', 'non functional', 'nfr', 'quality attribute',
    'performance requirement', 'security requirement', 'scalability',
    'reliability', 'availability', 'maintainability',
    '非機能要件', '品質要件',
  ],
  user_flows: [
    'user flow', 'user story', 'user stories', 'user journey', 'workflow',
    'process flow', 'business flow', 'use case', 'scenario', 'user scenario',
    '業務フロー', 'ユースケース', '利用シーン', '画面遷移',
  ],
  modules: [
    'module', 'component', 'subsystem', 'system component', 'section overview',
    'architecture component', 'service layer',
    'モジュール', '構成要素',
  ],
  entities: [
    'data entity', 'data model', 'database schema', 'schema', 'table',
    'domain model', 'data object', 'entity relationship',
    'データモデル', 'エンティティ', 'テーブル',
  ],
  scope: [
    'scope', 'in-scope', 'out-of-scope', 'boundary', 'exclusion', 'limitation',
    'project scope',
    '範囲', '対象', 'スコープ',
  ],
  project_info: [
    'introduction', 'overview', 'project overview', 'objective', 'purpose',
    'background', 'executive summary', 'abstract', 'document purpose',
    'はじめに', '概要', '目的', '背景',
  ],
};

function detectDocumentType(text: string, filename: string): 'BRD' | 'LLD' | 'HLD' | 'Generic' {
  const lower = text.toLowerCase();
  const lowerFilename = filename.toLowerCase();

  if (lowerFilename.includes('lld') || lower.includes('low level design') || lower.includes('low-level design')) return 'LLD';
  if (lowerFilename.includes('hld') || lower.includes('high level design') || lower.includes('high-level design')) return 'HLD';
  if (
    lowerFilename.includes('brd') ||
    lower.includes('business requirement') ||
    lower.includes('functional requirement') ||
    lower.includes('product requirement')
  ) return 'BRD';
  return 'Generic';
}

// Determines if a line looks like a section heading
function isHeadingLine(line: string, nextLine: string): boolean {
  const t = line.trim();
  if (!t || t.length < 2) return false;

  // Markdown headings: ## Section
  if (/^#{1,4}\s+\S/.test(t)) return true;

  // Numbered sections: 1. / 1.1. / 2.3.1
  if (/^(\d+\.)+\s+[A-Za-z]/.test(t)) return true;

  // ALL CAPS heading (e.g. FUNCTIONAL REQUIREMENTS), not a full sentence
  // Also handles Japanese/non-Latin headers by checking length and punctuation
  if (
    t.length > 3 &&
    t.length < 80 &&
    !t.includes('.') &&
    !t.includes(' ') &&
    (t === t.toUpperCase() || /[^\x00-\x7F]/.test(t))
  ) return true;

  // Line ending with colon and short (e.g. "Scope:" or "範囲:")
  if (t.endsWith(':') || t.endsWith('：')) {
    const clean = t.slice(0, -1);
    if (clean.length < 30 && !/[.!?。！？]/.test(clean)) return true;
  }

  // Underlined heading: next line is --- or ===
  if (/^[=\-]{3,}$/.test(nextLine.trim()) && nextLine.trim().length >= 3) return true;

  return false;
}

function cleanHeadingText(line: string): string {
  return line
    .trim()
    .replace(/^#{1,4}\s*/, '')      // Remove markdown #
    .replace(/^[\d.]+\s*/, '')       // Remove numbering
    .replace(/:$/, '')               // Remove trailing colon
    .trim();
}

function splitIntoSections(text: string): Array<{ title: string; body: string }> {
  const lines = text.split('\n');
  const sections: Array<{ title: string; body: string }> = [];

  let currentTitle = 'Document';
  let currentBody: string[] = [];
  let skipNext = false;

  for (let i = 0; i < lines.length; i++) {
    if (skipNext) { skipNext = false; continue; }

    const line = lines[i];
    const nextLine = lines[i + 1] || '';

    if (isHeadingLine(line, nextLine)) {
      if (currentBody.join('').trim().length > 0) {
        sections.push({ title: currentTitle, body: currentBody.join('\n') });
      }
      currentTitle = cleanHeadingText(line);
      currentBody = [];

      // Skip underline character line
      if (/^[=\-]{3,}$/.test(nextLine.trim())) {
        skipNext = true;
      }
    } else {
      currentBody.push(line);
    }
  }

  if (currentBody.join('').trim().length > 0) {
    sections.push({ title: currentTitle, body: currentBody.join('\n') });
  }

  return sections.filter(s => s.body.trim().length > 0);
}

// Extract atomic bullet items from a block of text, preserving exact wording
function extractBulletItems(text: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n');
  let current = '';

  const bulletPattern = /^(?:[-*•◦○▪▸►・■□]|\d+[).]\s+|[a-z]\)\s+|[IVX]+\.\s+|(?:FR|NFR|REQ|UC|US|R)\s*[-.]?\s*\d+\s*[:.]\s*)(.+)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current.trim()) { items.push(current.trim()); current = ''; }
      continue;
    }

    const match = trimmed.match(bulletPattern);
    if (match) {
      if (current.trim()) items.push(current.trim());
      current = match[1]?.trim() || trimmed;
    } else if (current && /^\s{2,}/.test(line)) {
      // Indented continuation
      current += ' ' + trimmed;
    } else {
      if (current.trim()) items.push(current.trim());
      current = trimmed;
    }
  }

  if (current.trim()) items.push(current.trim());

  return items.filter(i => i.length > 5);
}

function matchSectionCategory(title: string): string | null {
  const lower = title.toLowerCase();

  // Pattern matching for requirement IDs directly in titles (e.g. "BR-01", "FR-1")
  if (/^(?:FR|NFR|REQ|BR|UC|BO|BRL|US)[-.\s]?\d+/i.test(title)) {
    if (lower.startsWith('nfr')) return 'non_functional_requirements';
    return 'functional_requirements';
  }

  for (const [category, keywords] of Object.entries(SECTION_KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category;
    }
  }
  return null;
}

// Fallback: scan full text for requirement ID patterns (FR-1, REQ-01, etc.)
function extractReqIdPatterns(text: string): string[] {
  const results: string[] = [];
  const pattern = /(?:FR|NFR|REQ|R|UC)[-.\s]?\d+\s*[:.]\s*(.+?)(?=(?:FR|NFR|REQ|R|UC)[-.\s]?\d+\s*[:.]|\n|$)/gi;
  let m: RegExpExecArray | null;
  const re = /(?:FR|NFR|REQ|R|UC)[-.\s]?\d+\s*[:.]\s*([^\n]+)/gi;
  while ((m = re.exec(text)) !== null) {
    const req = m[1]?.trim();
    if (req && req.length > 5) results.push(req);
  }
  return results;
}

// Fallback: scan full text for "As a <role>, I want..." user story patterns
function extractUserStoryPatterns(text: string): string[] {
  const results: string[] = [];
  const re = /As an?\s+\w[\w\s]*?,?\s*I\s+(?:want|can|should|need|would like)\s+[^\n.]+[.\n]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const story = m[0]?.trim().replace(/\.$/, '');
    if (story && story.length > 10) results.push(story);
  }
  return results;
}

// ── Main export ────────────────────────────────────────────────────────────────

export function parseDocument(text: string, filename = ''): BRDStructuredData {
  console.group('[BRD Parser] Extraction Log');
  console.log('File:', filename);
  console.log('Raw text preview (500 chars):', text.substring(0, 500));

  const docType = detectDocumentType(text, filename);
  console.log('Detected document type:', docType);

  const rawSections = splitIntoSections(text);
  const parsedSectionTitles = rawSections.map(s => s.title);
  console.log('Parsed section titles:', parsedSectionTitles);

  const result: BRDStructuredData = {
    documentType: docType,
    project_name: 'Not specified in BRD',
    modules: [],
    functional_requirements: [],
    non_functional_requirements: [],
    user_flows: [],
    entities: [],
    scope: 'Not specified in BRD',
    raw_sections: {},
    isValid: false,
    sourceFiles: [filename],
    debug: {
      rawTextPreview: text.substring(0, 500),
      parsedSectionTitles,
      extractionTimestamp: new Date().toISOString(),
      totalCharsExtracted: text.length,
    },
  };

  // Process each detected section
  for (const section of rawSections) {
    const category = matchSectionCategory(section.title);
    const items = extractBulletItems(section.body);

    result.raw_sections[section.title] = {
      title: section.title,
      content: section.body.trim(),
      items,
    };

    switch (category) {
      case 'functional_requirements':
        if (/^(?:FR|REQ|BR|UC|BO|BRL|US)[-.\s]?\d+/i.test(section.title) && items.length === 0) {
          // If title is an ID and body has no bullets, treat whole body as one requirement
          if (section.body.trim().length > 5) result.functional_requirements.push(section.body.trim());
        } else {
          result.functional_requirements.push(...items.filter(Boolean));
        }
        break;
      case 'non_functional_requirements':
        if (/^NFR[-.\s]?\d+/i.test(section.title) && items.length === 0) {
          if (section.body.trim().length > 5) result.non_functional_requirements.push(section.body.trim());
        } else {
          result.non_functional_requirements.push(...items.filter(Boolean));
        }
        break;
      case 'user_flows':
        result.user_flows.push(...items.filter(Boolean));
        break;
      case 'modules':
        result.modules.push(...items.filter(Boolean));
        break;
      case 'entities':
        result.entities.push(...items.filter(Boolean));
        break;
      case 'scope':
        result.scope = section.body.trim();
        break;
      case 'project_info':
        if (result.project_name === 'Not specified in BRD') {
          const lines = section.body.split('\n').filter(l => l.trim().length > 3);
          const systemLine = lines.find(l => l.includes('System') || l.includes('システム')) || lines[0];
          if (systemLine && systemLine.length < 150) {
            result.project_name = systemLine.trim().replace(/^System[:\s]*/i, '');
          }
        }
        break;
    }
  }

  // Refine project name from global text if still "Not specified" or generic
  if (result.project_name === 'Not specified in BRD' || result.project_name.includes('\u0009')) {
    const systemMatch = text.match(/(?:System|Project|システム|プロジェクト)\s*[:：]\s*([^\n]+)/i);
    if (systemMatch) {
      result.project_name = systemMatch[1].trim();
    }
  }

  // Supplemental extraction: finding ID-based requirements that might be outside defined sections
  const fallbackFr = extractReqIdPatterns(text);
  if (fallbackFr.length > 0) {
    result.functional_requirements.push(...fallbackFr);
  }

  if (result.user_flows.length === 0) {
    const fallbackUf = extractUserStoryPatterns(text);
    result.user_flows.push(...fallbackUf);
  }

  // Deduplicate
  result.functional_requirements = [...new Set(result.functional_requirements)];
  result.non_functional_requirements = [...new Set(result.non_functional_requirements)];
  result.user_flows = [...new Set(result.user_flows)];
  result.modules = [...new Set(result.modules)];
  result.entities = [...new Set(result.entities)];

  // Validation
  const frCount = result.functional_requirements.length;
  const ufCount = result.user_flows.length;

  if (frCount < 3 && ufCount < 1) {
    result.isValid = false;
    result.validationError = `Insufficient structured data extracted from document. Found ${frCount} functional requirements and ${ufCount} user flows. Need at least 3 functional requirements and 1 user flow.`;
  } else if (frCount < 3) {
    result.isValid = false;
    result.validationError = `Insufficient structured data extracted from document. Found only ${frCount} functional requirements (need at least 3).`;
  } else if (ufCount < 1) {
    result.isValid = false;
    result.validationError = `Insufficient structured data extracted from document. Found ${frCount} functional requirements but no user flows identified.`;
  } else {
    result.isValid = true;
  }

  console.log('Final structured JSON:', result);
  console.groupEnd();

  return result;
}

// Serializes BRD data into a prompt-ready string for the AI
// Preserves exact wording — no summarization
export function serializeBRDForAI(data: BRDStructuredData): string {
  const parts: string[] = [
    `=== EXTRACTED DOCUMENT DATA (${data.documentType}) ===`,
    `SOURCE FILES: ${data.sourceFiles.join(', ')}`,
    `PROJECT NAME: ${data.project_name}`,
    '',
    `FUNCTIONAL REQUIREMENTS (${data.functional_requirements.length} extracted):`,
    ...data.functional_requirements.map((r, i) => `  FR-${i + 1}: ${r}`),
    '',
    `NON-FUNCTIONAL REQUIREMENTS (${data.non_functional_requirements.length} extracted):`,
    data.non_functional_requirements.length > 0
      ? data.non_functional_requirements.map((r, i) => `  NFR-${i + 1}: ${r}`).join('\n')
      : '  Not specified in BRD',
    '',
    `USER FLOWS / STORIES (${data.user_flows.length} extracted):`,
    ...data.user_flows.map((f, i) => `  UF-${i + 1}: ${f}`),
    '',
    `MODULES (${data.modules.length} extracted):`,
    data.modules.length > 0
      ? data.modules.map(m => `  - ${m}`).join('\n')
      : '  Not specified in BRD',
    '',
    `DATA ENTITIES (${data.entities.length} extracted):`,
    data.entities.length > 0
      ? data.entities.map(e => `  - ${e}`).join('\n')
      : '  Not specified in BRD',
    '',
    `SCOPE: ${data.scope}`,
  ];

  return parts.join('\n');
}

// Merge multiple BRD documents (e.g. BRD + LLD uploaded together)
export function mergeDocuments(docs: BRDStructuredData[]): BRDStructuredData {
  if (docs.length === 0) throw new Error('No documents to merge');
  if (docs.length === 1) return docs[0];

  const merged: BRDStructuredData = {
    documentType: docs[0].documentType,
    project_name: docs.find(d => d.project_name !== 'Not specified in BRD')?.project_name || 'Not specified in BRD',
    functional_requirements: [],
    non_functional_requirements: [],
    user_flows: [],
    modules: [],
    entities: [],
    scope: docs.find(d => d.scope !== 'Not specified in BRD')?.scope || 'Not specified in BRD',
    raw_sections: {},
    isValid: false,
    sourceFiles: docs.flatMap(d => d.sourceFiles),
    debug: {
      rawTextPreview: docs[0].debug.rawTextPreview,
      parsedSectionTitles: docs.flatMap(d => d.debug.parsedSectionTitles),
      extractionTimestamp: new Date().toISOString(),
      totalCharsExtracted: docs.reduce((sum, d) => sum + d.debug.totalCharsExtracted, 0),
    },
  };

  for (const doc of docs) {
    merged.functional_requirements.push(...doc.functional_requirements);
    merged.non_functional_requirements.push(...doc.non_functional_requirements);
    merged.user_flows.push(...doc.user_flows);
    merged.modules.push(...doc.modules);
    merged.entities.push(...doc.entities);
    Object.assign(merged.raw_sections, doc.raw_sections);
  }

  // Deduplicate
  merged.functional_requirements = [...new Set(merged.functional_requirements)];
  merged.non_functional_requirements = [...new Set(merged.non_functional_requirements)];
  merged.user_flows = [...new Set(merged.user_flows)];
  merged.modules = [...new Set(merged.modules)];
  merged.entities = [...new Set(merged.entities)];

  const frCount = merged.functional_requirements.length;
  const ufCount = merged.user_flows.length;
  merged.isValid = frCount >= 3 && ufCount >= 1;
  if (!merged.isValid) {
    merged.validationError = `Merged documents: ${frCount} functional requirements, ${ufCount} user flows. Need at least 3 FRs and 1 user flow.`;
  }

  return merged;
}
