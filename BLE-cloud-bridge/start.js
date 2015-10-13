var bridge = require('./index');

var argv = process.argv;
var delay = 15; // Default: 15 minutes

if (argv.length > 2) {
  delay = argv[2];
}
console.log('Records every', ((delay >= 1) ? delay + ' minutes' : (delay * 60) + ' secondes'));
bridge.start(delay * 60 * 1000);
