(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:grant-google":{"server":{"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_grant-google/server/index.js                                                      //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
module.export({
  getUser: () => getUser
});
let Providers, GrantError;
module.watch(require("meteor/rocketchat:grant"), {
  Providers(v) {
    Providers = v;
  },

  GrantError(v) {
    GrantError = v;
  }

}, 0);
let HTTP;
module.watch(require("meteor/http"), {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
const userAgent = 'Meteor';

function getIdentity(accessToken) {
  try {
    return HTTP.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: {
        'User-Agent': userAgent
      },
      params: {
        access_token: accessToken
      }
    }).data;
  } catch (err) {
    throw new GrantError(`Failed to fetch identity from Google. ${err.message}`);
  }
}

function getUser(accessToken) {
  const whitelisted = ['id', 'email', 'verified_email', 'name', 'given_name', 'family_name', 'picture'];
  const identity = getIdentity(accessToken, whitelisted);
  const username = `${identity.given_name.toLowerCase()}.${identity.family_name.toLowerCase()}`;
  return {
    id: identity.id,
    email: identity.email,
    username,
    name: identity.name,
    avatar: identity.picture
  };
}

// Register Google OAuth
Providers.register('google', {
  scope: ['openid', 'email']
}, getUser);
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:grant-google/server/index.js");

/* Exports */
Package._define("rocketchat:grant-google", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_grant-google.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFudC1nb29nbGUvc2VydmVyL2luZGV4LmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsImdldFVzZXIiLCJQcm92aWRlcnMiLCJHcmFudEVycm9yIiwid2F0Y2giLCJyZXF1aXJlIiwidiIsIkhUVFAiLCJ1c2VyQWdlbnQiLCJnZXRJZGVudGl0eSIsImFjY2Vzc1Rva2VuIiwiZ2V0IiwiaGVhZGVycyIsInBhcmFtcyIsImFjY2Vzc190b2tlbiIsImRhdGEiLCJlcnIiLCJtZXNzYWdlIiwid2hpdGVsaXN0ZWQiLCJpZGVudGl0eSIsInVzZXJuYW1lIiwiZ2l2ZW5fbmFtZSIsInRvTG93ZXJDYXNlIiwiZmFtaWx5X25hbWUiLCJpZCIsImVtYWlsIiwibmFtZSIsImF2YXRhciIsInBpY3R1cmUiLCJyZWdpc3RlciIsInNjb3BlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLFdBQVEsTUFBSUE7QUFBYixDQUFkO0FBQXFDLElBQUlDLFNBQUosRUFBY0MsVUFBZDtBQUF5QkosT0FBT0ssS0FBUCxDQUFhQyxRQUFRLHlCQUFSLENBQWIsRUFBZ0Q7QUFBQ0gsWUFBVUksQ0FBVixFQUFZO0FBQUNKLGdCQUFVSSxDQUFWO0FBQVksR0FBMUI7O0FBQTJCSCxhQUFXRyxDQUFYLEVBQWE7QUFBQ0gsaUJBQVdHLENBQVg7QUFBYTs7QUFBdEQsQ0FBaEQsRUFBd0csQ0FBeEc7QUFBMkcsSUFBSUMsSUFBSjtBQUFTUixPQUFPSyxLQUFQLENBQWFDLFFBQVEsYUFBUixDQUFiLEVBQW9DO0FBQUNFLE9BQUtELENBQUwsRUFBTztBQUFDQyxXQUFLRCxDQUFMO0FBQU87O0FBQWhCLENBQXBDLEVBQXNELENBQXREO0FBR2xMLE1BQU1FLFlBQVksUUFBbEI7O0FBRUEsU0FBU0MsV0FBVCxDQUFxQkMsV0FBckIsRUFBa0M7QUFDakMsTUFBSTtBQUNILFdBQU9ILEtBQUtJLEdBQUwsQ0FDTiwrQ0FETSxFQUMyQztBQUNoREMsZUFBUztBQUFFLHNCQUFjSjtBQUFoQixPQUR1QztBQUVoREssY0FBUTtBQUNQQyxzQkFBY0o7QUFEUDtBQUZ3QyxLQUQzQyxFQU1ISyxJQU5KO0FBT0EsR0FSRCxDQVFFLE9BQU9DLEdBQVAsRUFBWTtBQUNiLFVBQU0sSUFBSWIsVUFBSixDQUFnQix5Q0FBeUNhLElBQUlDLE9BQVMsRUFBdEUsQ0FBTjtBQUNBO0FBQ0Q7O0FBRU0sU0FBU2hCLE9BQVQsQ0FBaUJTLFdBQWpCLEVBQThCO0FBQ3BDLFFBQU1RLGNBQWMsQ0FDbkIsSUFEbUIsRUFDYixPQURhLEVBQ0osZ0JBREksRUFDYyxNQURkLEVBRW5CLFlBRm1CLEVBRUwsYUFGSyxFQUVVLFNBRlYsQ0FBcEI7QUFJQSxRQUFNQyxXQUFXVixZQUFZQyxXQUFaLEVBQXlCUSxXQUF6QixDQUFqQjtBQUNBLFFBQU1FLFdBQVksR0FBR0QsU0FBU0UsVUFBVCxDQUFvQkMsV0FBcEIsRUFBbUMsSUFBSUgsU0FBU0ksV0FBVCxDQUFxQkQsV0FBckIsRUFBb0MsRUFBaEc7QUFFQSxTQUFPO0FBQ05FLFFBQUlMLFNBQVNLLEVBRFA7QUFFTkMsV0FBT04sU0FBU00sS0FGVjtBQUdOTCxZQUhNO0FBSU5NLFVBQU1QLFNBQVNPLElBSlQ7QUFLTkMsWUFBUVIsU0FBU1M7QUFMWCxHQUFQO0FBT0E7O0FBRUQ7QUFDQTFCLFVBQVUyQixRQUFWLENBQW1CLFFBQW5CLEVBQTZCO0FBQUVDLFNBQU8sQ0FBQyxRQUFELEVBQVcsT0FBWDtBQUFULENBQTdCLEVBQTZEN0IsT0FBN0QsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9ncmFudC1nb29nbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQcm92aWRlcnMsIEdyYW50RXJyb3IgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpncmFudCc7XG5pbXBvcnQgeyBIVFRQIH0gZnJvbSAnbWV0ZW9yL2h0dHAnO1xuXG5jb25zdCB1c2VyQWdlbnQgPSAnTWV0ZW9yJztcblxuZnVuY3Rpb24gZ2V0SWRlbnRpdHkoYWNjZXNzVG9rZW4pIHtcblx0dHJ5IHtcblx0XHRyZXR1cm4gSFRUUC5nZXQoXG5cdFx0XHQnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL3VzZXJpbmZvJywge1xuXHRcdFx0XHRoZWFkZXJzOiB7ICdVc2VyLUFnZW50JzogdXNlckFnZW50IH0sXG5cdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdGFjY2Vzc190b2tlbjogYWNjZXNzVG9rZW4sXG5cdFx0XHRcdH0sXG5cdFx0XHR9KS5kYXRhO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHR0aHJvdyBuZXcgR3JhbnRFcnJvcihgRmFpbGVkIHRvIGZldGNoIGlkZW50aXR5IGZyb20gR29vZ2xlLiAkeyBlcnIubWVzc2FnZSB9YCk7XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFVzZXIoYWNjZXNzVG9rZW4pIHtcblx0Y29uc3Qgd2hpdGVsaXN0ZWQgPSBbXG5cdFx0J2lkJywgJ2VtYWlsJywgJ3ZlcmlmaWVkX2VtYWlsJywgJ25hbWUnLFxuXHRcdCdnaXZlbl9uYW1lJywgJ2ZhbWlseV9uYW1lJywgJ3BpY3R1cmUnLFxuXHRdO1xuXHRjb25zdCBpZGVudGl0eSA9IGdldElkZW50aXR5KGFjY2Vzc1Rva2VuLCB3aGl0ZWxpc3RlZCk7XG5cdGNvbnN0IHVzZXJuYW1lID0gYCR7IGlkZW50aXR5LmdpdmVuX25hbWUudG9Mb3dlckNhc2UoKSB9LiR7IGlkZW50aXR5LmZhbWlseV9uYW1lLnRvTG93ZXJDYXNlKCkgfWA7XG5cblx0cmV0dXJuIHtcblx0XHRpZDogaWRlbnRpdHkuaWQsXG5cdFx0ZW1haWw6IGlkZW50aXR5LmVtYWlsLFxuXHRcdHVzZXJuYW1lLFxuXHRcdG5hbWU6IGlkZW50aXR5Lm5hbWUsXG5cdFx0YXZhdGFyOiBpZGVudGl0eS5waWN0dXJlLFxuXHR9O1xufVxuXG4vLyBSZWdpc3RlciBHb29nbGUgT0F1dGhcblByb3ZpZGVycy5yZWdpc3RlcignZ29vZ2xlJywgeyBzY29wZTogWydvcGVuaWQnLCAnZW1haWwnXSB9LCBnZXRVc2VyKTtcbiJdfQ==
