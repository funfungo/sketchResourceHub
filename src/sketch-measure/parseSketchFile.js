import * as fs from '@skpm/fs';
import path from '@skpm/path';
import child_process from '@skpm/child_process'; // ⚠️ The version 0.4.* requires Sketch 54 or above

function parseJSONFile(src) {
  return JSON.parse(fs.readFileSync(src), 'utf8');
}

function unzipSketch(filePath, dist) {
  return new Promise((resolve, reject) => {
    const task = child_process.spawn('unzip', [
      '-o', //不必先询问用户，unzip执行后覆盖原有的文件；
      filePath,
      '-d',
      dist
    ]);
    task.stdout.on('data', data => {
      console.log(`stdout: ${data}`);
    });
    task.stderr.on('data', data => {
      console.error(`stderr: ${data}`);
    });
    task.on('close', resolve);
    task.on('exit', resolve);
    task.on('error', reject);
  });
}

export function parseSketchFile(filePath, tmpPath) {
  const res = {
    path: tmpPath,
    pages: {}
  };
  return new Promise((resolve, reject) => {
    unzipSketch(filePath, tmpPath)
    .then(() => {
      const meta = parseJSONFile(`${tmpPath}/meta.json`);
      const document = parseJSONFile(`${tmpPath}/document.json`);
      res.meta = meta;
      res.document = document;

      const ids = Object.keys(meta.pagesAndArtboards);
      res.pages = ids
        .map(id => parseJSONFile(`${tmpPath}/pages/${id}.json`))
        .reduce((acc, val, i) => {
          acc[ids[i]] = val;
          return acc;
        }, {});
      resolve(res);
    })
    .catch(e => {
      reject(e);
      console.error(e);
    });
  })

}
