# encrypted-secret

## Introduction

Google appscript to support the distribution of confidential information from a Google spreadsheet or document
in an encrypted container.

The motivation for this was our dive club, where volunteer dive managers need access to Personally Identifiable Information (PII) in event of an emergency -
which could happen anywhere, maybe many miles from a mobile signal. We needed some way of sharing the PII with them while protecting it from casual inspection.
You can set a time limit on the password so it expires after a certain date, so when the trip or even is over access to the PII is no longer possible, even if you know
the password.

## Example
![Input](images/1_input.png) ![Menu](images/2_menu.png) ![Main Dialog](images/3_mainDialog.png) ![Download Dialog](images/4_downloadDialog.png)

Download the file, then attach it in an email to the end user. When they open it in a browser, they see:

![Encrypted](images/5_encrypted.png)  <img width="621" height="346" alt="image" src="https://github.com/user-attachments/assets/e2e07f56-c225-487a-a02e-6d46d751c8ba" />


## Using

The appscript has to be loaded into any document or spreadsheet that will provide the source data. To build the appscript, use `npm run production`. The main appscript is in dist/Bury.gs, which then has to be pasted into a code file in the Google script editor. It adds a menu item to invoke the module when the containing document is next opened.

## Technical stuff
`npm run debug` will create a functionally identical, but unminimised, version.

Uses AES 256-bit encryption to encrypt the content.
