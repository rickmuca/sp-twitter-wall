var mongo = require('./../controllers/mongo');

module.exports = function(req, res, next){
    console.log('check if logged in', req.session);

    if (req.session.username) {

        var coll = mongo.collection('users');
        var username = req.session.username;
        console.log('looking for user by',username);
        coll.find({username: username}).toArray(function(err, users){
            if (err) {
                throw new Error('Error finding user by id: '+err);
            }
            console.log('users',users);

            // This makes it available to all templates
            // For example: {{#if user}} The username is {{user.username}} {{/if}}
            res.locals.user = users[0];

            // Store it on 'req.user' for other middlewares ('require_user.js', e.g.)
            req.user = users[0];

            next();
        });
    } else {
        next();
    }
};