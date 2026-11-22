/* global DocumentApp, SpreadsheetApp */

/**
 * Appscript to generate a simple rendering of the current
 * document/spreadsheet as HTML
 */
function convertToHtml() {

  function spreadsheetToHtml() {
    const dataSheet = SpreadsheetApp.getActiveSheet();
    const rows = dataSheet.getDataRange().getDisplayValues();
    if (rows.length === 0)
      throw new Error(`No data found in active sheet`);

    // Build a simple HTML table with the content
    return `<h1>${dataSheet.getName()}</h1><table>`
    + rows.map(r => "<tr>" + r.map(
      c => `<td>${escapeHtml(c)}</td>`).join("\n") + "</tr>").join("\n")
    + "</table>";
  }

  function documentToHtml() {

    function headingTag(heading) {
      switch (heading) {
      case DocumentApp.ParagraphHeading.TITLE: return 'h1';
      case DocumentApp.ParagraphHeading.SUBTITLE: return 'h2';
      case DocumentApp.ParagraphHeading.HEADING1: return 'h1';
      case DocumentApp.ParagraphHeading.HEADING2: return 'h2';
      case DocumentApp.ParagraphHeading.HEADING3: return 'h3';
      case DocumentApp.ParagraphHeading.HEADING4: return 'h4';
      case DocumentApp.ParagraphHeading.HEADING5: return 'h5';
      case DocumentApp.ParagraphHeading.HEADING6: return 'h6';
      default: return 'p';
      }
    }

    function paragraphTextToHtml(paragraph) {
      let html = '';

      for (let i = 0; i < paragraph.getNumChildren(); i++) {
        const child = paragraph.getChild(i);

        if (child.getType() !== DocumentApp.ElementType.TEXT) {
          continue;
        }

        const text = child.asText();
        const content = escapeHtml(text.getText());
        const style = text.getTextAttributeIndices();

        // Apply text styles one character at a time so style changes are retained.
        for (let j = 0; j < content.length; j++) {
          const attributes = text.getAttributes(j);
          let character = escapeHtml(text.getText().charAt(j));

          if (attributes[DocumentApp.Attribute.BOLD]) {
            character = `<strong>${character}</strong>`;
          }
          if (attributes[DocumentApp.Attribute.ITALIC]) {
            character = `<em>${character}</em>`;
          }
          if (attributes[DocumentApp.Attribute.UNDERLINE]) {
            character = `<u>${character}</u>`;
          }

          html += character;
        }
      }

      return html;
    }

    function tableToHtml(table) {
      const rows = [];

      for (let r = 0; r < table.getNumRows(); r++) {
        const row = table.getRow(r);
        const cells = [];

        for (let c = 0; c < row.getNumCells(); c++) {
          cells.push(`<td>${escapeHtml(row.getCell(c).getText())}</td>`);
        }

        rows.push(`<tr>${cells.join('')}</tr>`);
      }

      return `<table border="1">${rows.join('')}</table>`;
    }
    const body = DocumentApp.getActiveDocument().getBody();
    const parts = ['<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>'];
    let listOpen = false;
    let listTag = '';

    for (let i = 0; i < body.getNumChildren(); i++) {
      const element = body.getChild(i);
      const type = element.getType();

      if (type === DocumentApp.ElementType.LIST_ITEM) {
        const item = element.asListItem();
        const glyph = item.getGlyphType();
        const nextListTag =
              glyph === DocumentApp.GlyphType.BULLET ? 'ul' : 'ol';

        if (!listOpen || nextListTag !== listTag) {
          if (listOpen) parts.push(`</${listTag}>`);
          listTag = nextListTag;
          parts.push(`<${listTag}>`);
          listOpen = true;
        }

        parts.push(`<li>${paragraphTextToHtml(item)}</li>`);
        continue;
      }

      if (listOpen) {
        parts.push(`</${listTag}>`);
        listOpen = false;
        listTag = '';
      }

      if (type === DocumentApp.ElementType.PARAGRAPH) {
        const paragraph = element.asParagraph();
        const tag = headingTag(paragraph.getHeading());
        parts.push(`<${tag}>${paragraphTextToHtml(paragraph)}</${tag}>`);
      } else if (type === DocumentApp.ElementType.TABLE) {
        parts.push(tableToHtml(element.asTable()));
      } else if (type === DocumentApp.ElementType.HORIZONTAL_RULE) {
        parts.push('<hr>');
      }
    }

    if (listOpen) parts.push(`</${listTag}>`);
    parts.push('</body></html>');

    return parts.join('\n');
  }

  function escapeHtml(value) {
    return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  }

  if (SpreadsheetApp.getActiveSpreadsheet()) {
    return spreadsheetToHtml();
  } else if (DocumentApp.getActiveDocument()) {
    return documentToHtml();
  } else
    throw new Error("Can only convert documents and spreadsheets");
}

