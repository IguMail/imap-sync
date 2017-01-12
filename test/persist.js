var storage = require('node-persist');

storage.init().then(function() {

  storage.getItem('name').then(function(value) {
    console.log(value); // yourname
    process.exit()
  })

  return


  return storage.setItem('name', 'yourname')
    .then(function() {

      return storage.getItem('name').then(function(value) {
        console.log(value); // yourname
      })
    })
});

