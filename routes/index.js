var express = require('express');
var router = express.Router();
path = require('path');
var mongo = require('../controllers/mongo');
var Twitter = require('twitter');
var twitter_clients = [];


function timeConverter(timestamp){
    var a = new Date(parseInt(timestamp));
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = ("0" + a.getHours()).slice(-2);
    var min = ("0" + a.getMinutes()).slice(-2);
    var time = date + ', ' + month + ' ' + year + ' ' + hour + ':' + min;
    return time;
}



/* GET admin page  */
router.get('/admin', function(req, res, next) {
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
                    coll.find({}).toArray(function(err, users){
                        res.render('admin_panel', {users:users});
                    })
                }
            }
        });
    } else {
        res.render('login');
    }
});

/* GET index page.
 *
 *  If user is logged in, moderator page is shown. Else, log in page is shown
 *  */
router.get('/', function(req, res, next) {
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
            }
            res.redirect('/moderator');
        });
    } else {
        res.render('login');
    }
});

/* GET moderator page */
router.get('/moderator', function(req, res, next) {
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

                twitter_clients[user.hashtag] = new Twitter({
                    consumer_key: 'l0RgpgwZqmFHELC4mLFbweiPn',
                    consumer_secret: 'elePPB56ILavK7sGmcpvZqn1LuENe5B6ikLMYILpZIyH1w2HDd',
                    access_token_key: '1903965426-BX530HWvnDW6uEt7F8ezpnsuCzNjGlrjVpY2Lwd',
                    access_token_secret: '4iZ6r19k7tWlxT4nYa4oQbj2KMFeUyK9vEweYdpgaQ7Gf'
                });

                twitter_clients[user.hashtag].stream('statuses/filter', {track: user.hashtag}, function(stream) {
                    stream.on('data', function(tweet) {
                        global.io.sockets.emit(user.hashtag, {
                            id: tweet.id,
                            user_name: tweet.user.name,
                            user: tweet.user.screen_name,
                            user_img: tweet.user.profile_image_url,
                            text: tweet.text,
                            date: timeConverter(tweet.timestamp_ms)
                        });
                    });

                    stream.on('error', function(error) {
                        throw error;
                    });
                });

                var clients = {};

                global.io.on('connection', function (socket) {
                    twitter_clients[user.hashtag].get('search/tweets', {q: user.hashtag, count: 10}, function(error, tweets, response) {
                        tweets.statuses.forEach(function(tweet) {
                            socket.emit(user.hashtag, {
                                id: tweet.id,
                                user_name: tweet.user.name,
                                user: tweet.user.screen_name,
                                user_img: tweet.user.profile_image_url,
                                text: tweet.text,
                                date: timeConverter(new Date(tweet.created_at).getTime())
                            });
                        });
                    });

                    socket.on('wall'+ user.hashtag, function (data) {
                        global.io.sockets.emit('wall' + user.hashtag, data);
                    });

                    socket.on('disconnect', function() {
                        console.log('Got disconnect!');

                        delete clients[socket.id];
                    });
                });
            }
            res.render('moderator', {user:user});
        });
    } else {
        res.render('login');
    }
});

/* GET wall page. .*/
router.get('/wall/:hashtag', function(req, res, next) {
    if(req.params.hashtag != "")
        res.render('wall', {hashtag: req.params.hashtag});
});

module.exports = router;
