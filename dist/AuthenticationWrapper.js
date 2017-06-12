"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _xstream = require("xstream");

var _xstream2 = _interopRequireDefault(_xstream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultAuth0ShowParams = {
    authParams: { scope: "openid" },
    responseType: "token"
};

/**
 * Will decorate all sinks outputs using the corresponding decorate function
 *
 * @param {Object} sinks the sinks to decorate 
 * @param {Stream} tokens$ the tokens that will be feeded to the decorator
 * @param {Object} decorators all the decorators, formatted like { sinkName: decorateFn }
 * @returns {Object} The decorated sinks
 */
function decorateSinks(sinks, tokens$, decorators) {
    var sinksToDecorate = Object.keys(decorators); //get all the decorators

    sinksToDecorate.map(function (sinkName) {
        var sink = sinks[sinkName];
        var decorate = decorators[sinkName];
        if (!sink) {
            return;
        }
        sinks[sinkName] = tokens$.filter(function (tokens) {
            return !!tokens;
        }).map(function (tokens) {
            return sink.map(function (data) {
                return decorate(data, tokens.idToken);
            });
        }).flatten();
    });

    return sinks;
}

/**
 * Responsible for wrapping a generic component with an authentication layer
 * Will also decorate all http sinks of the child component with the user's tokens
 *
 * @param {Object} sources sources (that will also be used by the child component)
 * @returns {Object} sinks
 */
function AuthenticationWrapper(sources) {
    var auth0 = sources.auth0;
    var _sources$props$authWr = sources.props.authWrapperParams,
        _sources$props$authWr2 = _sources$props$authWr.Child,
        Child = _sources$props$authWr2 === undefined ? function () {
        throw new Error("[Auth0Wrapper] missing child component");
    } : _sources$props$authWr2,
        _sources$props$authWr3 = _sources$props$authWr.auth0ShowParams,
        auth0ShowParams = _sources$props$authWr3 === undefined ? defaultAuth0ShowParams : _sources$props$authWr3,
        _sources$props$authWr4 = _sources$props$authWr.decorators,
        decorators = _sources$props$authWr4 === undefined ? {} : _sources$props$authWr4;


    var tokens$ = auth0.tokens$;

    var childSources = _extends({}, sources, { props: _extends({}, sources.props, { tokens$: tokens$ }) });
    var sinks = Child(childSources);

    return decorateSinks(_extends({}, sinks, {
        auth0: _xstream2.default.merge(sinks.auth0 || _xstream2.default.empty())
    }), tokens$, decorators);
}

exports.default = AuthenticationWrapper;