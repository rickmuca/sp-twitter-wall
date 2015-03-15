var express = require('express');
var router = express.Router();
path = require('path');

/* GET moderator page. */
router.get('/moderator', function(req, res, next) {
    res.sendFile(path.resolve(__dirname + '/../views/moderator.html'));
});

/* GET wall page. */
router.get('/wall', function(req, res, next) {
    res.sendFile(path.resolve(__dirname + '/../views/wall.html'));
});

module.exports = router;
