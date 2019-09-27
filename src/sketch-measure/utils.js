const { exec, spawn } = require('@skpm/child_process');

export function toHex(num, minLength) {
  if (typeof num !== 'number' || Number.isNaN(num)) {
    throw new Error('First argument should be a number.');
  }
  let hex = num.toString(16);
  if (minLength && hex.length < minLength) {
    hex =
      Array.apply(null, {
        length: minLength - hex.length
      })
        .map(v => '0')
        .join('') + hex;
  }
  return hex;
}

export function round(num, precision) {
  num = +num;
  if (Number.isNaN(num)) return NaN;
  precision = +precision;
  if (Number.isNaN(precision)) precision = 0;

  return Number(
    '' + Math.round(num * Math.pow(10, precision)) + 'e-' + precision
  );
}

export function convertRGBToHex(r, g, b) {
  return (toHex(r, 2) + toHex(g, 2) + toHex(b, 2)).toUpperCase();
}

export function toPercentage(num, precision) {
  if (typeof num !== 'number' || Number.isNaN(num)) {
    throw new Error('First argument should be a number.');
  }
  if (typeof precision !== 'number') {
    precision = 2;
  }
  return (num * 100).toFixed(precision) + '%';
}

const slugRe = /(\s+|\/+)/g;
/**
 * format layerName by connect pageName and artboardName by '-'
 * @param  {Object} pageName       layer
 * @param  {Object} artboardName      result data
 * @return {String}              layers should append
 */
export function getSlug(pageName, artboardName) {
  if (
    !pageName ||
    !artboardName ||
    typeof pageName !== 'string' ||
    typeof artboardName !== 'string'
  ) {
    throw new Error('Arguments should be non-empty string.');
  }
  let pn = pageName.replace(slugRe, '-');
  let an = artboardName.replace(slugRe, '-');

  return (pn + '-' + an).toLowerCase();
}

/**
 * execute command line cmd
 * @param  {String} cmd
 * @param  {Array} options
 * @return {Undefined}
 */
export function promisedExec(cmd, options) {
  return new Promise((resolve, reject) => {
    let task = spawn(cmd, options);
    task.stdout.on('data', data => {
      console.log(`stdout: ${data}`);
    });
    task.stderr.on('data', data => {
      console.log(`stdout: ${data}`);
    });
    task.on('close', resolve);
    task.on('error', reject);
  });
}
