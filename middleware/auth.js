const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/user/login');
  };
  
  app.get('/home', isLoggedIn, (req, res) => {
    res.send(`Hello, ${req.user.displayName}`);
  });
  