import sketch from 'sketch';
const { promisedExec } = require('./utils');
var dataDocument = require('sketch/dom').getSelectedDocument();

// sketchtool path
const sketchtool =
  '/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool';

const RE_IMG = /Exported\s([^\n]+)@2x.png\n?/g;

// We should prevent to duplicate image with save name.
function getFilesFromMsg(msg) {
  const files = {};
  let match;
  while ((match = RE_IMG.exec(msg)) != null) {
    files[match[1]] = true;
  }
  return Object.keys(files);
}

export function generatePreviewImages(file, dest, scale) {
  return promisedExec(`${sketchtool}`, ['-v']).then(() => {
    return promisedExec(`${sketchtool}`, [
      'export',
      'artboards',
      file,
      `--output=${dest}`,
      `--formats=png`,
      '--use-id-for-name=YES',
      '--scales=2'
    ]).then(msg => {
      return getFilesFromMsg(msg)
    });
  });
}

export function generateSliceImages(file, dest, scale) {
  return promisedExec(`${sketchtool} -v`).then(() => {
    return promisedExec(
      `${sketchtool} export slices ${escape(file)} --output=${escape(
        dest
      )} --format='png' --scales='${scale || '2.0'}'`
    ).then(msg => {
      return getFilesFromMsg(msg);
    });
  });
}

export function rename(src, dest) {
  return promisedExec('mv', [src, dest]);
}

function escape(url) {
  // Wrap with quotes, so space, parenthese and other special characters
  // wont interrupt cli.
  return `"${url}"`;
}
