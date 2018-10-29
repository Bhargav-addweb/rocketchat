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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:grant-facebook":{"server":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/rocketchat_grant-facebook/server/index.js                                      //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
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
const version = 'v2.10';

function getIdentity(accessToken, fields) {
  try {
    return HTTP.get(`https://graph.facebook.com/${version}/me`, {
      headers: {
        'User-Agent': userAgent
      },
      params: {
        access_token: accessToken,
        fields: fields.join(',')
      }
    }).data;
  } catch (err) {
    throw new GrantError(`Failed to fetch identity from Facebook. ${err.message}`);
  }
}

function getPicture(accessToken) {
  try {
    return HTTP.get(`https://graph.facebook.com/${version}/me/picture`, {
      headers: {
        'User-Agent': userAgent
      },
      params: {
        redirect: false,
        height: 200,
        width: 200,
        type: 'normal',
        access_token: accessToken
      }
    }).data;
  } catch (err) {
    throw new GrantError(`Failed to fetch profile picture from Facebook. ${err.message}`);
  }
}

function getUser(accessToken) {
  const whitelisted = ['id', 'email', 'name', 'first_name', 'last_name'];
  const identity = getIdentity(accessToken, whitelisted);
  const avatar = getPicture(accessToken);
  const username = identity.name.toLowerCase().replace(' ', '.');
  return {
    id: identity.id,
    email: identity.email,
    username,
    name: `${identity.first_name} ${identity.last_name}`,
    avatar: avatar.data.url
  };
}

// Register Facebook OAuth
Providers.register('facebook', {
  scope: ['public_profile', 'email']
}, getUser);
/////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:grant-facebook/server/index.js");

