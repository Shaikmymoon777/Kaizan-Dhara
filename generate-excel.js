import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createFlowDiagram() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pipeline Flow Diagram');

  // Set column widths for better readability
  sheet.getColumn('B').width = 8;  // Step
  sheet.getColumn('D').width = 25; // Agent Name
  sheet.getColumn('F').width = 40; // Input
  sheet.getColumn('H').width = 45; // Process
  sheet.getColumn('J').width = 45; // Output

  // Common styling variables
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }, // Dark gray
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }
  };

  const nodeStyle = {
    font: { size: 11 },
    alignment: { vertical: 'middle', wrapText: true },
    border: { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }
  };

  const agentNameStyle = {
    ...nodeStyle,
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    alignment: { horizontal: 'center', vertical: 'middle' }
  };

  const arrowStyle = {
    font: { size: 16, bold: true, color: { argb: 'FF6366F1' } }, // Indigo arrow
    alignment: { horizontal: 'center', vertical: 'middle' }
  };

  // --- Draw the Header Row ---
  const headers = [
    { cell: 'B2', label: 'Step' },
    { cell: 'D2', label: 'Processing Agent' },
    { cell: 'F2', label: 'Inputs Needed' },
    { cell: 'H2', label: 'Agent Action / Process' },
    { cell: 'J2', label: 'Generated Outputs' }
  ];

  headers.forEach(h => {
    const c = sheet.getCell(h.cell);
    c.value = h.label;
    Object.assign(c, headerStyle);
  });
  sheet.getRow(2).height = 30;

  // --- Pipeline Data structure ---
  const pipeline = [
    {
      step: "01",
      agent: "Requirement Agent",
      input: "User Idea/Prompt (e.g. 'Build a food app')",
      process: "Analyzes the prompt, scopes out features, handles ambiguities, and formats strict BA documentation.",
      output: "JSON requirements (User Stories, Scope, Constants)",
      color: "FF0891B2" // Cyan
    },
    {
      step: "02",
      agent: "Design Agent",
      input: "JSON requirements + User feedback",
      process: "Designs the architecture, visual wireframes, component hierarchy, and database/API schemas.",
      output: "JSON Design Spec (Wireframes, Architecture Map)",
      color: "FFC026D3" // Fuchsia
    },
    {
      step: "03",
      agent: "Development Agent",
      input: "JSON requirements + JSON Design Spec",
      process: "Acts as a Lead Engineer. Writes raw, production-ready Full-Stack code matching the requirements.",
      output: "Multi-file Object (frontend/App.tsx, backend/...)",
      color: "FFD97706" // Amber
    },
    {
      step: "04",
      agent: "Testing Agent",
      input: "Generated Code + Requirements",
      process: "Analyzes the code for logic flaws, strict adherence to user stories, and writes test coverage reports.",
      output: "QA Report (Pass/Fail, Security Audit)",
      color: "FF059669" // Emerald
    }
  ];

  // --- Draw Nodes ---
  let currentRow = 4;

  pipeline.forEach((node, index) => {
    // Set row height for content
    sheet.getRow(currentRow).height = 80;

    // Draw Step Number
    const cellStep = sheet.getCell(`B${currentRow}`);
    cellStep.value = node.step;
    Object.assign(cellStep, { ...nodeStyle, alignment: { horizontal: 'center', vertical: 'middle' }, font: { italic: true, size: 14 } });

    // Draw Agent Box (Colored)
    const cellAgent = sheet.getCell(`D${currentRow}`);
    cellAgent.value = node.agent;
    Object.assign(cellAgent, { ...agentNameStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: node.color } } });

    // Draw Input box
    const cellInput = sheet.getCell(`F${currentRow}`);
    cellInput.value = node.input;
    Object.assign(cellInput, nodeStyle);

    // Draw Process box
    const cellProcess = sheet.getCell(`H${currentRow}`);
    cellProcess.value = node.process;
    Object.assign(cellProcess, nodeStyle);

    // Draw Output box
    const cellOutput = sheet.getCell(`J${currentRow}`);
    cellOutput.value = node.output;
    Object.assign(cellOutput, { ...nodeStyle, font: {bold: true, size: 10} });


    // --- Draw connection arrows contextually ---
    // Arrow from Input -> Agent
    const inArrow1 = sheet.getCell(`E${currentRow}`);
    inArrow1.value = "➞";
    Object.assign(inArrow1, arrowStyle);

    // Arrow from Input -> Process
    const inArrow2 = sheet.getCell(`G${currentRow}`);
    inArrow2.value = "➞";
    Object.assign(inArrow2, arrowStyle);

    // Arrow from Process -> Output
    const outArrow = sheet.getCell(`I${currentRow}`);
    outArrow.value = "➞";
    Object.assign(outArrow, arrowStyle);

    
    // --- Draw Down Arrow if not the last step ---
    if (index < pipeline.length - 1) {
      currentRow += 1;
      sheet.getRow(currentRow).height = 40;
      
      const downArrow = sheet.getCell(`D${currentRow}`);
      downArrow.value = "⬇";
      Object.assign(downArrow, { ...arrowStyle, font: { size: 24, bold: true, color: { argb: 'FF6366F1' } } });

      // Visual line showing output feeding into next input
      sheet.mergeCells(`J${currentRow-1}:J${currentRow}`); // keep output big
    }

    currentRow += 1;
  });

  // Add a nice title
  sheet.mergeCells('A1:K1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = "SDLC AI Agent Orchestrator - Automated Pipeline Flow";
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF4F46E5' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 40;

  sheet.views = [{ showGridLines: false }];

  // Save it
  const outputPath = path.join(__dirname, 'pipeline_flow_diagram.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Successfully generated flow diagram at: ${outputPath}`);
}

createFlowDiagram().catch(console.error);
