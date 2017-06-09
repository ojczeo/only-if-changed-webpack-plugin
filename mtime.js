var fs = require('fs');
var async = require('async');

// function checkFileIsIgnored(file, ignoredDirs) {
//   console.log('checkFileIsIgnored called, ', ignoredDirs);
//   var ignore = false;
//   ignoredDirs.forEach(function(dir) {
//     console.log('checking!!!!', file, dir, file.indexOf(dir));
//     while (ignore !== true) {
//       console.log('checking!!!!', file, dir, file.indexOf(dir));
//       if (file.indexOf(dir) !== -1) {
//         ignore = true;
//       }
//     }
//   });
//   return ignore;
// }

function getFilesMtimes(files, concurrencyLimit, regExp, done) {
  var filesMtimes = {};
  if (regExp) {
    var testRegExp = new RegExp(regExp);
  }
  async.eachLimit(files, concurrencyLimit, function(file, fileDone) {
    fs.stat(file, function(statErr, stat) {
      if (statErr) {
        if (statErr.code === 'ENOENT') return fileDone();
        return fileDone(statErr);
      }
      if (regExp) {
        if (!testRegExp.test(file)) {
          filesMtimes[file] = stat.mtime.getTime();
        }
      } else {
        filesMtimes[file] = stat.mtime.getTime();
      }
      fileDone();
    });
  }, function(err) {
    if (err) return done(err);
    done(null, filesMtimes);
  });
}

function getFilesChanges(filesMtimes, concurrencyLimit, done) {
  var changed = [];
  var deleted = [];
  var files = Object.keys(filesMtimes);

  function eachFile(file, fileDone) {
    fs.stat(file, function(err, stat) {
      if (err) {
        deleted.push(file);
        return fileDone();
      }

      var mtimeNew = stat.mtime.getTime();
      if (!(filesMtimes[file] && mtimeNew && mtimeNew <= filesMtimes[file])) {
        changed.push(file);
      }
      fileDone();
    });
  }

  async.eachLimit(files, concurrencyLimit, eachFile, function() {
    done(deleted, changed);
  });
}

function hasAnyFileChanged(filesMtimes, concurrencyLimit, done) {
  getFilesChanges(filesMtimes, concurrencyLimit, function(deleted, changed) {
    var numFilesChanged = deleted.length + changed.length;
    done(null, numFilesChanged > 0);
  });
}

module.exports = {
  getFilesMtimes: getFilesMtimes,
  hasAnyFileChanged: hasAnyFileChanged,
};
