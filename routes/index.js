var express = require('express');
var router = express.Router();
path = require('path');
var mongo = require('../controllers/mongo');
var Twitter = require('twitter');
var twitter_clients = [];
var sockets = [];

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

function getMedia(tweet){
    if (tweet.entities.media){
        return tweet.entities.media[0].media_url;
    }
    return tweet.entities.media;
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

router.post('/retweets/:hashtag', function(req, res, next) {
    if(twitter_clients[req.params.hashtag].send_retweets) {
        twitter_clients[req.params.hashtag].send_retweets = false;
    }
    else {
        twitter_clients[req.params.hashtag].send_retweets = true;
    }
    next;
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
                if (twitter_clients.indexOf(user.hashtag) == -1) {
                    twitter_clients[user.hashtag] = new Twitter({
                        consumer_key: 'bXaTv73Ok9XyQFbg9BXo8AxbQ',
                        consumer_secret: 'NEdSJWPkkuYpBBRwV9KQQcHrJHHPVcUhJayrjdTD71FN2l9sSW',
                        access_token_key: '3220818046-QzEAsYrmrB72oNdhwsrOYzoeDdEBXYxUsIQn9uX',
                        access_token_secret: 'WouRNz2utdU6XeDtaaWpC5hr58aWH4W0rFjPlYFSolc3T'
                    });

                    global.io.on('connection', function (socket) {
                        if (sockets.indexOf(socket.id) == -1) {
                            sockets.push(socket.id);
                            twitter_clients[user.hashtag].get('search/tweets', {q: user.hashtag, count: 10}, function(error, tweets, response) {
                                tweets.statuses.forEach(function(tweet) {
                                    socket.emit(user.hashtag, {
                                        id: tweet.id,
                                        user_name: tweet.user.name,
                                        user: tweet.user.screen_name,
                                        user_img: tweet.user.profile_image_url,
                                        text: tweet.text,
                                        date: timeConverter(new Date(tweet.created_at).getTime()),
                                        image: getMedia(tweet)
                                    });
                                });
                            });
                            twitter_clients[user.hashtag].stream('statuses/filter', {track: user.hashtag}, function(stream) {
                                stream.on('data', function(tweet) {
                                    socket.emit(user.hashtag, {
                                        id: tweet.id,
                                        user_name: tweet.user.name,
                                        user: tweet.user.screen_name,
                                        user_img: tweet.user.profile_image_url,
                                        text: tweet.text,
                                        date: timeConverter(tweet.timestamp_ms),
                                        image: getMedia(tweet)
                                    });
                                });

                                stream.on('error', function(error) {
                                    console.log(true);
                                });
                            });



                            socket.on('wall'+ user.hashtag, function (data) {
                                global.io.sockets.emit('wall' + user.hashtag, data);
                            });

                            socket.on('disconnect', function() {
                                var i = sockets.indexOf(socket.id);
                                delete sockets[i];
                            });
                        }
                    });
                }


            }
            res.render('moderator', {user:user});
        });
    } else {
        res.render('login');
    }
});

/* GET wall page. .*/
router.get('/wall/:user', function(req, res, next) {
    if(req.params.user != ""){
        var coll = mongo.collection('users');
        coll.findOne({username: req.session.username}, function(err, user) {
            if (user) {
                res.render('wall', {user: user});
            }
        });
    }
});

module.exports = router;
