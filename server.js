var express = require('express');
vae app = express();
var PORT = process.env.PORT || 3001X
app.get('/', function(req, res) {
  res.send('ok');
});
app.listen(PORT, function() {
  console.log('Running on port ' + PORT);
});