/* Exports */
Package._define("rocketchat:grant-facebook", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_grant-facebook.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFudC1mYWNlYm9vay9zZXJ2ZXIvaW5kZXguanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiZ2V0VXNlciIsIlByb3ZpZGVycyIsIkdyYW50RXJyb3IiLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiSFRUUCIsInVzZXJBZ2VudCIsInZlcnNpb24iLCJnZXRJZGVudGl0eSIsImFjY2Vzc1Rva2VuIiwiZmllbGRzIiwiZ2V0IiwiaGVhZGVycyIsInBhcmFtcyIsImFjY2Vzc190b2tlbiIsImpvaW4iLCJkYXRhIiwiZXJyIiwibWVzc2FnZSIsImdldFBpY3R1cmUiLCJyZWRpcmVjdCIsImhlaWdodCIsIndpZHRoIiwidHlwZSIsIndoaXRlbGlzdGVkIiwiaWRlbnRpdHkiLCJhdmF0YXIiLCJ1c2VybmFtZSIsIm5hbWUiLCJ0b0xvd2VyQ2FzZSIsInJlcGxhY2UiLCJpZCIsImVtYWlsIiwiZmlyc3RfbmFtZSIsImxhc3RfbmFtZSIsInVybCIsInJlZ2lzdGVyIiwic2NvcGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsV0FBUSxNQUFJQTtBQUFiLENBQWQ7QUFBcUMsSUFBSUMsU0FBSixFQUFjQyxVQUFkO0FBQXlCSixPQUFPSyxLQUFQLENBQWFDLFFBQVEseUJBQVIsQ0FBYixFQUFnRDtBQUFDSCxZQUFVSSxDQUFWLEVBQVk7QUFBQ0osZ0JBQVVJLENBQVY7QUFBWSxHQUExQjs7QUFBMkJILGFBQVdHLENBQVgsRUFBYTtBQUFDSCxpQkFBV0csQ0FBWDtBQUFhOztBQUF0RCxDQUFoRCxFQUF3RyxDQUF4RztBQUEyRyxJQUFJQyxJQUFKO0FBQVNSLE9BQU9LLEtBQVAsQ0FBYUMsUUFBUSxhQUFSLENBQWIsRUFBb0M7QUFBQ0UsT0FBS0QsQ0FBTCxFQUFPO0FBQUNDLFdBQUtELENBQUw7QUFBTzs7QUFBaEIsQ0FBcEMsRUFBc0QsQ0FBdEQ7QUFHbEwsTUFBTUUsWUFBWSxRQUFsQjtBQUNBLE1BQU1DLFVBQVUsT0FBaEI7O0FBRUEsU0FBU0MsV0FBVCxDQUFxQkMsV0FBckIsRUFBa0NDLE1BQWxDLEVBQTBDO0FBQ3pDLE1BQUk7QUFDSCxXQUFPTCxLQUFLTSxHQUFMLENBQ0wsOEJBQThCSixPQUFTLEtBRGxDLEVBQ3dDO0FBQzdDSyxlQUFTO0FBQUUsc0JBQWNOO0FBQWhCLE9BRG9DO0FBRTdDTyxjQUFRO0FBQ1BDLHNCQUFjTCxXQURQO0FBRVBDLGdCQUFRQSxPQUFPSyxJQUFQLENBQVksR0FBWjtBQUZEO0FBRnFDLEtBRHhDLEVBT0hDLElBUEo7QUFRQSxHQVRELENBU0UsT0FBT0MsR0FBUCxFQUFZO0FBQ2IsVUFBTSxJQUFJaEIsVUFBSixDQUFnQiwyQ0FBMkNnQixJQUFJQyxPQUFTLEVBQXhFLENBQU47QUFDQTtBQUNEOztBQUVELFNBQVNDLFVBQVQsQ0FBb0JWLFdBQXBCLEVBQWlDO0FBQ2hDLE1BQUk7QUFDSCxXQUFPSixLQUFLTSxHQUFMLENBQ0wsOEJBQThCSixPQUFTLGFBRGxDLEVBQ2dEO0FBQ3JESyxlQUFTO0FBQUUsc0JBQWNOO0FBQWhCLE9BRDRDO0FBRXJETyxjQUFRO0FBQ1BPLGtCQUFVLEtBREg7QUFFUEMsZ0JBQVEsR0FGRDtBQUdQQyxlQUFPLEdBSEE7QUFJUEMsY0FBTSxRQUpDO0FBS1BULHNCQUFjTDtBQUxQO0FBRjZDLEtBRGhELEVBVUhPLElBVko7QUFXQSxHQVpELENBWUUsT0FBT0MsR0FBUCxFQUFZO0FBQ2IsVUFBTSxJQUFJaEIsVUFBSixDQUFnQixrREFBa0RnQixJQUFJQyxPQUFTLEVBQS9FLENBQU47QUFDQTtBQUNEOztBQUVNLFNBQVNuQixPQUFULENBQWlCVSxXQUFqQixFQUE4QjtBQUNwQyxRQUFNZSxjQUFjLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsTUFBaEIsRUFBd0IsWUFBeEIsRUFBc0MsV0FBdEMsQ0FBcEI7QUFDQSxRQUFNQyxXQUFXakIsWUFBWUMsV0FBWixFQUF5QmUsV0FBekIsQ0FBakI7QUFDQSxRQUFNRSxTQUFTUCxXQUFXVixXQUFYLENBQWY7QUFDQSxRQUFNa0IsV0FBV0YsU0FBU0csSUFBVCxDQUFjQyxXQUFkLEdBQTRCQyxPQUE1QixDQUFvQyxHQUFwQyxFQUF5QyxHQUF6QyxDQUFqQjtBQUVBLFNBQU87QUFDTkMsUUFBSU4sU0FBU00sRUFEUDtBQUVOQyxXQUFPUCxTQUFTTyxLQUZWO0FBR05MLFlBSE07QUFJTkMsVUFBTyxHQUFHSCxTQUFTUSxVQUFZLElBQUlSLFNBQVNTLFNBQVcsRUFKakQ7QUFLTlIsWUFBUUEsT0FBT1YsSUFBUCxDQUFZbUI7QUFMZCxHQUFQO0FBT0E7O0FBRUQ7QUFDQW5DLFVBQVVvQyxRQUFWLENBQW1CLFVBQW5CLEVBQStCO0FBQUVDLFNBQU8sQ0FBQyxnQkFBRCxFQUFtQixPQUFuQjtBQUFULENBQS9CLEVBQXVFdEMsT0FBdkUsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9ncmFudC1mYWNlYm9vay5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFByb3ZpZGVycywgR3JhbnRFcnJvciB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmdyYW50JztcbmltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5cbmNvbnN0IHVzZXJBZ2VudCA9ICdNZXRlb3InO1xuY29uc3QgdmVyc2lvbiA9ICd2Mi4xMCc7XG5cbmZ1bmN0aW9uIGdldElkZW50aXR5KGFjY2Vzc1Rva2VuLCBmaWVsZHMpIHtcblx0dHJ5IHtcblx0XHRyZXR1cm4gSFRUUC5nZXQoXG5cdFx0XHRgaHR0cHM6Ly9ncmFwaC5mYWNlYm9vay5jb20vJHsgdmVyc2lvbiB9L21lYCwge1xuXHRcdFx0XHRoZWFkZXJzOiB7ICdVc2VyLUFnZW50JzogdXNlckFnZW50IH0sXG5cdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdGFjY2Vzc190b2tlbjogYWNjZXNzVG9rZW4sXG5cdFx0XHRcdFx0ZmllbGRzOiBmaWVsZHMuam9pbignLCcpLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSkuZGF0YTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0dGhyb3cgbmV3IEdyYW50RXJyb3IoYEZhaWxlZCB0byBmZXRjaCBpZGVudGl0eSBmcm9tIEZhY2Vib29rLiAkeyBlcnIubWVzc2FnZSB9YCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gZ2V0UGljdHVyZShhY2Nlc3NUb2tlbikge1xuXHR0cnkge1xuXHRcdHJldHVybiBIVFRQLmdldChcblx0XHRcdGBodHRwczovL2dyYXBoLmZhY2Vib29rLmNvbS8keyB2ZXJzaW9uIH0vbWUvcGljdHVyZWAsIHtcblx0XHRcdFx0aGVhZGVyczogeyAnVXNlci1BZ2VudCc6IHVzZXJBZ2VudCB9LFxuXHRcdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0XHRyZWRpcmVjdDogZmFsc2UsXG5cdFx0XHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRcdFx0d2lkdGg6IDIwMCxcblx0XHRcdFx0XHR0eXBlOiAnbm9ybWFsJyxcblx0XHRcdFx0XHRhY2Nlc3NfdG9rZW46IGFjY2Vzc1Rva2VuLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSkuZGF0YTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0dGhyb3cgbmV3IEdyYW50RXJyb3IoYEZhaWxlZCB0byBmZXRjaCBwcm9maWxlIHBpY3R1cmUgZnJvbSBGYWNlYm9vay4gJHsgZXJyLm1lc3NhZ2UgfWApO1xuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRVc2VyKGFjY2Vzc1Rva2VuKSB7XG5cdGNvbnN0IHdoaXRlbGlzdGVkID0gWydpZCcsICdlbWFpbCcsICduYW1lJywgJ2ZpcnN0X25hbWUnLCAnbGFzdF9uYW1lJ107XG5cdGNvbnN0IGlkZW50aXR5ID0gZ2V0SWRlbnRpdHkoYWNjZXNzVG9rZW4sIHdoaXRlbGlzdGVkKTtcblx0Y29uc3QgYXZhdGFyID0gZ2V0UGljdHVyZShhY2Nlc3NUb2tlbik7XG5cdGNvbnN0IHVzZXJuYW1lID0gaWRlbnRpdHkubmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoJyAnLCAnLicpO1xuXG5cdHJldHVybiB7XG5cdFx0aWQ6IGlkZW50aXR5LmlkLFxuXHRcdGVtYWlsOiBpZGVudGl0eS5lbWFpbCxcblx0XHR1c2VybmFtZSxcblx0XHRuYW1lOiBgJHsgaWRlbnRpdHkuZmlyc3RfbmFtZSB9ICR7IGlkZW50aXR5Lmxhc3RfbmFtZSB9YCxcblx0XHRhdmF0YXI6IGF2YXRhci5kYXRhLnVybCxcblx0fTtcbn1cblxuLy8gUmVnaXN0ZXIgRmFjZWJvb2sgT0F1dGhcblByb3ZpZGVycy5yZWdpc3RlcignZmFjZWJvb2snLCB7IHNjb3BlOiBbJ3B1YmxpY19wcm9maWxlJywgJ2VtYWlsJ10gfSwgZ2V0VXNlcik7XG4iXX0=
