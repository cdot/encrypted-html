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
    const bury = new Burial();
    const cryo = bury.encrypt(input1, password1);
    assert(cryo != input1);
    const oyrc = bury.decrypt(cryo, password1);
    assert(oyrc === input1);
  });

  it("differentBurials", () => {
    const cryo = new Burial().encrypt(input1, password1);
    assert(cryo != input1);
    const oyrc = new Burial().decrypt(cryo, password1);
    assert(oyrc === input1);
  });

  it("throwsOnIncorrectPass", () => {
    const bury = new Burial();
    const cryo = bury.encrypt(input1, password1);
    assert(cryo != input1);

    try {
      bury.decrypt(cryo, password2);
      assert(false);
    } catch (e) {
    }
  });

  it("throwsOnWrongSignature", () => {
    const cryo = new Burial().encrypt(input1, password1);
    assert(cryo != input1);

    try {
      new Burial("madras").decrypt(cryo, password1);
      assert(false);
    } catch (e) {
    }
  });

  it("throwsOnExpired", () => {
    const cryo = new Burial().encrypt(input2, password1, Date.now());

    try {
      new Burial().decrypt(cryo, password1);
      assert(false);
    } catch (e) {
    }
  });
});

// entry point for appscript, ignored by Mocha
function test() {}
