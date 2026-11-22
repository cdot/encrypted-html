/* global SpreadsheetApp, DocumentApp, HtmlService, Utilities */
/* global Burial, convertToHtml */

// Shared CSS for dialogs
const dialogCss = `
  body {
    font-family: system-ui, -apple-system, sans-serif;
    text-align: center;
    padding: 30px;
    color: #202124;
    background: #f8f9fa;
  }
  .btn {
    background: #1a73e8;
    color: white;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 4px;
    display: inline-block;
    font-weight: 500;
    margin-top: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
  .btn:hover {
    background: #1557b0;
  }
  p {
    margin: 10px 0;
    color: #5f6368;
    font-size: 12pt;
  }`;

const mainDialogHtml = `
<html>
  <head>
    <style>${dialogCss}</style>
  </head>
  <body>
    Export the current sheet as an encrypted HTML file. This can be
    downloaded onto a device and opened in a browser if the correct
    password is entered before the expiry date.
    <p>
      <label for="pass">Password</label>
      <input id ="pass" type="password" />
    </p>
    <p>
      <label for="expires">Expires (optional)</label>
      <input id="expires" type="date" value="never" />
    </p>
    <script>
      function generate() {
        const params = {
          pass: document.getElementById("pass").value,
          expires: new Date(document.getElementById("expires").value).getTime(),
          html: document.getElementById('html').innerHTML
        };
        // Call back to Bury.gs
        google.script.run
        .withSuccessHandler(() => google.script.host.close())
        .generateOfflineHtmlDownload(params);
      }
    </script>
    <a id="generate" class="btn" onclick="generate()">Generate</a>
    <div id="html" style="display:none">{{html}}</div>
  </body>
</html>`;

const downloadDialogHtml = `
<html>
  <head>
    <style>${dialogCss}</style>
  </head>
  <body>
    <p>
      The encrypted HTML is ready for download.
    </p>
    <a id="downloadBtn" class="btn" download="{{outputFilename}}" href="{{dataUri}}">Download {{outputFilename}}</a>
    <p style="margin-top: 20px; font-size: 12px;">If the download doesn't start automatically, click the button above.</p>
    <script>
      // Automatically trigger the download when the dialog loads
      window.onload = function() {
        const btn = document.getElementById('downloadBtn');
        btn.click();
      };
    </script>
  </body>
</html>`;

const endUserHtml = "{{END_USER_HTML}}";

const unburyScript = "{{UNBURY_SCRIPT}}";

/**
 * Main entry point. Extract an HTML version of the document/sheet and
 * invoke MainDialog to initiate the encryption process.
 */
function bury() {
  // Open main dialog to prompt for password and (optional) expiry date.
  // It will callback to generateOfflineHtmlDownload
  const html = mainDialogHtml.replace(/{{html}}/, convertToHtml());
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
  const html = options.html;
  const ui = SpreadsheetApp.getActiveSheet()
        ? SpreadsheetApp.getUi() : DocumentApp.getUi();

  // Encrypt the content
  const crypted = new Burial().encrypt(html, pass, expires);

  // Get the end user HTML and embed the encrypted content and decryption code.
  // We can't use Templates because they make the HTML minifier fall over.
  const euhtml = endUserHtml
        .replace(/{{content}}/s, crypted)
        .replace(/{{script}}/s, unburyScript);
  // Convert HTML string to a Base64 Data URI for direct browser download
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
