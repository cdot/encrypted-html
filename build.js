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

// "production" or "debug" are valid
const build_mode = process.argv[2];

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
  return Fs.writeFile(file, data)
  .then(() => data);
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

const htmlMinifyOptions = {
  minifyCSS: true,
  minifyJS: {
    keep_classnames: false,
    keep_fnames: false,
    mangle: true
  },
  collapseWhitespace: true,
  removeComments: true,
//  removeAttributeQuotes: true,
  removeOptionalTags: true
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
      `${srcdir}/EndUser.html`,
      `${srcdir}/mainDialog.html`,
      `${srcdir}/downloadDialog.html`
    ],

    () => load(`${srcdir}/Bury.gs`)
    .then(bury_gs => {
      // Make the browser version of Burial and embed it
      let burial_js;
      return Promise.all([
        load(`${srcdir}/mainDialog.html`)
        .then(html => build_mode === "production" ? minifyhtml(html, htmlMinifyOptions) : html),
        load(`${srcdir}/downloadDialog.html`)
        .then(html => build_mode === "production" ? minifyhtml(html, htmlMinifyOptions) : html)
      ])
      .then(bits =>
        bury_gs = bury_gs
        .replace(/{{downloadDialog.html}}/s, JSON.stringify(bits[1]))
        .replace(/{{mainDialog.html}}/s, JSON.stringify(bits[0])))

      .then(() => load(`${srcdir}/Burial.js`))
      .then(js => strip(js, "ENCRYPT"))
      .then(js => build_mode === "production" ? strip(js, "PARANOID") : js)
      .then(js => burial_js = js.replace(/\s*export\s*{.*$/s, ""))

      // Load EndUser.html and embed it
      .then(() => load(`${srcdir}/EndUser.html`))
      .then(html => html.replace(/{{BURIAL}}/, burial_js))
      .then(html => build_mode === "production" ? minifyhtml(html, htmlMinifyOptions) : html)
      .then(html => bury_gs = embed(bury_gs, 'EndUser.html', html))

      // Concatenate convertToHtml
      .then(() => load(`${srcdir}/convertToHtml.gs`))
      .then(gs => bury_gs += gs)

      // Concatenate the gs version of Burial
      .then(() => load(`${srcdir}/Burial.js`))
      .then(js => js.replace(/\s*export\s*{.*$/s, ""))
      .then(gs => bury_gs + gs);
    })
    .then(gs => {
      if (build_mode !== "production")
        return gs;
      return minifyjs(gs, {
        keep_classnames: false,
        keep_fnames: false,
        mangle: true
      })
      .then(terse => terse.code);
    })
    .then(gs => save(`${distdir}/Bury.gs`, gs)))
]));
