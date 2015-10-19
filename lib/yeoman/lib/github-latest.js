var request = require('request');
var deasync = require('deasync');

var latest = function(username, repo, fn) {
  request({
    url: 'https://api.github.com/repos/' + username + '/' + repo + '/git/refs/tags/',
    headers: { 'user-agent': 'https://github.com/request/request' }
  }, function (err, res, body) {
    if(!(/^200/).test(res.headers.status))
      return fn(new Error(res.headers.status));

    try {
      var fuzzyver = /^\s*v?(\d+)\.(\d+)(?:\.(\d+))?\s*$/;
      var tags = JSON.parse(body)
        .map(function(item){
          return item.ref.split('/').pop();
        })
        .filter(RegExp.prototype.test.bind(fuzzyver))
        .sort(function (a, b) {
          var ma = a.match(fuzzyver);
          var mb = b.match(fuzzyver);

          if (ma[1] == mb[1]) {
            if (ma[2] == mb[2]) {
              ma[3] = ma[3] || '0';
              mb[3] = mb[3] || '0';
              if (ma[3] == mb[3])
                return 0;
              else if (parseInt(ma[3]) > parseInt(mb[3]))
                return 1;
              else
                return -1;
            }
            else if (parseInt(ma[2]) > parseInt(mb[2]))
              return 1;
            else
              return -1;
          }
          else if (parseInt(ma[1]) > parseInt(mb[1]))
            return 1;
          else
            return -1;
        });
    } catch (e) {
      return fn(e);
    }

    fn(null, tags.pop());
  });
};

module.exports = deasync(latest);
