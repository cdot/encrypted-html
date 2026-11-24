# encrypted-secret

## Introduction

Google appscript to support the distribution of confidential information from a Google spreadsheet or document
in an encrypted HTML file.

The motivation for this was our SCUBA diving club, where volunteer dive managers need access to Personally Identifiable Information (PII) in event of an emergency -
which could happen anywhere, maybe many miles from a mobile signal. We needed some way of sharing the PII with them while protecting it from inspection by anyone not in possession of a password.

You can set a time limit on the password so it expires after a certain date, so when the trip or even is over access to the PII is no longer possible, even if you know
the password.

## Example

<p>Input spreadsheet</p>
<img width="698" height="359" alt="image" src="https://github.com/user-attachments/assets/85320eef-aaad-40e5-8e91-fffbfb14fc49" />
<p>Invoke the menu</p>
<img width="414" height="148" alt="image" src="https://github.com/user-attachments/assets/a1ba62ac-9f21-4b34-92ec-6c0d8b42b8dd" />
<p>Fill in the dialog</p>
<img width="448" height="396" alt="image" src="https://github.com/user-attachments/assets/78440672-bbe6-4380-84ae-a6672b9b68f8" />
<p>Download the file</p>
<img width="977" height="380" alt="image" src="https://github.com/user-attachments/assets/65c39a71-bfed-414b-9355-7c42af33a7ee" />
<p></p>
You could e.g. attach the file to an email to the end user. When they open it in a browser, they see:
<p></p>
<img width="515" height="252" alt="image" src="https://github.com/user-attachments/assets/82656879-4ae8-435a-b8e6-247efe812d9e" />
<p>and when decrypted</p>
<img width="621" height="346" alt="image" src="https://github.com/user-attachments/assets/32a5b1d7-0c54-4cba-8024-3f3bb942206a" />

## Using

The appscript has to be loaded into any document or spreadsheet that will provide the source data. To build the appscript, use `npm run production`. The appscript is in `dist/Bury.gs`, the contents of which have to be pasted into a code file in the Google script editor. It adds a menu item to invoke the module when the containing document is next opened.

Note that the HTML is just an approximation of the original. Most formatting is lost.

## Technical stuff
`npm run debug` will create a functionally identical, but unminimised, version.

Uses AES 256-bit encryption to encrypt the content.
