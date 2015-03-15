var express = require('express');
var router = express.Router();
path = require('path');
var mongo = require('../controllers/mongo');

/* GET index page. */
router.get('/', function(req, res, next) {
    if (req.session.username) {
        console.log(req.session.username);
        var coll = mongo.collection('users');
        coll.findOne({username: req.session.username}, function(err, user){
            if (user) {
                // set a 'user' property on req
                // so that the 'requireUser' middleware can check if the user is
                // logged in
                req.user = user;

                // Set a res.locals variable called 'user' so that it is available
                // to every handlebars template.
                res.locals.user = user;
            }
            res.render('moderator', {user:user});
        });
    } else {
        res.render('login');
    }
});

/* GET moderator page. */
router.get('/moderator', function(req, res, next) {
    //res.sendFile(path.resolve(__dirname + '/../views/moderator.hbs'));
    res.render('moderator');
});

/* GET wall page. */
router.get('/wall', function(req, res, next) {
    res.render('wall');
});

module.exports = router;
