"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _xstream = require("xstream");

var _xstream2 = _interopRequireDefault(_xstream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * Generate a function that will filter responses in order to have only those selected
 *
 * @param {Stream} response$$ the response stream
 * @return {Function} selectResponse
 */
function responseSelector(lock, action$) {
    function selectEvent(event, lock, action$) {
        var driversEvents = ["getProfile", "getUserInfo", "logout"];

        if (driversEvents.indexOf(event) > -1) {
            return action$.filter(function (action) {
                return action.action === event;
            }).map(function (action) {
                return action.response$;
            }).flatten().map(function (response) {
                return { event: event, response: response };
            });
        }
        return _xstream2.default.create({
            start: function start(listener) {
                return lock.on(event, function (response) {
                    return listener.next({ event: event, response: response });
                });
            },
            stop: function stop() {}
        });
    }

    return function selectResponse(selector) {
        var events = selector.split(",").map(function (sel) {
            return sel.replace(/ */, "");
        }).filter(function (sel) {
            return !!sel;
        });

        var events$ = events.map(function (event) {
            return selectEvent(event, lock, action$);
        });

        return _xstream2.default.merge.apply(_xstream2.default, _toConsumableArray(events$));
    };
}

/**
 * it's needed to wrapper the makeAuth0Driver in a factory for testing purposes
 * as the Auth0Lock code tries to init at import (and fails because there is no document)
 *
 * @param {class} Auth0Lock the Auth0 code
 * @returns {Function} makeAuth0Driver
 */
function buildDriver(Auth0Lock, localStorage, location) {
    var lock;
    var storageKey = "auh0-driver-tokens";

    /**
     * Contains all the available actions that can be done against the auth0 api
     *
     * @returns {Object}
     */
    var actions = {
        "show": function show(lock) {
            lock.show();
        },

        "getProfile": function getProfile(lock, token) {
            console.warn("The getProfile method will soon be deprecated, use getUserInformation instead");
            return new Promise(function (resolve, reject) {
                lock.getProfile(token, function (err, profile) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(profile);
                });
            });
        },

        "getUserInfo": function getUserInfo(lock, accessToken) {
            return new Promise(function (resolve, reject) {
                lock.getUserInfo(accessToken, function (err, profile) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(profile);
                });
            });
        },

        "logout": function logout() {
            return new Promise(function (resolve) {
                return resolve(null);
            });
        }
    };

    function auth0Driver(action$, streamAdapter) {
        var noop = function noop() {};

        var actionDone$ = action$.map(function (action) {
            var actionFn = actions[action.action];
            if (!actionFn) {
                console.error("[Auth0Driver] not available method: " + action.action);
                return false;
            }
            var promise = actionFn(lock, action.params);
            return {
                action: action.action,
                response$: promise ? _xstream2.default.fromPromise(promise) : _xstream2.default.empty()
            };
        }).remember();

        var select = responseSelector(lock, actionDone$);

        actionDone$.addListener({ next: noop, error: noop, complete: noop }

        //if the location contains an id_token, do not send any initial token
        //because the lock will parse the token in hash and the initial token
        //will be given by either the authenticated event of any of the errors
        );var initialToken$ = location.hash.indexOf("id_token") > -1 ? _xstream2.default.empty() : _xstream2.default.of(null).map(function () {
            return JSON.parse(localStorage.getItem(storageKey));
        });

        var removeToken$ = select("logout, unrecoverable_error, authorization_error").map(function () {
            localStorage.removeItem(storageKey);
            return null;
        });

        var storeToken$ = select("authenticated").map(function (_ref) {
            var response = _ref.response;

            var tokens = {
                accessToken: response.accessToken,
                idToken: response.idToken
            };
            localStorage.setItem(storageKey, JSON.stringify(tokens));
            return tokens;
        });

        return {
            select: select,
            tokens$: _xstream2.default.merge(initialToken$, storeToken$, removeToken$).remember()
        };
    }

    return function makeAuth0Driver(key, domain) {
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

        if (!key || !domain) {
            throw new Error("[Auth0] You must provide a key and a domain");
        }
        lock = new Auth0Lock(key, domain, options);

        return auth0Driver;
    };
}

exports.default = buildDriver;