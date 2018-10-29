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

/* Package-scope variables */
var roomName, message;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:error-handler":{"server":{"lib":{"RocketChat.ErrorHandler.js":function(){

///////////////////////////////////////////////////////////////////////////////
//                                                                           //
// packages/rocketchat_error-handler/server/lib/RocketChat.ErrorHandler.js   //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////
                                                                             //
class ErrorHandler {
  constructor() {
    this.reporting = false;
    this.rid = null;
    this.lastError = null;
    Meteor.startup(() => {
      this.registerHandlers();
      RocketChat.settings.get('Log_Exceptions_to_Channel', (key, value) => {
        this.rid = null;
        const roomName = value.trim();

        if (roomName) {
          this.rid = this.getRoomId(roomName);
        }

        if (this.rid) {
          this.reporting = true;
        } else {
          this.reporting = false;
        }
      });
    });
  }

  registerHandlers() {
    process.on('uncaughtException', Meteor.bindEnvironment(error => {
      if (!this.reporting) {
        return;
      }

      this.trackError(error.message, error.stack);
    }));
    const self = this;
    const originalMeteorDebug = Meteor._debug;

    Meteor._debug = function (message, stack, ...args) {
      if (!self.reporting) {
        return originalMeteorDebug.call(this, message, stack);
      }

      self.trackError(message, stack);
      return originalMeteorDebug.apply(this, [message, stack, ...args]);
    };
  }

  getRoomId(roomName) {
    roomName = roomName.replace('#');
    const room = RocketChat.models.Rooms.findOneByName(roomName, {
      fields: {
        _id: 1,
        t: 1
      }
    });

    if (!room || room.t !== 'c' && room.t !== 'p') {
      return;
    }

    return room._id;
  }

  trackError(message, stack) {
    if (!this.reporting || !this.rid || this.lastError === message) {
      return;
    }

    this.lastError = message;
    const user = RocketChat.models.Users.findOneById('rocket.cat');

    if (stack) {
      message = `${message}\n\`\`\`\n${stack}\n\`\`\``;
    }

    RocketChat.sendMessage(user, {
      msg: message
    }, {
      _id: this.rid
    });
  }

}

