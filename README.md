# encrypted-secret

Google appscript to support the distribution of Personally Identifiable Information (PII)
in an encrypted container, so that event organisers are able to access the PII in event
of an emergency, but the information is protected from casual inspection.

You can set a time limit on the password so it expires after a certain date.
Uses AES 256-bit encryption to encrypt the content.

To build the appscript, use `npm run build`. The main appscript is in dist/Bury.gs, which then has to be pasted into a code file in the Google script editor.
It adds a menu item to invoke the module.
