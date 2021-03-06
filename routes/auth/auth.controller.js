const passport = require('passport');
let router = require('express').Router();
const User = require('../../database/models/user');
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET

exports.localAuth = (req, res) => {
    passport.authenticate('signin-local', function (err, user) {
        if (err) res.status(500).json({
            "message": err.message
        });
        else if (!user)
            res.sendStatus(401)
        else req.logIn(user, (err) => {
            if (err) {

                res.status(500).json({
                    "message": "Failed to serializing"
                })
            } else {
                let response = {

                }
                User.findById(user)
                    .then(userInstance => {
                        return userInstance.updateRefreshToken()
                    })
                    .then(userInstance => {
                        console.log(userInstance);
                        response.refreshToken = userInstance.refreshToken;
                        return new Promise((resolve, reject) => {
                            jwt.sign({
                                    user
                                },
                                secret, {
                                    issuer: "lupin-catcher-node-server.herokuapp.com",
                                    subject: 'userInfo',
                                    expiresIn: '10m'
                                }, (err, token) => {
                                    if (err) reject(err)
                                    resolve(token)
                                })
                        })
                    })
                    .then(token => {
                        response.token = token;
                        res.status(200).json(response)
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({
                            'message': err.message
                        })
                    })
            }
        });
    })(req, res);
};


exports.facebookCallback = (req, res) => {
    passport.authenticate('signin-facebook', (err, user) => {
        if (err) res.status(500).json({
            "message": err.message
        });
        else if (!user)
            res.sendStatus(400);
        else req.logIn(user, (err) => {
            console.log(err);
            if (err) res.status(500).json({
                "message": "Failed to serializing"
            })
            else res.sendStatus(200).end(user);
        });
    })(req, res);
};

exports.emailValidation = (req, res) => {
    const email = req.params.email;
    console.log(email);
    if (!/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)) {
        return res.status(400).json({
            "message": "INVALID EMAIL"
        });
    }
    User.findOneByEmail(email)
        .then(user => {
            if (user) res.status(409).json({
                "message": "EMAIL CONFLICT"
            });
            else res.sendStatus(200);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                "message": err.message
            });
        })
}

exports.signup = (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const nickname = req.body.nickname;

    User.findOneByEmail(email)
        .then(user => {
            if (user) throw new Error('EMAIL CONFLICT');
            else return User.create(email, password, nickname);
        })
        .then(user => {
            res.sendStatus(201);
        })
        .catch(err => {
            console.log(err);
            if (err.message == 'EMAIL CONFLICT') {
                res.status(409).json({
                    "message": err.message
                });
            } else {
                res.status(500).json({
                    "message": err.message
                })
            }
        })
}

exports.tokenRefresh = (req, res) => {
    const refreshToken = req.query.refreshToken;
    User.findOne({refreshToken})
        .then(user => {
            if (!user) {
                throw Error('User Not Found')
            } 
            return new Promise((resolve, reject) => {
                jwt.sign({
                        "user": user._id
                    },
                    secret, {
                        issuer: "lupin-catcher-node-server.herokuapp.com",
                        subject: 'userInfo',
                        expiresIn: '10m'
                    }, (err, token) => {
                        if (err) reject(err)
                        resolve(token)
                    })
            })
        })
        .then(token => {
            res.status(200).json({token});
        })
        .catch(err => {
            if (err.message === 'User Not Found') res.sendStatus(204)
            else res.status(500).json({"message": err.message});
        })
}

exports.getUserInfo = (req, res) => {
    const uid = req.decoded.user;
    console.log(uid);
    User.findById(uid)
        .then(user => {
            if (!user) {
                res.status(400).json({
                "message": "User Not Found"
                })
            }
            else res.status(200).json(user)
        })
        .catch(err => {
            res.status(500).json({
                "message": err.message
            });
        })
}