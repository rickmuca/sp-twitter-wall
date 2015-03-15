module.exports = function(req, res, next){
    if (!req.user) {
        res.redirect('/not_allowed');
    } else {
        next();
    }
};