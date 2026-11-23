/* global SpreadsheetApp, DocumentApp, HtmlService, Utilities */
/* global Burial, convertToHtml */

// Files embedded during the build process
const mainDialogHtml = {{mainDialog.html}};
const downloadDialogHtml = {{downloadDialog.html}};
const endUserHtml = "{{EndUser.html}}";

/**
 * Main entry point. Extract an HTML version of the document/sheet and
 * invoke MainDialog to initiate the encryption process.
 */
function bury() {
  // Open main dialog to prompt for password and (optional) expiry date.
  // It will callback to generateOfflineHtmlDownload
  const html = mainDialogHtml.replace(/{{content}}/, convertToHtml());
  const dlg = HtmlService.createHtmlOutput(html)
        .setWidth(400).setHeight(300);
  const ui = SpreadsheetApp.getActiveSheet()
        ? SpreadsheetApp.getUi() : DocumentApp.getUi();
  ui.showModalDialog(dlg, 'Generate distributable HTML');
}

/**
 * Callback from MainDialog that does the hard work
 */
function generateOfflineHtmlDownload(options) {
  const pass = options.pass;
  const outputFilename = options.filename || "buried.html";
  const expires = options.expires || 0;
  const content = options.content;
  const ui = SpreadsheetApp.getActiveSheet()
        ? SpreadsheetApp.getUi() : DocumentApp.getUi();

  // Encrypt the content
  const crypted = Burial.encrypt(content, pass, expires);

  // Get the end user HTML and embed the encrypted content and decryption code.
  // crypted is a Base64 string so is HTML-safe
  // We can't use Templates because they make the HTML minifier fall over.
  const euhtml = endUserHtml.replace(/{{crypted}}/s, crypted);

  // Convert end user HTML to a Base64 Data URI for direct browser download
  const base64Data = Utilities.base64Encode(
    euhtml, Utilities.Charset.UTF_8);
  const dataUri = 'data:text/html;charset=utf-8;base64,' + base64Data;

  // Create a modal dialog with a download button and auto-trigger
  const dlDlg = downloadDialogHtml
        .replace(/{{outputFilename}}/gs, outputFilename)
        .replace(/{{dataUri}}/gs, dataUri);

  // Fire off the dialog to download the encrypted HTML
  ui.showModalDialog(
    HtmlService.createHtmlOutput(dlDlg).setWidth(400).setHeight(240),
    'Download encrypted file');
}

/**
 * onOpen is a standard AppScript trigger, used to create and populate a menu.
 */
function onOpen() {
  const ui = SpreadsheetApp.getActiveSheet()
        ? SpreadsheetApp.getUi() : DocumentApp.getUi();
  ui.createMenu('Encrypted HTML')
  .addItem('Generate HTML','bury')
  .addToUi();
}
