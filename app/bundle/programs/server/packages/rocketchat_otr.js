(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:otr":{"server":{"settings.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/rocketchat_otr/server/settings.js                                                               //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
RocketChat.settings.addGroup('OTR', function () {
  this.add('OTR_Enable', true, {
    type: 'boolean',
    i18nLabel: 'Enabled',
    public: true
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"Messages.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/rocketchat_otr/server/models/Messages.js                                                        //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
RocketChat.models.Messages.deleteOldOTRMessages = function (roomId, ts) {
  const query = {
    rid: roomId,
    t: 'otr',
    ts: {
      $lte: ts
    }
  };
  return this.remove(query);
};

RocketChat.models.Messages.updateOTRAck = function (_id, otrAck) {
  const query = {
    _id
  };
  const update = {
    $set: {
      otrAck
    }
  };
  return this.update(query, update);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"deleteOldOTRMessages.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/rocketchat_otr/server/methods/deleteOldOTRMessages.js                                           //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
Meteor.methods({
  deleteOldOTRMessages(roomId) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'deleteOldOTRMessages'
      });
    }

    const now = new Date();
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(roomId, Meteor.userId());

    if (subscription && subscription.t === 'd') {
      RocketChat.models.Messages.deleteOldOTRMessages(roomId, now);
    } else {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'deleteOldOTRMessages'
      });
    }
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"updateOTRAck.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/rocketchat_otr/server/methods/updateOTRAck.js                                                   //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
Meteor.methods({
  updateOTRAck(_id, ack) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'updateOTRAck'
      });
    }

    RocketChat.models.Messages.updateOTRAck(_id, ack);
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:otr/server/settings.js");
require("/node_modules/meteor/rocketchat:otr/server/models/Messages.js");
require("/node_modules/meteor/rocketchat:otr/server/methods/deleteOldOTRMessages.js");
require("/node_modules/meteor/rocketchat:otr/server/methods/updateOTRAck.js");

/* Exports */
Package._define("rocketchat:otr");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_otr.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvdHIvc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0Om90ci9zZXJ2ZXIvbW9kZWxzL01lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0Om90ci9zZXJ2ZXIvbWV0aG9kcy9kZWxldGVPbGRPVFJNZXNzYWdlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvdHIvc2VydmVyL21ldGhvZHMvdXBkYXRlT1RSQWNrLmpzIl0sIm5hbWVzIjpbIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImFkZEdyb3VwIiwiYWRkIiwidHlwZSIsImkxOG5MYWJlbCIsInB1YmxpYyIsIm1vZGVscyIsIk1lc3NhZ2VzIiwiZGVsZXRlT2xkT1RSTWVzc2FnZXMiLCJyb29tSWQiLCJ0cyIsInF1ZXJ5IiwicmlkIiwidCIsIiRsdGUiLCJyZW1vdmUiLCJ1cGRhdGVPVFJBY2siLCJfaWQiLCJvdHJBY2siLCJ1cGRhdGUiLCIkc2V0IiwiTWV0ZW9yIiwibWV0aG9kcyIsInVzZXJJZCIsIkVycm9yIiwibWV0aG9kIiwibm93IiwiRGF0ZSIsInN1YnNjcmlwdGlvbiIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kT25lQnlSb29tSWRBbmRVc2VySWQiLCJhY2siXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsV0FBV0MsUUFBWCxDQUFvQkMsUUFBcEIsQ0FBNkIsS0FBN0IsRUFBb0MsWUFBVztBQUM5QyxPQUFLQyxHQUFMLENBQVMsWUFBVCxFQUF1QixJQUF2QixFQUE2QjtBQUM1QkMsVUFBTSxTQURzQjtBQUU1QkMsZUFBVyxTQUZpQjtBQUc1QkMsWUFBUTtBQUhvQixHQUE3QjtBQUtBLENBTkQsRTs7Ozs7Ozs7Ozs7QUNBQU4sV0FBV08sTUFBWCxDQUFrQkMsUUFBbEIsQ0FBMkJDLG9CQUEzQixHQUFrRCxVQUFTQyxNQUFULEVBQWlCQyxFQUFqQixFQUFxQjtBQUN0RSxRQUFNQyxRQUFRO0FBQUVDLFNBQUtILE1BQVA7QUFBZUksT0FBRyxLQUFsQjtBQUF5QkgsUUFBSTtBQUFFSSxZQUFNSjtBQUFSO0FBQTdCLEdBQWQ7QUFDQSxTQUFPLEtBQUtLLE1BQUwsQ0FBWUosS0FBWixDQUFQO0FBQ0EsQ0FIRDs7QUFLQVosV0FBV08sTUFBWCxDQUFrQkMsUUFBbEIsQ0FBMkJTLFlBQTNCLEdBQTBDLFVBQVNDLEdBQVQsRUFBY0MsTUFBZCxFQUFzQjtBQUMvRCxRQUFNUCxRQUFRO0FBQUVNO0FBQUYsR0FBZDtBQUNBLFFBQU1FLFNBQVM7QUFBRUMsVUFBTTtBQUFFRjtBQUFGO0FBQVIsR0FBZjtBQUNBLFNBQU8sS0FBS0MsTUFBTCxDQUFZUixLQUFaLEVBQW1CUSxNQUFuQixDQUFQO0FBQ0EsQ0FKRCxDOzs7Ozs7Ozs7OztBQ0xBRSxPQUFPQyxPQUFQLENBQWU7QUFDZGQsdUJBQXFCQyxNQUFyQixFQUE2QjtBQUM1QixRQUFJLENBQUNZLE9BQU9FLE1BQVAsRUFBTCxFQUFzQjtBQUNyQixZQUFNLElBQUlGLE9BQU9HLEtBQVgsQ0FBaUIsb0JBQWpCLEVBQXVDLGNBQXZDLEVBQXVEO0FBQUVDLGdCQUFRO0FBQVYsT0FBdkQsQ0FBTjtBQUNBOztBQUVELFVBQU1DLE1BQU0sSUFBSUMsSUFBSixFQUFaO0FBQ0EsVUFBTUMsZUFBZTdCLFdBQVdPLE1BQVgsQ0FBa0J1QixhQUFsQixDQUFnQ0Msd0JBQWhDLENBQXlEckIsTUFBekQsRUFBaUVZLE9BQU9FLE1BQVAsRUFBakUsQ0FBckI7O0FBQ0EsUUFBSUssZ0JBQWdCQSxhQUFhZixDQUFiLEtBQW1CLEdBQXZDLEVBQTRDO0FBQzNDZCxpQkFBV08sTUFBWCxDQUFrQkMsUUFBbEIsQ0FBMkJDLG9CQUEzQixDQUFnREMsTUFBaEQsRUFBd0RpQixHQUF4RDtBQUNBLEtBRkQsTUFFTztBQUNOLFlBQU0sSUFBSUwsT0FBT0csS0FBWCxDQUFpQixvQkFBakIsRUFBdUMsY0FBdkMsRUFBdUQ7QUFBRUMsZ0JBQVE7QUFBVixPQUF2RCxDQUFOO0FBQ0E7QUFDRDs7QUFiYSxDQUFmLEU7Ozs7Ozs7Ozs7O0FDQUFKLE9BQU9DLE9BQVAsQ0FBZTtBQUNkTixlQUFhQyxHQUFiLEVBQWtCYyxHQUFsQixFQUF1QjtBQUN0QixRQUFJLENBQUNWLE9BQU9FLE1BQVAsRUFBTCxFQUFzQjtBQUNyQixZQUFNLElBQUlGLE9BQU9HLEtBQVgsQ0FBaUIsb0JBQWpCLEVBQXVDLGNBQXZDLEVBQXVEO0FBQUVDLGdCQUFRO0FBQVYsT0FBdkQsQ0FBTjtBQUNBOztBQUNEMUIsZUFBV08sTUFBWCxDQUFrQkMsUUFBbEIsQ0FBMkJTLFlBQTNCLENBQXdDQyxHQUF4QyxFQUE2Q2MsR0FBN0M7QUFDQTs7QUFOYSxDQUFmLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfb3RyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnT1RSJywgZnVuY3Rpb24oKSB7XG5cdHRoaXMuYWRkKCdPVFJfRW5hYmxlJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRpMThuTGFiZWw6ICdFbmFibGVkJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdH0pO1xufSk7XG4iLCJSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5kZWxldGVPbGRPVFJNZXNzYWdlcyA9IGZ1bmN0aW9uKHJvb21JZCwgdHMpIHtcblx0Y29uc3QgcXVlcnkgPSB7IHJpZDogcm9vbUlkLCB0OiAnb3RyJywgdHM6IHsgJGx0ZTogdHMgfSB9O1xuXHRyZXR1cm4gdGhpcy5yZW1vdmUocXVlcnkpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMudXBkYXRlT1RSQWNrID0gZnVuY3Rpb24oX2lkLCBvdHJBY2spIHtcblx0Y29uc3QgcXVlcnkgPSB7IF9pZCB9O1xuXHRjb25zdCB1cGRhdGUgPSB7ICRzZXQ6IHsgb3RyQWNrIH0gfTtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0ZGVsZXRlT2xkT1RSTWVzc2FnZXMocm9vbUlkKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2RlbGV0ZU9sZE9UUk1lc3NhZ2VzJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb21JZCwgTWV0ZW9yLnVzZXJJZCgpKTtcblx0XHRpZiAoc3Vic2NyaXB0aW9uICYmIHN1YnNjcmlwdGlvbi50ID09PSAnZCcpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmRlbGV0ZU9sZE9UUk1lc3NhZ2VzKHJvb21JZCwgbm93KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHsgbWV0aG9kOiAnZGVsZXRlT2xkT1RSTWVzc2FnZXMnIH0pO1xuXHRcdH1cblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHR1cGRhdGVPVFJBY2soX2lkLCBhY2spIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAndXBkYXRlT1RSQWNrJyB9KTtcblx0XHR9XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMudXBkYXRlT1RSQWNrKF9pZCwgYWNrKTtcblx0fSxcbn0pO1xuIl19
