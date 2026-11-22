/**
 * Simple make
 */
import Path from 'path';
import { fileURLToPath } from 'url';
const __dirname = Path.dirname(fileURLToPath(import.meta.url));
import { promises as Fs } from "fs";
import { minify as minifyjs } from "terser";
import { minify as minifyhtml } from 'html-minifier';

const srcdir = Path.resolve(`${__dirname}/src`);
const testdir = Path.resolve(`${__dirname}/test`);
const distdir = Path.resolve(`${__dirname}/dist`);

/**
 * Compares the last-modified timestamps of two files.
 * @returns {Promise<boolean>}
 *   true if fileB is newer than file
 *   false otherwise
 */
function isNewer(fileA, fileB) {
  return Promise.all([ Fs.stat(fileA), Fs.stat(fileB) ])
  .then(t => t[0].mtimeMs < t[1].mtimeMs)
  .catch(e => true);
}

/**
 * If target is newer than any of the sources, run the process function
 */
function dependsOn(target, sources, process) {
  return Promise.all(sources.map(s => isNewer(target, s)))
  .then(newer => {
    if (newer.indexOf(true) >= 0) {
      console.log(
        `Regenerating ${target} because of ${sources.filter((s, i) => newer[i]).join(", ")}`);
      return process();
    }
    else
      return Promise.resolve(false);
  });
}

function load(s) {
  return Fs.readFile(s)
  .then(buf => buf.toString());
}

function save(file, data) {
  return Fs.writeFile(file, data);
}

function embed(ins, tag, emb) {
  return ins.replace(`{{${tag}}}`, JSON.stringify(emb).replace(/"(.*)"/, "$1"));
}

/**
 * Remove content outside //START_sym..//END_sym which
 * should be on a line of their own
 */
function strip(js, sym) {
  const re = new RegExp(`//\s*START_${sym}.*?//\s*END_${sym}`, "gs");
  let njs = js;
  do {
    js = njs;
    njs = js.replace(re, "");
  } while (njs !== js);
  return Promise.resolve(njs);
}

const minifyjs_options = {
  keep_classnames: false,
  keep_fnames: false,
  mangle: {
    reserved: [ "Burial", "handleDecrypt" ]
  }
};


// Make the dist dir if necessary
Fs.mkdir(distdir, { recursive: true })

// Process dependencies
.then(() => Promise.all([

  // appscript test code, string START_MOCHA...END_MOCHA
  dependsOn(
    `${distdir}/AES.test.gs`,
    [ `${testdir}/AES.test.js` ],
    () => load(`${testdir}/AES.test.js`)
    .then(src => strip(src, "MOCHA"))
    .then(src => save(`${distdir}/AES.test.gs`, src))),

  dependsOn(
    `${distdir}/Bury.gs`,
    [
      `${srcdir}/Bury.gs`,
      `${srcdir}/Burial.js`,
      `${srcdir}/convertToHtml.gs`,
      `${srcdir}/EndUser.html`
    ],
    () => load(`${srcdir}/Bury.gs`)
    .then(bury_gs => {
      // Make the browser version of Burial and embed it
      return load(`${srcdir}/Burial.js`)
      .then(js => strip(js, "ENCODE"))
      .then(js => strip(js, "TESTING"))
      .then(js => minifyjs(js, minifyjs_options))
      .then(terse => bury_gs = embed(bury_gs, 'UNBURY_SCRIPT', terse.code))

      // Make the compressed version of EndUser.html and embed it
      .then(() => load(`${srcdir}/EndUser.html`))
      .then(html => minifyhtml(html, {
        minifyCSS: true,
        collapseWhitespace: true,
        removeComments: true,
        removeAttributeQuotes: true,
        removeOptionalTags: true
      }))
      .then(html => bury_gs = embed(bury_gs, 'END_USER_HTML', html))

      // Concatenate convertToHtml
      .then(() => load(`${srcdir}/convertToHtml.gs`))
      .then(gs => bury_gs += gs)

      // Concatenate the gs version of Burial
      .then(() => load(`${srcdir}/Burial.js`))
      .then(js => strip(js, "BROWSER"))
      .then(gs => bury_gs += gs)

      .then(() => save(`${distdir}/Bury.gs`, bury_gs));
    }))
]));
