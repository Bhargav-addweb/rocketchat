(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var FlowRouter = Package['kadira:flow-router'].FlowRouter;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var getHttpBridge, waitPromise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:sandstorm":{"server":{"lib.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_sandstorm/server/lib.js                                                                       //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let Future;
module.watch(require("fibers/future"), {
  default(v) {
    Future = v;
  }

}, 0);
RocketChat.Sandstorm = {};

if (process.env.SANDSTORM === '1') {
  const Capnp = require('capnp');

  const {
    SandstormHttpBridge
  } = Capnp.importSystem('sandstorm/sandstorm-http-bridge.capnp');
  let capnpConnection = null;
  let httpBridge = null;

  getHttpBridge = function () {
    if (!httpBridge) {
      capnpConnection = Capnp.connect('unix:/tmp/sandstorm-api');
      httpBridge = capnpConnection.restore(null, SandstormHttpBridge);
    }

    return httpBridge;
  };

  const promiseToFuture = function (promise) {
    const result = new Future();
    promise.then(result.return.bind(result), result.throw.bind(result));
    return result;
  };

  waitPromise = function (promise) {
    return promiseToFuture(promise).wait();
  }; // This usual implementation of this method returns an absolute URL that is invalid
  // under Sandstorm.


  UploadFS.Store.prototype.getURL = function (path) {
    return this.getRelativeURL(path);
  };
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"events.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_sandstorm/server/events.js                                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.Sandstorm.notify = function () {};

if (process.env.SANDSTORM === '1') {
  const ACTIVITY_TYPES = {
    message: 0,
    privateMessage: 1
  };

  RocketChat.Sandstorm.notify = function (message, userIds, caption, type) {
    const sessionId = message.sandstormSessionId;

    if (!sessionId) {
      return;
    }

    const httpBridge = getHttpBridge();
    const activity = {};

    if (type) {
      activity.type = ACTIVITY_TYPES[type];
    }

    if (caption) {
      activity.notification = {
        caption: {
          defaultText: caption
        }
      };
    }

    if (userIds) {
      activity.users = _.map(userIds, function (userId) {
        const user = Meteor.users.findOne({
          _id: userId
        }, {
          fields: {
            'services.sandstorm.id': 1
          }
        });
        return {
          identity: waitPromise(httpBridge.getSavedIdentity(user.services.sandstorm.id)).identity,
          mentioned: true
        };
      });
    }

    return waitPromise(httpBridge.getSessionContext(sessionId).context.activity(activity));
  };
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"powerbox.js":function(require){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_sandstorm/server/powerbox.js                                                                  //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
/* globals getHttpBridge, waitPromise */
RocketChat.Sandstorm.offerUiView = function () {};

if (process.env.SANDSTORM === '1') {
  const Capnp = require('capnp');

  const Powerbox = Capnp.importSystem('sandstorm/powerbox.capnp');
  const Grain = Capnp.importSystem('sandstorm/grain.capnp');

  RocketChat.Sandstorm.offerUiView = function (token, serializedDescriptor, sessionId) {
    const httpBridge = getHttpBridge();
    const session = httpBridge.getSessionContext(sessionId).context;
    const {
      api
    } = httpBridge.getSandstormApi(sessionId);
    const {
      cap
    } = waitPromise(api.restore(new Buffer(token, 'base64')));
    return waitPromise(session.offer(cap, undefined, {
      tags: [{
        id: '15831515641881813735',
        value: new Buffer(serializedDescriptor, 'base64')
      }]
    }));
  };

  Meteor.methods({
    sandstormClaimRequest(token, serializedDescriptor) {
      const descriptor = Capnp.parsePacked(Powerbox.PowerboxDescriptor, new Buffer(serializedDescriptor, 'base64'));
      const grainTitle = Capnp.parse(Grain.UiView.PowerboxTag, descriptor.tags[0].value).title;
      const sessionId = this.connection.sandstormSessionId();
      const httpBridge = getHttpBridge();
      const session = httpBridge.getSessionContext(sessionId).context;
      const cap = waitPromise(session.claimRequest(token)).cap.castAs(Grain.UiView);
      const {
        api
      } = httpBridge.getSandstormApi(sessionId);
      const newToken = waitPromise(api.save(cap)).token.toString('base64');
      const viewInfo = waitPromise(cap.getViewInfo());
      const {
        appTitle
      } = viewInfo;
      const asset = waitPromise(viewInfo.grainIcon.getUrl());
      const appIconUrl = `${asset.protocol}://${asset.hostPath}`;
      return {
        token: newToken,
        appTitle,
        appIconUrl,
        grainTitle,
        descriptor: descriptor.tags[0].value.toString('base64')
      };
    },

    sandstormOffer(token, serializedDescriptor) {
      RocketChat.Sandstorm.offerUiView(token, serializedDescriptor, this.connection.sandstormSessionId());
    }

  });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:sandstorm/server/lib.js");
require("/node_modules/meteor/rocketchat:sandstorm/server/events.js");
require("/node_modules/meteor/rocketchat:sandstorm/server/powerbox.js");

/* Exports */
Package._define("rocketchat:sandstorm");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_sandstorm.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzYW5kc3Rvcm0vc2VydmVyL2xpYi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzYW5kc3Rvcm0vc2VydmVyL2V2ZW50cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzYW5kc3Rvcm0vc2VydmVyL3Bvd2VyYm94LmpzIl0sIm5hbWVzIjpbIkZ1dHVyZSIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiUm9ja2V0Q2hhdCIsIlNhbmRzdG9ybSIsInByb2Nlc3MiLCJlbnYiLCJTQU5EU1RPUk0iLCJDYXBucCIsIlNhbmRzdG9ybUh0dHBCcmlkZ2UiLCJpbXBvcnRTeXN0ZW0iLCJjYXBucENvbm5lY3Rpb24iLCJodHRwQnJpZGdlIiwiZ2V0SHR0cEJyaWRnZSIsImNvbm5lY3QiLCJyZXN0b3JlIiwicHJvbWlzZVRvRnV0dXJlIiwicHJvbWlzZSIsInJlc3VsdCIsInRoZW4iLCJyZXR1cm4iLCJiaW5kIiwidGhyb3ciLCJ3YWl0UHJvbWlzZSIsIndhaXQiLCJVcGxvYWRGUyIsIlN0b3JlIiwicHJvdG90eXBlIiwiZ2V0VVJMIiwicGF0aCIsImdldFJlbGF0aXZlVVJMIiwiXyIsIm5vdGlmeSIsIkFDVElWSVRZX1RZUEVTIiwibWVzc2FnZSIsInByaXZhdGVNZXNzYWdlIiwidXNlcklkcyIsImNhcHRpb24iLCJ0eXBlIiwic2Vzc2lvbklkIiwic2FuZHN0b3JtU2Vzc2lvbklkIiwiYWN0aXZpdHkiLCJub3RpZmljYXRpb24iLCJkZWZhdWx0VGV4dCIsInVzZXJzIiwibWFwIiwidXNlcklkIiwidXNlciIsIk1ldGVvciIsImZpbmRPbmUiLCJfaWQiLCJmaWVsZHMiLCJpZGVudGl0eSIsImdldFNhdmVkSWRlbnRpdHkiLCJzZXJ2aWNlcyIsInNhbmRzdG9ybSIsImlkIiwibWVudGlvbmVkIiwiZ2V0U2Vzc2lvbkNvbnRleHQiLCJjb250ZXh0Iiwib2ZmZXJVaVZpZXciLCJQb3dlcmJveCIsIkdyYWluIiwidG9rZW4iLCJzZXJpYWxpemVkRGVzY3JpcHRvciIsInNlc3Npb24iLCJhcGkiLCJnZXRTYW5kc3Rvcm1BcGkiLCJjYXAiLCJCdWZmZXIiLCJvZmZlciIsInVuZGVmaW5lZCIsInRhZ3MiLCJ2YWx1ZSIsIm1ldGhvZHMiLCJzYW5kc3Rvcm1DbGFpbVJlcXVlc3QiLCJkZXNjcmlwdG9yIiwicGFyc2VQYWNrZWQiLCJQb3dlcmJveERlc2NyaXB0b3IiLCJncmFpblRpdGxlIiwicGFyc2UiLCJVaVZpZXciLCJQb3dlcmJveFRhZyIsInRpdGxlIiwiY29ubmVjdGlvbiIsImNsYWltUmVxdWVzdCIsImNhc3RBcyIsIm5ld1Rva2VuIiwic2F2ZSIsInRvU3RyaW5nIiwidmlld0luZm8iLCJnZXRWaWV3SW5mbyIsImFwcFRpdGxlIiwiYXNzZXQiLCJncmFpbkljb24iLCJnZXRVcmwiLCJhcHBJY29uVXJsIiwicHJvdG9jb2wiLCJob3N0UGF0aCIsInNhbmRzdG9ybU9mZmVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLE1BQUo7QUFBV0MsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLGVBQVIsQ0FBYixFQUFzQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0wsYUFBT0ssQ0FBUDtBQUFTOztBQUFyQixDQUF0QyxFQUE2RCxDQUE3RDtBQUlYQyxXQUFXQyxTQUFYLEdBQXVCLEVBQXZCOztBQUVBLElBQUlDLFFBQVFDLEdBQVIsQ0FBWUMsU0FBWixLQUEwQixHQUE5QixFQUFtQztBQUNsQyxRQUFNQyxRQUFRUixRQUFRLE9BQVIsQ0FBZDs7QUFDQSxRQUFNO0FBQUVTO0FBQUYsTUFBMEJELE1BQU1FLFlBQU4sQ0FBbUIsdUNBQW5CLENBQWhDO0FBRUEsTUFBSUMsa0JBQWtCLElBQXRCO0FBQ0EsTUFBSUMsYUFBYSxJQUFqQjs7QUFFQUMsa0JBQWdCLFlBQVc7QUFDMUIsUUFB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QUE0QztBQUMzQzdELGlCQUFXQyxTQUFYLENBQXFCd0QsV0FBckIsQ0FBaUNHLEtBQWpDLEVBQXdDQyxvQkFBeEMsRUFDQyxLQUFLb0IsVUFBTCxDQUFnQjVDLGtCQUFoQixFQUREO0FBRUE7O0FBekJhLEdBQWY7QUEyQkEsQyIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9zYW5kc3Rvcm0uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWxzIGdldEh0dHBCcmlkZ2UsIHdhaXRQcm9taXNlLCBVcGxvYWRGUyAqL1xuLyogZXhwb3J0ZWQgZ2V0SHR0cEJyaWRnZSwgd2FpdFByb21pc2UgKi9cbmltcG9ydCBGdXR1cmUgZnJvbSAnZmliZXJzL2Z1dHVyZSc7XG5cblJvY2tldENoYXQuU2FuZHN0b3JtID0ge307XG5cbmlmIChwcm9jZXNzLmVudi5TQU5EU1RPUk0gPT09ICcxJykge1xuXHRjb25zdCBDYXBucCA9IHJlcXVpcmUoJ2NhcG5wJyk7XG5cdGNvbnN0IHsgU2FuZHN0b3JtSHR0cEJyaWRnZSB9ID0gQ2FwbnAuaW1wb3J0U3lzdGVtKCdzYW5kc3Rvcm0vc2FuZHN0b3JtLWh0dHAtYnJpZGdlLmNhcG5wJyk7XG5cblx0bGV0IGNhcG5wQ29ubmVjdGlvbiA9IG51bGw7XG5cdGxldCBodHRwQnJpZGdlID0gbnVsbDtcblxuXHRnZXRIdHRwQnJpZGdlID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCFodHRwQnJpZGdlKSB7XG5cdFx0XHRjYXBucENvbm5lY3Rpb24gPSBDYXBucC5jb25uZWN0KCd1bml4Oi90bXAvc2FuZHN0b3JtLWFwaScpO1xuXHRcdFx0aHR0cEJyaWRnZSA9IGNhcG5wQ29ubmVjdGlvbi5yZXN0b3JlKG51bGwsIFNhbmRzdG9ybUh0dHBCcmlkZ2UpO1xuXHRcdH1cblx0XHRyZXR1cm4gaHR0cEJyaWRnZTtcblx0fTtcblxuXHRjb25zdCBwcm9taXNlVG9GdXR1cmUgPSBmdW5jdGlvbihwcm9taXNlKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gbmV3IEZ1dHVyZSgpO1xuXHRcdHByb21pc2UudGhlbihyZXN1bHQucmV0dXJuLmJpbmQocmVzdWx0KSwgcmVzdWx0LnRocm93LmJpbmQocmVzdWx0KSk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fTtcblxuXHR3YWl0UHJvbWlzZSA9IGZ1bmN0aW9uKHByb21pc2UpIHtcblx0XHRyZXR1cm4gcHJvbWlzZVRvRnV0dXJlKHByb21pc2UpLndhaXQoKTtcblx0fTtcblxuXHQvLyBUaGlzIHVzdWFsIGltcGxlbWVudGF0aW9uIG9mIHRoaXMgbWV0aG9kIHJldHVybnMgYW4gYWJzb2x1dGUgVVJMIHRoYXQgaXMgaW52YWxpZFxuXHQvLyB1bmRlciBTYW5kc3Rvcm0uXG5cdFVwbG9hZEZTLlN0b3JlLnByb3RvdHlwZS5nZXRVUkwgPSBmdW5jdGlvbihwYXRoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0UmVsYXRpdmVVUkwocGF0aCk7XG5cdH07XG59XG4iLCIvKiBnbG9iYWxzIGdldEh0dHBCcmlkZ2UsIHdhaXRQcm9taXNlICovXG5cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5Sb2NrZXRDaGF0LlNhbmRzdG9ybS5ub3RpZnkgPSBmdW5jdGlvbigpIHt9O1xuXG5pZiAocHJvY2Vzcy5lbnYuU0FORFNUT1JNID09PSAnMScpIHtcblx0Y29uc3QgQUNUSVZJVFlfVFlQRVMgPSB7XG5cdFx0bWVzc2FnZTogMCxcblx0XHRwcml2YXRlTWVzc2FnZTogMSxcblx0fTtcblxuXHRSb2NrZXRDaGF0LlNhbmRzdG9ybS5ub3RpZnkgPSBmdW5jdGlvbihtZXNzYWdlLCB1c2VySWRzLCBjYXB0aW9uLCB0eXBlKSB7XG5cdFx0Y29uc3Qgc2Vzc2lvbklkID0gbWVzc2FnZS5zYW5kc3Rvcm1TZXNzaW9uSWQ7XG5cdFx0aWYgKCFzZXNzaW9uSWQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgaHR0cEJyaWRnZSA9IGdldEh0dHBCcmlkZ2UoKTtcblx0XHRjb25zdCBhY3Rpdml0eSA9IHt9O1xuXG5cdFx0aWYgKHR5cGUpIHtcblx0XHRcdGFjdGl2aXR5LnR5cGUgPSBBQ1RJVklUWV9UWVBFU1t0eXBlXTtcblx0XHR9XG5cblx0XHRpZiAoY2FwdGlvbikge1xuXHRcdFx0YWN0aXZpdHkubm90aWZpY2F0aW9uID0geyBjYXB0aW9uOiB7IGRlZmF1bHRUZXh0OiBjYXB0aW9uIH0gfTtcblx0XHR9XG5cblx0XHRpZiAodXNlcklkcykge1xuXHRcdFx0YWN0aXZpdHkudXNlcnMgPSBfLm1hcCh1c2VySWRzLCBmdW5jdGlvbih1c2VySWQpIHtcblx0XHRcdFx0Y29uc3QgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHsgX2lkOiB1c2VySWQgfSwgeyBmaWVsZHM6IHsgJ3NlcnZpY2VzLnNhbmRzdG9ybS5pZCc6IDEgfSB9KTtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRpZGVudGl0eTogd2FpdFByb21pc2UoaHR0cEJyaWRnZS5nZXRTYXZlZElkZW50aXR5KHVzZXIuc2VydmljZXMuc2FuZHN0b3JtLmlkKSkuaWRlbnRpdHksXG5cdFx0XHRcdFx0bWVudGlvbmVkOiB0cnVlLFxuXHRcdFx0XHR9O1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHdhaXRQcm9taXNlKGh0dHBCcmlkZ2UuZ2V0U2Vzc2lvbkNvbnRleHQoc2Vzc2lvbklkKS5jb250ZXh0LmFjdGl2aXR5KGFjdGl2aXR5KSk7XG5cdH07XG59XG4iLCIvKiBnbG9iYWxzIGdldEh0dHBCcmlkZ2UsIHdhaXRQcm9taXNlICovXG5cblJvY2tldENoYXQuU2FuZHN0b3JtLm9mZmVyVWlWaWV3ID0gZnVuY3Rpb24oKSB7fTtcblxuaWYgKHByb2Nlc3MuZW52LlNBTkRTVE9STSA9PT0gJzEnKSB7XG5cdGNvbnN0IENhcG5wID0gcmVxdWlyZSgnY2FwbnAnKTtcblx0Y29uc3QgUG93ZXJib3ggPSBDYXBucC5pbXBvcnRTeXN0ZW0oJ3NhbmRzdG9ybS9wb3dlcmJveC5jYXBucCcpO1xuXHRjb25zdCBHcmFpbiA9IENhcG5wLmltcG9ydFN5c3RlbSgnc2FuZHN0b3JtL2dyYWluLmNhcG5wJyk7XG5cblx0Um9ja2V0Q2hhdC5TYW5kc3Rvcm0ub2ZmZXJVaVZpZXcgPSBmdW5jdGlvbih0b2tlbiwgc2VyaWFsaXplZERlc2NyaXB0b3IsIHNlc3Npb25JZCkge1xuXHRcdGNvbnN0IGh0dHBCcmlkZ2UgPSBnZXRIdHRwQnJpZGdlKCk7XG5cdFx0Y29uc3Qgc2Vzc2lvbiA9IGh0dHBCcmlkZ2UuZ2V0U2Vzc2lvbkNvbnRleHQoc2Vzc2lvbklkKS5jb250ZXh0O1xuXHRcdGNvbnN0IHsgYXBpIH0gPSBodHRwQnJpZGdlLmdldFNhbmRzdG9ybUFwaShzZXNzaW9uSWQpO1xuXHRcdGNvbnN0IHsgY2FwIH0gPSB3YWl0UHJvbWlzZShhcGkucmVzdG9yZShuZXcgQnVmZmVyKHRva2VuLCAnYmFzZTY0JykpKTtcblx0XHRyZXR1cm4gd2FpdFByb21pc2Uoc2Vzc2lvbi5vZmZlcihjYXAsIHVuZGVmaW5lZCwgeyB0YWdzOiBbe1xuXHRcdFx0aWQ6ICcxNTgzMTUxNTY0MTg4MTgxMzczNScsXG5cdFx0XHR2YWx1ZTogbmV3IEJ1ZmZlcihzZXJpYWxpemVkRGVzY3JpcHRvciwgJ2Jhc2U2NCcpLFxuXHRcdH1dIH0pKTtcblx0fTtcblxuXHRNZXRlb3IubWV0aG9kcyh7XG5cdFx0c2FuZHN0b3JtQ2xhaW1SZXF1ZXN0KHRva2VuLCBzZXJpYWxpemVkRGVzY3JpcHRvcikge1xuXHRcdFx0Y29uc3QgZGVzY3JpcHRvciA9IENhcG5wLnBhcnNlUGFja2VkKFBvd2VyYm94LlBvd2VyYm94RGVzY3JpcHRvciwgbmV3IEJ1ZmZlcihzZXJpYWxpemVkRGVzY3JpcHRvciwgJ2Jhc2U2NCcpKTtcblx0XHRcdGNvbnN0IGdyYWluVGl0bGUgPSBDYXBucC5wYXJzZShHcmFpbi5VaVZpZXcuUG93ZXJib3hUYWcsIGRlc2NyaXB0b3IudGFnc1swXS52YWx1ZSkudGl0bGU7XG5cdFx0XHRjb25zdCBzZXNzaW9uSWQgPSB0aGlzLmNvbm5lY3Rpb24uc2FuZHN0b3JtU2Vzc2lvbklkKCk7XG5cdFx0XHRjb25zdCBodHRwQnJpZGdlID0gZ2V0SHR0cEJyaWRnZSgpO1xuXHRcdFx0Y29uc3Qgc2Vzc2lvbiA9IGh0dHBCcmlkZ2UuZ2V0U2Vzc2lvbkNvbnRleHQoc2Vzc2lvbklkKS5jb250ZXh0O1xuXHRcdFx0Y29uc3QgY2FwID0gd2FpdFByb21pc2Uoc2Vzc2lvbi5jbGFpbVJlcXVlc3QodG9rZW4pKS5jYXAuY2FzdEFzKEdyYWluLlVpVmlldyk7XG5cdFx0XHRjb25zdCB7IGFwaSB9ID0gaHR0cEJyaWRnZS5nZXRTYW5kc3Rvcm1BcGkoc2Vzc2lvbklkKTtcblx0XHRcdGNvbnN0IG5ld1Rva2VuID0gd2FpdFByb21pc2UoYXBpLnNhdmUoY2FwKSkudG9rZW4udG9TdHJpbmcoJ2Jhc2U2NCcpO1xuXHRcdFx0Y29uc3Qgdmlld0luZm8gPSB3YWl0UHJvbWlzZShjYXAuZ2V0Vmlld0luZm8oKSk7XG5cdFx0XHRjb25zdCB7IGFwcFRpdGxlIH0gPSB2aWV3SW5mbztcblx0XHRcdGNvbnN0IGFzc2V0ID0gd2FpdFByb21pc2Uodmlld0luZm8uZ3JhaW5JY29uLmdldFVybCgpKTtcblx0XHRcdGNvbnN0IGFwcEljb25VcmwgPSBgJHsgYXNzZXQucHJvdG9jb2wgfTovLyR7IGFzc2V0Lmhvc3RQYXRoIH1gO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dG9rZW46IG5ld1Rva2VuLFxuXHRcdFx0XHRhcHBUaXRsZSxcblx0XHRcdFx0YXBwSWNvblVybCxcblx0XHRcdFx0Z3JhaW5UaXRsZSxcblx0XHRcdFx0ZGVzY3JpcHRvcjogZGVzY3JpcHRvci50YWdzWzBdLnZhbHVlLnRvU3RyaW5nKCdiYXNlNjQnKSxcblx0XHRcdH07XG5cdFx0fSxcblx0XHRzYW5kc3Rvcm1PZmZlcih0b2tlbiwgc2VyaWFsaXplZERlc2NyaXB0b3IpIHtcblx0XHRcdFJvY2tldENoYXQuU2FuZHN0b3JtLm9mZmVyVWlWaWV3KHRva2VuLCBzZXJpYWxpemVkRGVzY3JpcHRvcixcblx0XHRcdFx0dGhpcy5jb25uZWN0aW9uLnNhbmRzdG9ybVNlc3Npb25JZCgpKTtcblx0XHR9LFxuXHR9KTtcbn1cbiJdfQ==
