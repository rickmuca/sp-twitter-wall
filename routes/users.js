var express = require('express');
var router = express.Router();
var mongo = require('../controllers/mongo');

// This is a middleware that we will use on routes where
// we _require_ that a user is logged in, such as the /secret url
function requireUser(req, res, next){
    if (!req.user) {
        res.redirect('/not_allowed');
    } else {
        next();
    }
}

// This creates a new user and calls the callback with
// two arguments: err, if there was an error, and the created user
// if a new user was created.
//
// Possible errors: the passwords are not the same, and a user
// with that username already exists.
function createUser(username, password, password_confirmation, hashtag, admin,  callback){
    var coll = mongo.collection('users');

    if (password !== password_confirmation) {
        var err = 'The passwords do not match';
        callback(err);
    } else {
        var query      = {username:username};
        var userObject = {username: username, password: password, hashtag: hashtag, admin: admin};

        // make sure this username does not exist already
        coll.findOne(query, function(err, user){
            if (user) {
                err = 'The username you entered already exists';
                callback(err);
            } else {
                // create the new user
                coll.insert(userObject, function(err,user){
                    callback(err,user);
                });
            }
        });
    }
}

// This finds a user matching the username and password that
// were given.
function authenticateUser(username, password, callback){
    var coll = mongo.collection('users');

    coll.findOne({username: username, password:password}, function(err, user){
        callback(err, user);
    });
}

/* GET index page. */
router.get('/', function(req, res, next) {
    var coll = mongo.collection('users');
    coll.find({}).toArray(function(err, users){
        res.render('index', {users:users});
    })
});

router.get('/login', function(req, res){
    res.render('login');
});

router.get('/logout', function(req, res){
    delete req.session.username;
    res.redirect('/');
});

router.get('/not_allowed', function(req, res){
    res.render('not_allowed');
});


router.get('/signup', function(req,res){
    res.render('signup');
});

router.post('/signup', function(req, res){
    console.log(req);
    var username = req.body.username;
    var password = req.body.password;
    var password_confirmation = req.body.password_confirmation;
    var hashtag = req.body.hashtag;
    var admin = false;
    if (req.body.admin) admin = true;

    createUser(username, password, password_confirmation, hashtag, admin, function(err, user){
        if (err) {
            res.render('signup', {error: err});
        } else {

            // This way subsequent requests will know the user is logged in.
            req.session.username = user.username;

            res.redirect('/');
        }
    });
});

router.post('/login', function(req, res){
    // These two variables come from the form on
    // the views/login.hbs page
    var username = req.body.username;
    var password = req.body.password;

    authenticateUser(username, password, function(err, user){
        if (user) {
            // This way subsequent requests will know the user is logged in.
            req.session.username = user.username;

            res.redirect('/');
        } else {
            res.render('login', {badCredentials: true});
        }
    });
});

module.exports = router;
