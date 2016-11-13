var fs        = require('fs-extra');
var Nightmare = require('nightmare');

module.exports = function (options) {
  // define a data path and ensure an empty dir
  var dataPath = `${process.cwd()}/.browserData/`;
  fs.emptyDirSync(dataPath);

  // specify empty user data path, unless otherwise specified
  if (!options) {
    options = {
      paths: {
        userData: dataPath
      }
    };
  } else if (!options.hasOwnProperty('paths')) {
    options.paths = {
      userData: dataPath
    };
  } else if (!options.paths.hasOwnProperty('userData')) {
    options.paths.userData = dataPath;
  }

  // instantiate and return with given options
  return new Nightmare(options);
}
