var express = require('express');
var router = express.Router();
var mongo = require('../controllers/mongo');
var ObjectID = require('mongodb').ObjectID;

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

function modifyUser(id, hashtag, admin,  callback){
    var coll = mongo.collection('users');

    var query      = {_id: ObjectID(id)};

    // make sure this username does not exist already
    coll.findOne(query, function(err, user){
        if (!user) {
            err = 'The username you entered already exists';
            callback(err);
        } else {
            // modify the user
            user.hashtag = hashtag;
            user.admin = admin;
            coll.save(user, function(err,user){
                callback(err,user);
            });
        }
    });
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
    res.redirect('/');
});

router.get('/login', function(req, res){
    res.render('login');
});

router.get('/logout', function(req, res){
    delete req.session.username;
    res.redirect('/');
});


router.get('/signup', function(req,res){
    if (req.session.username) {
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

                if (user.admin === true) {
                    res.render('signup');
                }
                else {
                    res.redirect('/')
                }
            }
            else {
                res.redirect('/')
            }
        });
    } else {
        res.render('login');
    }
});

router.post('/signup', function(req, res){
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
            res.redirect('/admin');
        }
    });
});

router.get('/modify/:id', function(req,res){
    if (req.session.username) {
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

                if (user.admin === true) {
                    coll.findOne({_id: ObjectID(req.params.id)}, function(err, userModified) {
                        if(userModified) {
                            res.render('modify', {user: userModified});
                        }
                        else {
                            err = 'The user not exists';
                            callback(err);
                        }
                    });
                }
                else {
                    res.redirect('/')
                }
            }
            else {
                res.redirect('/')
            }
        });
    } else {
        res.render('login');
    }
});

router.delete('/:id', function(req,res, callback){
    if (req.session.username) {
        var coll = mongo.collection('users');
        coll.findOne({username: req.session.username}, function(err, user){
            if (user) {
                req.user = user;
                res.locals.user = user;

                if (user.admin === true) {
                    coll.findOne({_id: ObjectID(req.params.id)}, function(err, userDeleted) {
                        if(userDeleted) {
                            coll.remove(userDeleted, function(err,user){
                                callback(err,user);
                            });
                        }
                        else {
                            err = 'The user not exists';
                            callback(err);
                        }
                    });
                }
                else {
                    res.redirect('/')
                }
            }
            else {
                res.redirect('/')
            }
        });
    } else {
        res.render('login');
    }
});

router.post('/modify', function(req, res){
    var id = req.body.user_id;
    var hashtag = req.body.hashtag;
    var admin = false;
    if (req.body.admin) admin = true;

    modifyUser(id, hashtag, admin, function(err, user){
        res.redirect('/admin');
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
