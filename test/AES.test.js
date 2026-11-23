//START_MOCHA
import { assert } from "chai";

/* global describe, it, beforeEach, afterEach, before, after */

import { Burial } from "../src/Burial.js";
//END_MOCHA

if (typeof SpreadsheetApp !== "undefined") {
  // Mocked Mocha for Appscript
  globalThis.assert = (cond) => {
    if (!cond) throw Error("assert failed");
  };

  globalThis.describe = (text, fn) => {
    console.log(`${text}`);
    fn();
  };

  globalThis.it = (text, fn) => {
    console.log(`\t${text}`);
    fn();
  };
}

/**
 * Test encryption component. Done this way so it can be run in appscript
 * which doesn't support mocha.
 */
describe("AES", () => {
  const input1 = "I want to break free from your lies";
  const password1 = "You're so self-satisfied";

  const input2 = "I've fallen in love for the first time";
  const password2 = "And this time I know it's for real";

  it("sameBurial", () => {
    const cryo = Burial.encrypt(input1, password1);
    assert(cryo != input1);
    const oyrc = Burial.decrypt(cryo, password1);
    assert(oyrc === input1);
  });

  it("differentBurials", () => {
    const cryo = Burial.encrypt(input1, password1);
    assert(cryo != input1);
    const oyrc = Burial.decrypt(cryo, password1);
    assert(oyrc === input1);
  });

  it("throwsOnIncorrectPass", () => {
    const cryo = Burial.encrypt(input1, password1);
    assert(cryo != input1);

    try {
      bury.decrypt(cryo, password2);
      assert(false);
    } catch (e) {
    }
  });

  it("throwsOnWrongSignature", () => {
    const cryo = Burial.encrypt(input1, password1);
    assert(cryo != input1);

    try {
      Burial.decrypt(cryo, password1);
      assert(false);
    } catch (e) {
    }
  });

  it("throwsOnExpired", () => {
    const cryo = Burial.encrypt(input2, password1, Date.now());

    try {
      Burial.decrypt(cryo, password1);
      assert(false);
    } catch (e) {
    }
  });

  it("trial", () => {
    const data = `<meta charset="UTF-8">
<h1>Watering Computer KH 4038</h1>
<p></p>
<ol>
<li>Water spigot connection (3/4“)</li>
<li>Hose connection (3/4“)</li>
<li>Cover</li>
<li>Operating panel</li>
<li>Display</li>
<li>Time display</li>
<li>Watering frequency display</li>
<li>Program number display</li>
<li>Countdown symbol</li>
<li>Manual mode symbol</li>
<li>Watering ON/OFF indicator</li>
</ol>
<p>If the display shows <strong>“</strong><strong>L</strong><strong>O</strong><strong>”</strong>, the batteries must be replaced. The watering computer retains its settings while “PO” flashes on the display. Once the display turns blank, all programming is lost.</p>
<h2>Setting the Clock</h2>
<ol>
<li>Open the cover.</li>
<li>Press the <strong>“</strong><strong>M</strong><strong>”</strong> button repeatedly until a bar appears above the clock symbol and flashes under <strong>M</strong><strong>O</strong><strong>N</strong>.</li>
<li>Use the <strong>“</strong><strong>+</strong><strong>”</strong> or <strong>“</strong><strong>–</strong><strong>”</strong> button to set the current day.</li>
<li>Set the current hour using <strong>“</strong><strong>+</strong><strong>”</strong> or <strong>“</strong><strong>–</strong><strong>”</strong>.</li>
<li>Set the current minutes using <strong>“</strong><strong>+</strong><strong>”</strong> or <strong>“</strong><strong>–</strong><strong>”</strong>.</li>
</ol>
<h2>Programming the Watering Schedule</h2>
<p>The watering computer supports up to:</p>
<ul>
<li>6 start times</li>
<li>6 stop times</li>
</ul>
<ol>
<li>Press the <strong>“</strong><strong>M</strong><strong>”</strong> button until a bar appears above <strong>P</strong> on the display.</li>
<li>The unit is now in programming mode.</li>
</ol>
<h2>Setting the Watering Frequency</h2>
<p>Choose one of the following frequency options using the <strong>“</strong><strong>+</strong><strong>”</strong> or <strong>“</strong><strong>–</strong><strong>”</strong> buttons:</p>
<ul>
<li><strong>U</strong> = Custom watering days</li>
<li><strong>1</strong> = Every day</li>
<li><strong>2</strong> = Every second day</li>
<li><strong>3</strong> = Every third day, etc.</li>
</ul>
<p>The selected frequency appears next to <strong>F</strong><strong>R</strong><strong>E</strong><strong>Q</strong>.</p>
<h2>Setting Watering Times</h2>
<ol>
<li>Select a program number using <strong>“</strong><strong>+</strong><strong>”</strong> or <strong>“</strong><strong>–</strong><strong>”</strong>.</li>
<li>Set the start hour.</li>
<li>Set the start minutes.</li>
<li>Set the stop time in the same way.</li>
<li>Press <strong>“</strong><strong>M</strong><strong>”</strong> until a bar appears above <strong>A</strong>.</li>
</ol>
<h2>Setting Watering for Specific Days</h2>
<ol>
<li>Press <strong>“</strong><strong>M</strong><strong>”</strong> until a bar appears above <strong>P</strong>.</li>
<li>Set the frequency to <strong>U</strong> using the <strong>“</strong><strong>+</strong><strong>”</strong> button.</li>
<li>Select the desired day of the week.</li>
<li>Confirm the selection.</li>
<li>Choose a program number.</li>
<li>Set the watering times as described earlier.</li>
<li>Press <strong>“</strong><strong>M</strong><strong>”</strong> until a bar appears above <strong>A</strong>.</li>
</ol>
<h2>Deleting a Program</h2>
<ol>
<li>Press <strong>“</strong><strong>M</strong><strong>”</strong> until a bar appears above <strong>P</strong>.</li>
<li>Select the program you want to delete.</li>
<li>Press the delete/select button.</li>
<li>The program time disappears from the display.</li>
<li>Press <strong>“</strong><strong>M</strong><strong>”</strong> until a bar appears above <strong>A</strong> to return to automatic mode.</li>
</ol>
<h2>Skipping a Program</h2>
<p>To temporarily override a programmed action:</p>
<ol>
<li>Press the skip button.</li>
<li>The skip symbol appears on the display.</li>
</ol>
<p>The unit will return to normal operation at the next programmed event.</p>
<h2>Manual Watering / Countdown Mode</h2>
<ol>
<li>Press the manual mode button.</li>
<li>“OFF” flashes on the display.</li>
<li>Press the button repeatedly to cycle through the available options.</li>
</ol>
<p>When a countdown time is selected, the countdown symbol appears on the display.</p>
<h1>Troubleshooting</h1>
<h2>Display is Blank</h2>
<ul>
<li>Check that the batteries are inserted correctly.</li>
<li>Check that battery contacts are clean.</li>
<li>Replace the batteries if necessary.</li>
</ul>
<h2>Watering Does Not Start</h2>
<ul>
<li>Check the programmed settings.</li>
<li>Check the batteries.</li>
<li>Ensure the water tap is turned on.</li>
</ul>
<h1>Technical Specifications</h1>
<ul>
<li>Minimum flow rate: 15 l/min</li>
<li>Water pressure: 1.379 – 8.274 bar</li>
<li>Power supply: 2 × 1.5 V alkaline batteries</li>
</ul>
<h1>Warranty and Service</h1>
<p> Kompernaß Handelsgesellschaft mbH
 Burgstr. 21
 D-44867 Bochum</p>
`;
    const cryo = Burial.encrypt(data, "");
    const oyrc = Burial.decrypt(cryo, "");
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== oyrc[i])
        console.log(i, " ", data.codePointAt(i), "!=", oyrc.codePointAt(i));
      assert(data[i] == oyrc[i]);
    }
    assert(oyrc == data);
  });
});

// entry point for appscript, ignored by Mocha
function test() {}
