(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:slashcommands-hide":{"server":{"hide.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////
//                                                                                      //
// packages/rocketchat_slashcommands-hide/server/hide.js                                //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////
                                                                                        //
/*
* Hide is a named function that will replace /hide commands
* @param {Object} message - The message object
*/
function Hide(command, param, item) {
  if (command !== 'hide' || !Match.test(param, String)) {
    return;
  }

  const room = param.trim();
  const user = Meteor.user(); // if there is not a param, hide the current room

  let {
    rid
  } = item;

  if (room !== '') {
    const [strippedRoom] = room.replace(/#|@/, '').split(' ');
    const [type] = room;
    const roomObject = type === '#' ? RocketChat.models.Rooms.findOneByName(strippedRoom) : RocketChat.models.Rooms.findOne({
      t: 'd',
      usernames: {
        $all: [user.username, strippedRoom]
      }
    });

    if (!roomObject) {
      return RocketChat.Notifications.notifyUser(user._id, 'message', {
        _id: Random.id(),
        rid: item.rid,
        ts: new Date(),
        msg: TAPi18n.__('Channel_doesnt_exist', {
          postProcess: 'sprintf',
          sprintf: [room]
        }, user.language)
      });
    }

    if (!RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user._id, {
      fields: {
        _id: 1
      }
    })) {
      return RocketChat.Notifications.notifyUser(user._id, 'message', {
        _id: Random.id(),
        rid: item.rid,
        ts: new Date(),
        msg: TAPi18n.__('error-logged-user-not-in-room', {
          postProcess: 'sprintf',
          sprintf: [room]
        }, user.language)
      });
    }

    rid = roomObject._id;
  }

  Meteor.call('hideRoom', rid, error => {
    if (error) {
      return RocketChat.Notifications.notifyUser(user._id, 'message', {
        _id: Random.id(),
        rid: item.rid,
        ts: new Date(),
        msg: TAPi18n.__(error, null, user.language)
      });
    }
  });
}

RocketChat.slashCommands.add('hide', Hide, {
  description: 'Hide_room',
  params: '#room'
});
//////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:slashcommands-hide/server/hide.js");

/* Exports */
Package._define("rocketchat:slashcommands-hide");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_slashcommands-hide.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFzaGNvbW1hbmRzLWhpZGUvc2VydmVyL2hpZGUuanMiXSwibmFtZXMiOlsiSGlkZSIsImNvbW1hbmQiLCJwYXJhbSIsIml0ZW0iLCJNYXRjaCIsInRlc3QiLCJTdHJpbmciLCJyb29tIiwidHJpbSIsInVzZXIiLCJNZXRlb3IiLCJyaWQiLCJzdHJpcHBlZFJvb20iLCJyZXBsYWNlIiwic3BsaXQiLCJ0eXBlIiwicm9vbU9iamVjdCIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJSb29tcyIsImZpbmRPbmVCeU5hbWUiLCJmaW5kT25lIiwidCIsInVzZXJuYW1lcyIsIiRhbGwiLCJ1c2VybmFtZSIsIk5vdGlmaWNhdGlvbnMiLCJub3RpZnlVc2VyIiwiX2lkIiwiUmFuZG9tIiwiaWQiLCJ0cyIsIkRhdGUiLCJtc2ciLCJUQVBpMThuIiwiX18iLCJwb3N0UHJvY2VzcyIsInNwcmludGYiLCJsYW5ndWFnZSIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kT25lQnlSb29tSWRBbmRVc2VySWQiLCJmaWVsZHMiLCJjYWxsIiwiZXJyb3IiLCJzbGFzaENvbW1hbmRzIiwiYWRkIiwiZGVzY3JpcHRpb24iLCJwYXJhbXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQTs7OztBQUlBLFNBQVNBLElBQVQsQ0FBY0MsT0FBZCxFQUF1QkMsS0FBdkIsRUFBOEJDLElBQTlCLEVBQW9DO0FBQ25DLE1BQUlGLFlBQVksTUFBWixJQUFzQixDQUFDRyxNQUFNQyxJQUFOLENBQVdILEtBQVgsRUFBa0JJLE1BQWxCLENBQTNCLEVBQXNEO0FBQ3JEO0FBQ0E7O0FBQ0QsUUFBTUMsT0FBT0wsTUFBTU0sSUFBTixFQUFiO0FBQ0EsUUFBTUMsT0FBT0MsT0FBT0QsSUFBUCxFQUFiLENBTG1DLENBTW5DOztBQUNBLE1BQUk7QUFBRUU7QUFBRixNQUFVUixJQUFkOztBQUNBLE1BQUlJLFNBQVMsRUFBYixFQUFpQjtBQUNoQixVQUFNLENBQUNLLFlBQUQsSUFBaUJMLEtBQUtNLE9BQUwsQ0FBYSxLQUFiLEVBQW9CLEVBQXBCLEVBQXdCQyxLQUF4QixDQUE4QixHQUE5QixDQUF2QjtBQUNBLFVBQU0sQ0FBQ0MsSUFBRCxJQUFTUixJQUFmO0FBRUEsVUFBTVMsYUFBYUQsU0FBUyxHQUFULEdBQWVFLFdBQVdDLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCQyxhQUF4QixDQUFzQ1IsWUFBdEMsQ0FBZixHQUFxRUssV0FBV0MsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JFLE9BQXhCLENBQWdDO0FBQ3ZIQyxTQUFHLEdBRG9IO0FBRXZIQyxpQkFBVztBQUFFQyxjQUFNLENBQUNmLEtBQUtnQixRQUFOLEVBQWdCYixZQUFoQjtBQUFSO0FBRjRHLEtBQWhDLENBQXhGOztBQUtBLFFBQUksQ0FBQ0ksVUFBTCxFQUFpQjtBQUNoQixhQUFPQyxXQUFXUyxhQUFYLENBQXlCQyxVQUF6QixDQUFvQ2xCLEtBQUttQixHQUF6QyxFQUE4QyxTQUE5QyxFQUF5RDtBQUMvREEsYUFBS0MsT0FBT0MsRUFBUCxFQUQwRDtBQUUvRG5CLGFBQUtSLEtBQUtRLEdBRnFEO0FBRy9Eb0IsWUFBSSxJQUFJQyxJQUFKLEVBSDJEO0FBSS9EQyxhQUFLQyxRQUFRQyxFQUFSLENBQVcsc0JBQVgsRUFBbUM7QUFDdkNDLHVCQUFhLFNBRDBCO0FBRXZDQyxtQkFBUyxDQUFDOUIsSUFBRDtBQUY4QixTQUFuQyxFQUdGRSxLQUFLNkIsUUFISDtBQUowRCxPQUF6RCxDQUFQO0FBU0E7O0FBRUQsUUFBSSxDQUFDckIsV0FBV0MsTUFBWCxDQUFrQnFCLGFBQWxCLENBQWdDQyx3QkFBaEMsQ0FBeURqQyxLQUFLcUIsR0FBOUQsRUFBbUVuQixLQUFLbUIsR0FBeEUsRUFBNkU7QUFBRWEsY0FBUTtBQUFFYixhQUFLO0FBQVA7QUFBVixLQUE3RSxDQUFMLEVBQTJHO0FBQzFHLGFBQU9YLFdBQVdTLGFBQVgsQ0FBeUJDLFVBQXpCLENBQW9DbEIsS0FBS21CLEdBQXpDLEVBQThDLFNBQTlDLEVBQXlEO0FBQy9EQSxhQUFLQyxPQUFPQyxFQUFQLEVBRDBEO0FBRS9EbkIsYUFBS1IsS0FBS1EsR0FGcUQ7QUFHL0RvQixZQUFJLElBQUlDLElBQUosRUFIMkQ7QUFJL0RDLGFBQUtDLFFBQVFDLEVBQVIsQ0FBVywrQkFBWCxFQUE0QztBQUNoREMsdUJBQWEsU0FEbUM7QUFFaERDLG1CQUFTLENBQUM5QixJQUFEO0FBRnVDLFNBQTVDLEVBR0ZFLEtBQUs2QixRQUhIO0FBSjBELE9BQXpELENBQVA7QUFTQTs7QUFDRDNCLFVBQU1LLFdBQVdZLEdBQWpCO0FBQ0E7O0FBRURsQixTQUFPZ0MsSUFBUCxDQUFZLFVBQVosRUFBd0IvQixHQUF4QixFQUE4QmdDLEtBQUQsSUFBVztBQUN2QyxRQUFJQSxLQUFKLEVBQVc7QUFDVixhQUFPMUIsV0FBV1MsYUFBWCxDQUF5QkMsVUFBekIsQ0FBb0NsQixLQUFLbUIsR0FBekMsRUFBOEMsU0FBOUMsRUFBeUQ7QUFDL0RBLGFBQUtDLE9BQU9DLEVBQVAsRUFEMEQ7QUFFL0RuQixhQUFLUixLQUFLUSxHQUZxRDtBQUcvRG9CLFlBQUksSUFBSUMsSUFBSixFQUgyRDtBQUkvREMsYUFBS0MsUUFBUUMsRUFBUixDQUFXUSxLQUFYLEVBQWtCLElBQWxCLEVBQXdCbEMsS0FBSzZCLFFBQTdCO0FBSjBELE9BQXpELENBQVA7QUFNQTtBQUNELEdBVEQ7QUFVQTs7QUFFRHJCLFdBQVcyQixhQUFYLENBQXlCQyxHQUF6QixDQUE2QixNQUE3QixFQUFxQzdDLElBQXJDLEVBQTJDO0FBQUU4QyxlQUFhLFdBQWY7QUFBNEJDLFVBQVE7QUFBcEMsQ0FBM0MsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9zbGFzaGNvbW1hbmRzLWhpZGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qXG4qIEhpZGUgaXMgYSBuYW1lZCBmdW5jdGlvbiB0aGF0IHdpbGwgcmVwbGFjZSAvaGlkZSBjb21tYW5kc1xuKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSAtIFRoZSBtZXNzYWdlIG9iamVjdFxuKi9cbmZ1bmN0aW9uIEhpZGUoY29tbWFuZCwgcGFyYW0sIGl0ZW0pIHtcblx0aWYgKGNvbW1hbmQgIT09ICdoaWRlJyB8fCAhTWF0Y2gudGVzdChwYXJhbSwgU3RyaW5nKSkge1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCByb29tID0gcGFyYW0udHJpbSgpO1xuXHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoKTtcblx0Ly8gaWYgdGhlcmUgaXMgbm90IGEgcGFyYW0sIGhpZGUgdGhlIGN1cnJlbnQgcm9vbVxuXHRsZXQgeyByaWQgfSA9IGl0ZW07XG5cdGlmIChyb29tICE9PSAnJykge1xuXHRcdGNvbnN0IFtzdHJpcHBlZFJvb21dID0gcm9vbS5yZXBsYWNlKC8jfEAvLCAnJykuc3BsaXQoJyAnKTtcblx0XHRjb25zdCBbdHlwZV0gPSByb29tO1xuXG5cdFx0Y29uc3Qgcm9vbU9iamVjdCA9IHR5cGUgPT09ICcjJyA/IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUoc3RyaXBwZWRSb29tKSA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmUoe1xuXHRcdFx0dDogJ2QnLFxuXHRcdFx0dXNlcm5hbWVzOiB7ICRhbGw6IFt1c2VyLnVzZXJuYW1lLCBzdHJpcHBlZFJvb21dIH0sXG5cdFx0fSk7XG5cblx0XHRpZiAoIXJvb21PYmplY3QpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5VXNlcih1c2VyLl9pZCwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdHJpZDogaXRlbS5yaWQsXG5cdFx0XHRcdHRzOiBuZXcgRGF0ZSxcblx0XHRcdFx0bXNnOiBUQVBpMThuLl9fKCdDaGFubmVsX2RvZXNudF9leGlzdCcsIHtcblx0XHRcdFx0XHRwb3N0UHJvY2VzczogJ3NwcmludGYnLFxuXHRcdFx0XHRcdHNwcmludGY6IFtyb29tXSxcblx0XHRcdFx0fSwgdXNlci5sYW5ndWFnZSksXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCB1c2VyLl9pZCwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5VXNlcih1c2VyLl9pZCwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdHJpZDogaXRlbS5yaWQsXG5cdFx0XHRcdHRzOiBuZXcgRGF0ZSxcblx0XHRcdFx0bXNnOiBUQVBpMThuLl9fKCdlcnJvci1sb2dnZWQtdXNlci1ub3QtaW4tcm9vbScsIHtcblx0XHRcdFx0XHRwb3N0UHJvY2VzczogJ3NwcmludGYnLFxuXHRcdFx0XHRcdHNwcmludGY6IFtyb29tXSxcblx0XHRcdFx0fSwgdXNlci5sYW5ndWFnZSksXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmlkID0gcm9vbU9iamVjdC5faWQ7XG5cdH1cblxuXHRNZXRlb3IuY2FsbCgnaGlkZVJvb20nLCByaWQsIChlcnJvcikgPT4ge1xuXHRcdGlmIChlcnJvcikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKHVzZXIuX2lkLCAnbWVzc2FnZScsIHtcblx0XHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdFx0cmlkOiBpdGVtLnJpZCxcblx0XHRcdFx0dHM6IG5ldyBEYXRlLFxuXHRcdFx0XHRtc2c6IFRBUGkxOG4uX18oZXJyb3IsIG51bGwsIHVzZXIubGFuZ3VhZ2UpLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcbn1cblxuUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmFkZCgnaGlkZScsIEhpZGUsIHsgZGVzY3JpcHRpb246ICdIaWRlX3Jvb20nLCBwYXJhbXM6ICcjcm9vbScgfSk7XG4iXX0=