RocketChat.ErrorHandler = new ErrorHandler();
///////////////////////////////////////////////////////////////////////////////

}},"startup":{"settings.js":function(){

///////////////////////////////////////////////////////////////////////////////
//                                                                           //
// packages/rocketchat_error-handler/server/startup/settings.js              //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////
                                                                             //
RocketChat.settings.addGroup('Logs', function () {
  this.add('Log_Exceptions_to_Channel', '', {
    type: 'string'
  });
});
///////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:error-handler/server/lib/RocketChat.ErrorHandler.js");
require("/node_modules/meteor/rocketchat:error-handler/server/startup/settings.js");

/* Exports */
Package._define("rocketchat:error-handler");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_error-handler.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDplcnJvci1oYW5kbGVyL3NlcnZlci9saWIvUm9ja2V0Q2hhdC5FcnJvckhhbmRsZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZXJyb3ItaGFuZGxlci9zZXJ2ZXIvc3RhcnR1cC9zZXR0aW5ncy5qcyJdLCJuYW1lcyI6WyJFcnJvckhhbmRsZXIiLCJjb25zdHJ1Y3RvciIsInJlcG9ydGluZyIsInJpZCIsImxhc3RFcnJvciIsIk1ldGVvciIsInN0YXJ0dXAiLCJyZWdpc3RlckhhbmRsZXJzIiwiUm9ja2V0Q2hhdCIsInNldHRpbmdzIiwiZ2V0Iiwia2V5IiwidmFsdWUiLCJyb29tTmFtZSIsInRyaW0iLCJnZXRSb29tSWQiLCJwcm9jZXNzIiwib24iLCJiaW5kRW52aXJvbm1lbnQiLCJlcnJvciIsInRyYWNrRXJyb3IiLCJtZXNzYWdlIiwic3RhY2siLCJzZWxmIiwib3JpZ2luYWxNZXRlb3JEZWJ1ZyIsIl9kZWJ1ZyIsImFyZ3MiLCJjYWxsIiwiYXBwbHkiLCJyZXBsYWNlIiwicm9vbSIsIm1vZGVscyIsIlJvb21zIiwiZmluZE9uZUJ5TmFtZSIsImZpZWxkcyIsIl9pZCIsInQiLCJ1c2VyIiwiVXNlcnMiLCJmaW5kT25lQnlJZCIsInNlbmRNZXNzYWdlIiwibXNnIiwiYWRkR3JvdXAiLCJhZGQiLCJ0eXBlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTUEsWUFBTixDQUFtQjtBQUNsQkMsZ0JBQWM7QUFDYixTQUFLQyxTQUFMLEdBQWlCLEtBQWpCO0FBQ0EsU0FBS0MsR0FBTCxHQUFXLElBQVg7QUFDQSxTQUFLQyxTQUFMLEdBQWlCLElBQWpCO0FBRUFDLFdBQU9DLE9BQVAsQ0FBZSxNQUFNO0FBQ3BCLFdBQUtDLGdCQUFMO0FBRUFDLGlCQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3QiwyQkFBeEIsRUFBcUQs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QTFDO0FBQ0EsQ0FGRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2Vycm9yLWhhbmRsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBFcnJvckhhbmRsZXIge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLnJlcG9ydGluZyA9IGZhbHNlO1xuXHRcdHRoaXMucmlkID0gbnVsbDtcblx0XHR0aGlzLmxhc3RFcnJvciA9IG51bGw7XG5cblx0XHRNZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG5cdFx0XHR0aGlzLnJlZ2lzdGVySGFuZGxlcnMoKTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xvZ19FeGNlcHRpb25zX3RvX0NoYW5uZWwnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHR0aGlzLnJpZCA9IG51bGw7XG5cdFx0XHRcdGNvbnN0IHJvb21OYW1lID0gdmFsdWUudHJpbSgpO1xuXHRcdFx0XHRpZiAocm9vbU5hbWUpIHtcblx0XHRcdFx0XHR0aGlzLnJpZCA9IHRoaXMuZ2V0Um9vbUlkKHJvb21OYW1lKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh0aGlzLnJpZCkge1xuXHRcdFx0XHRcdHRoaXMucmVwb3J0aW5nID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnJlcG9ydGluZyA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdHJlZ2lzdGVySGFuZGxlcnMoKSB7XG5cdFx0cHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChlcnJvcikgPT4ge1xuXHRcdFx0aWYgKCF0aGlzLnJlcG9ydGluZykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnRyYWNrRXJyb3IoZXJyb3IubWVzc2FnZSwgZXJyb3Iuc3RhY2spO1xuXHRcdH0pKTtcblxuXHRcdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRcdGNvbnN0IG9yaWdpbmFsTWV0ZW9yRGVidWcgPSBNZXRlb3IuX2RlYnVnO1xuXHRcdE1ldGVvci5fZGVidWcgPSBmdW5jdGlvbihtZXNzYWdlLCBzdGFjaywgLi4uYXJncykge1xuXHRcdFx0aWYgKCFzZWxmLnJlcG9ydGluZykge1xuXHRcdFx0XHRyZXR1cm4gb3JpZ2luYWxNZXRlb3JEZWJ1Zy5jYWxsKHRoaXMsIG1lc3NhZ2UsIHN0YWNrKTtcblx0XHRcdH1cblx0XHRcdHNlbGYudHJhY2tFcnJvcihtZXNzYWdlLCBzdGFjayk7XG5cdFx0XHRyZXR1cm4gb3JpZ2luYWxNZXRlb3JEZWJ1Zy5hcHBseSh0aGlzLCBbbWVzc2FnZSwgc3RhY2ssIC4uLmFyZ3NdKTtcblx0XHR9O1xuXHR9XG5cblx0Z2V0Um9vbUlkKHJvb21OYW1lKSB7XG5cdFx0cm9vbU5hbWUgPSByb29tTmFtZS5yZXBsYWNlKCcjJyk7XG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUocm9vbU5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSwgdDogMSB9IH0pO1xuXHRcdGlmICghcm9vbSB8fCAocm9vbS50ICE9PSAnYycgJiYgcm9vbS50ICE9PSAncCcpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHJldHVybiByb29tLl9pZDtcblx0fVxuXG5cdHRyYWNrRXJyb3IobWVzc2FnZSwgc3RhY2spIHtcblx0XHRpZiAoIXRoaXMucmVwb3J0aW5nIHx8ICF0aGlzLnJpZCB8fCB0aGlzLmxhc3RFcnJvciA9PT0gbWVzc2FnZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLmxhc3RFcnJvciA9IG1lc3NhZ2U7XG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKCdyb2NrZXQuY2F0Jyk7XG5cblx0XHRpZiAoc3RhY2spIHtcblx0XHRcdG1lc3NhZ2UgPSBgJHsgbWVzc2FnZSB9XFxuXFxgXFxgXFxgXFxuJHsgc3RhY2sgfVxcblxcYFxcYFxcYGA7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdC5zZW5kTWVzc2FnZSh1c2VyLCB7IG1zZzogbWVzc2FnZSB9LCB7IF9pZDogdGhpcy5yaWQgfSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5FcnJvckhhbmRsZXIgPSBuZXcgRXJyb3JIYW5kbGVyO1xuIiwiUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnTG9ncycsIGZ1bmN0aW9uKCkge1xuXHR0aGlzLmFkZCgnTG9nX0V4Y2VwdGlvbnNfdG9fQ2hhbm5lbCcsICcnLCB7IHR5cGU6ICdzdHJpbmcnIH0pO1xufSk7XG4iXX0=
