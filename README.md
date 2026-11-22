# encrypted-secret
Given a Google Spreadsheet sheet or Document, download an HTML file that contains a version of the content that can only be unlocked by a password.
You can set a time limit on the password so it expires after a certain date.

The goal is to support the distribution of Personally Identifiable Information (PII) in an encrypted contain so that event organisers are able to
access the PII in event of an emergency, but the information is protected from casual inspection.

Uses AES 256-bit encryption to encrypt the content.

To build the appscript, use `npm run build`. The main appscript is in dist/Bury.gs, which then has to be pasted into a code file in the Google script editor.
It adds a menu item to invoke the module.
