const fs = require('fs');
const Path = require('path');

export const deleteFolderRecursive = function(path: string) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file: string, index: string) => {
      const curPath = Path.join(path, file);
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};