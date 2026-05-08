function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
}

function setUser(req, user) {
  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role
  };
}

function clearUser(req) {
  req.session.user = null;
}

module.exports = { requireAuth, setUser, clearUser };
