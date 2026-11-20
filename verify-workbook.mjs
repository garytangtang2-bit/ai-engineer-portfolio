import { strFromU8, unzipSync } from "./tools/vendor/fflate/browser.mjs";

const pageCount = 20;
const rowCount = 50;
const columnCount = 20;
const sheetRelationships = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function readXml(files, name) {
  if (!files[name]) throw new Error("Missing workbook part");
  const xml = new DOMParser().parseFromString(strFromU8(files[name]), "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Invalid workbook XML");
  return xml;
}

function sheetPaths(files) {
  const workbook = readXml(files, "xl/workbook.xml");
  const rels = readXml(files, "xl/_rels/workbook.xml.rels");
  const targets = new Map(Array.from(rels.querySelectorAll("Relationship"), entry => [
    entry.getAttribute("Id"), entry.getAttribute("Target"),
  ]));
  return Array.from(workbook.querySelectorAll("sheet"), sheet => {
    const target = targets.get(sheet.getAttributeNS(sheetRelationships, "id"));
    if (!target) throw new Error("Missing worksheet");
    return new URL(target, "https://workbook.invalid/xl/workbook.xml").pathname.slice(1);
  });
}

function checkSheet(sheet, page) {
  const cells = new Map();
  let extra = 0;
  for (const cell of sheet.querySelectorAll("sheetData c")) {
    const address = cell.getAttribute("r");
    if (cells.has(address)) extra++;
    cells.set(address, cell);
  }
  let matches = 0;
  let firstIssue = "";
  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < columnCount; col++) {
      const address = String.fromCharCode(65 + col) + (row + 1);
      const cell = cells.get(address);
      const raw = cell?.querySelector("v")?.textContent.trim();
      const type = cell?.getAttribute("t");
      // Same fixture as the source PDF: 0.01 at A1, increasing by 0.01 in row order.
      const expected = (page * rowCount * columnCount + row * columnCount + col + 1) / 100;
      if (raw && (!type || type === "n") && Number(raw) === expected) matches++;
      else if (!firstIssue) firstIssue = address;
      cells.delete(address);
    }
  }
  return { matches, firstIssue, extra: extra + cells.size };
}

export async function verifyWorkbook(onPage) {
  const response = await fetch("evidence/20000-cells-converted.xlsx");
  if (!response.ok) throw new Error("Workbook unavailable");
  const files = unzipSync(new Uint8Array(await response.arrayBuffer()), {
    filter: entry => /^xl\/(worksheets\/[^/]+\.xml|workbook\.xml|_rels\/workbook\.xml\.rels)$/.test(entry.name),
  });
  const paths = sheetPaths(files);
  if (paths.length !== pageCount) throw new Error("Unexpected sheet count");
  let matches = 0;
  let extra = 0;
  let firstIssue = "";
  for (const [page, path] of paths.entries()) {
    const result = checkSheet(readXml(files, path), page);
    matches += result.matches;
    extra += result.extra;
    if (!firstIssue && result.firstIssue) firstIssue = "第 " + (page + 1) + " 頁 " + result.firstIssue;
    onPage(page, result.matches === rowCount * columnCount && result.extra === 0);
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return { matches, extra, firstIssue, total: pageCount * rowCount * columnCount };
}
