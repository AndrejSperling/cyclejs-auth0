"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _AuthenticationWrapper = require("./AuthenticationWrapper");

var _AuthenticationWrapper2 = _interopRequireDefault(_AuthenticationWrapper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function protect(Component, options) {
    return function (sources) {
        var decoratedSources = _extends({}, sources, {
            props: _extends({}, sources.props, { authWrapperParams: _extends({ Child: Component }, options) })
        });

        return (0, _AuthenticationWrapper2.default)(decoratedSources);
    };
}

exports.default = protect;