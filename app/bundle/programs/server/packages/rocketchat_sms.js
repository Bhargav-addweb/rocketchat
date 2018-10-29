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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:sms":{"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////
//                                                                                    //
// packages/rocketchat_sms/settings.js                                                //
//                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////
                                                                                      //
Meteor.startup(function () {
  RocketChat.settings.addGroup('SMS', function () {
    this.add('SMS_Enabled', false, {
      type: 'boolean',
      i18nLabel: 'Enabled'
    });
    this.add('SMS_Service', 'twilio', {
      type: 'select',
      values: [{
        key: 'twilio',
        i18nLabel: 'Twilio'
      }],
      i18nLabel: 'Service'
    });
    this.section('Twilio', function () {
      this.add('SMS_Twilio_Account_SID', '', {
        type: 'string',
        enableQuery: {
          _id: 'SMS_Service',
          value: 'twilio'
        },
        i18nLabel: 'Account_SID'
      });
      this.add('SMS_Twilio_authToken', '', {
        type: 'string',
        enableQuery: {
          _id: 'SMS_Service',
          value: 'twilio'
        },
        i18nLabel: 'Auth_Token'
      });
    });
  });
});
////////////////////////////////////////////////////////////////////////////////////////

},"SMS.js":function(){

////////////////////////////////////////////////////////////////////////////////////////
//                                                                                    //
// packages/rocketchat_sms/SMS.js                                                     //
//                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////
                                                                                      //
/* globals RocketChat */
RocketChat.SMS = {
  enabled: false,
  services: {},
  accountSid: null,
  authToken: null,
  fromNumber: null,

  registerService(name, service) {
    this.services[name] = service;
  },

  getService(name) {
    if (!this.services[name]) {
      throw new Meteor.Error('error-sms-service-not-configured');
    }

    return new this.services[name](this.accountSid, this.authToken, this.fromNumber);
  }

};
RocketChat.settings.get('SMS_Enabled', function (key, value) {
  RocketChat.SMS.enabled = value;
});
////////////////////////////////////////////////////////////////////////////////////////

},"services":{"twilio.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////
//                                                                                    //
// packages/rocketchat_sms/services/twilio.js                                         //
//                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////
                                                                                      //
let twilio;
module.watch(require("twilio"), {
  default(v) {
    twilio = v;
  }

}, 0);

class Twilio {
  constructor() {
    this.accountSid = RocketChat.settings.get('SMS_Twilio_Account_SID');
    this.authToken = RocketChat.settings.get('SMS_Twilio_authToken');
  }

  parse(data) {
    let numMedia = 0;
    const returnData = {
      from: data.From,
      to: data.To,
      body: data.Body,
      extra: {
        toCountry: data.ToCountry,
        toState: data.ToState,
        toCity: data.ToCity,
        toZip: data.ToZip,
        fromCountry: data.FromCountry,
        fromState: data.FromState,
        fromCity: data.FromCity,
        fromZip: data.FromZip
      }
    };

    if (data.NumMedia) {
      numMedia = parseInt(data.NumMedia, 10);
    }

    if (isNaN(numMedia)) {
      console.error(`Error parsing NumMedia ${data.NumMedia}`);
      return returnData;
    }

    returnData.media = [];

    for (let mediaIndex = 0; mediaIndex < numMedia; mediaIndex++) {
      const media = {
        url: '',
        contentType: ''
      };
      const mediaUrl = data[`MediaUrl${mediaIndex}`];
      const contentType = data[`MediaContentType${mediaIndex}`];
      media.url = mediaUrl;
      media.contentType = contentType;
      returnData.media.push(media);
    }

    return returnData;
  }

  send(fromNumber, toNumber, message) {
    const client = twilio(this.accountSid, this.authToken);
    client.messages.create({
      to: toNumber,
      from: fromNumber,
      body: message
    });
  }

  response()
  /* message */
  {
    return {
      headers: {
        'Content-Type': 'text/xml'
      },
      body: '<Response></Response>'
    };
  }

  error(error) {
    let message = '';

    if (error.reason) {
      message = `<Message>${error.reason}</Message>`;
    }

    return {
      headers: {
        'Content-Type': 'text/xml'
      },
      body: `<Response>${message}</Response>`
    };
  }

}

RocketChat.SMS.registerService('twilio', Twilio);
////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:sms/settings.js");
require("/node_modules/meteor/rocketchat:sms/SMS.js");
require("/node_modules/meteor/rocketchat:sms/services/twilio.js");

/* Exports */
Package._define("rocketchat:sms");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_sms.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbXMvc2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c21zL1NNUy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbXMvc2VydmljZXMvdHdpbGlvLmpzIl0sIm5hbWVzIjpbIk1ldGVvciIsInN0YXJ0dXAiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJhZGRHcm91cCIsImFkZCIsInR5cGUiLCJpMThuTGFiZWwiLCJ2YWx1ZXMiLCJrZXkiLCJzZWN0aW9uIiwiZW5hYmxlUXVlcnkiLCJfaWQiLCJ2YWx1ZSIsIlNNUyIsImVuYWJsZWQiLCJzZXJ2aWNlcyIsImFjY291bnRTaWQiLCJhdXRoVG9rZW4iLCJmcm9tTnVtYmVyIiwicmVnaXN0ZXJTZXJ2aWNlIiwibmFtZSIsInNlcnZpY2UiLCJnZXRTZXJ2aWNlIiwiRXJyb3IiLCJnZXQiLCJ0d2lsaW8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsIlR3aWxpbyIsImNvbnN0cnVjdG9yIiwicGFyc2UiLCJkYXRhIiwibnVtTWVkaWEiLCJyZXR1cm5EYXRhIiwiZnJvbSIsIkZyb20iLCJ0byIsIlRvIiwiYm9keSIsIkJvZHkiLCJleHRyYSIsInRvQ291bnRyeSIsIlRvQ291bnRyeSIsInRvU3RhdGUiLCJUb1N0YXRlIiwidG9DaXR5IiwiVG9DaXR5IiwidG9aaXAiLCJUb1ppcCIsImZyb21Db3VudHJ5IiwiRnJvbUNvdW50cnkiLCJmcm9tU3RhdGUiLCJGcm9tU3RhdGUiLCJmcm9tQ2l0eSIsIkZyb21DaXR5IiwiZnJvbVppcCIsIkZyb21aaXAiLCJOdW1NZWRpYSIsInBhcnNlSW50IiwiaXNOYU4iLCJjb25zb2xlIiwiZXJyb3IiLCJtZWRpYSIsIm1lZGlhSW5kZXgiLCJ1cmwiLCJjb250ZW50VHlwZSIsIm1lZGlhVXJsIiwicHVzaCIsInNlbmQiLCJ0b051bWJlciIsIm1lc3NhZ2UiLCJjbGllbnQiLCJtZXNzYWdlcyIsImNyZWF0ZSIsInJlc3BvbnNlIiwiaGVhZGVycyIsInJlYXNvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxPQUFQLENBQWUsWUFBVztBQUN6QkMsYUFBV0MsUUFBWCxDQUFvQkMsUUFBcEIsQ0FBNkIsS0FBN0IsRUFBb0MsWUFBVztBQUM5QyxTQUFLQyxHQUFMLENBQVMsYUFBVCxFQUF3QixLQUF4QixFQUErQjtBQUM5QkMsWUFBTSxTQUR3QjtBQUU5QkMsaUJBQVc7QUFGbUIsS0FBL0I7QUFLQSxTQUFLRixHQUFMLENBQVMsYUFBVCxFQUF3QixRQUF4QixFQUFrQztBQUNqQ0MsWUFBTSxRQUQyQjtBQUVqQ0UsY0FBUSxDQUFDO0FBQ1JDLGFBQUssUUFERztBQUVSRixtQkFBVztBQUZILE9BQUQsQ0FGeUI7QUFNakNBLGlCQUFXO0FBTnNCLEtBQWxDO0FBU0EsU0FBS0csT0FBTCxDQUFhLFFBQWIsRUFBdUIsWUFBVztBQUNqQyxXQUFLTCxHQUFMLENBQVMsd0JBQVQsRUFBbUMsRUFBbkMsRUFBdUM7QUFDdENDLGNBQU0sUUFEZ0M7QUFFdENLLHFCQUFhO0FBQ1pDLGVBQUssYUFETztBQUVaQyxpQkFBTztBQUZLLFNBRnlCO0FBTXRDTixtQkFBVztBQU4yQixPQUF2QztBQVFBLFdBQUtGLEdBQUwsQ0FBUyxzQkFBVCxFQUFpQyxFQUFqQyxFQUFxQztBQUNwQ0MsY0FBTSxRQUQ4QjtBQUVwQ0sscUJBQWE7QUFDWkMsZUFBSyxhQURPO0FBRVpDLGlCQUFPO0FBRkssU0FGdUI7QUFNcENOLG1CQUFXO0FBTnlCLE9BQXJDO0FBUUEsS0FqQkQ7QUFrQkEsR0FqQ0Q7QUFrQ0EsQ0FuQ0QsRTs7Ozs7Ozs7Ozs7QUNBQTtBQUNBTCxXQUFXWSxHQUFYLEdBQWlCO0FBQ2hCQyxXQUFTLEtBRE87QUFFaEJDLFlBQVUsRUFGTTtBQUdoQkMsY0FBWSxJQUhJO0FBSWhCQyxhQUFXLElBSks7QUFL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QyxTQUFTakQsT0FBTyxLQUFLVCxVQUFaLEVBQXdCLEtBQUtDLFNBQTdCLENBQWY7QUFFQXlELFdBQU9DLFFBQVAsQ0FBZ0JDLE1BQWhCLENBQXVCO0FBQ3RCckMsVUFBSWlDLFFBRGtCO0FBRXRCbkMsWUFBTW5CLFVBRmdCO0FBR3RCdUIsWUFBTWdDO0FBSGdCLEtBQXZCO0FBS0E7O0FBQ0RJO0FBQVM7QUFBZTtBQUN2QixXQUFPO0FBQ05DLGVBQVM7QUFDUix3QkFBZ0I7QUFEUixPQURIO0FBSU5yQyxZQUFNO0FBSkEsS0FBUDtBQU1BOztBQUNEdUIsUUFBTUEsS0FBTixFQUFhO0FBQ1osUUFBSVMsVUFBVSxFQUFkOztBQUNBLFFBQUlULE1BQU1lLE1BQVYsRUFBa0I7QUFDakJOLGdCQUFXLFlBQVlULE1BQU1lLE1BQVEsWUFBckM7QUFDQTs7QUFDRCxXQUFPO0FBQ05ELGVBQVM7QUFDUix3QkFBZ0I7QUFEUixPQURIO0FBSU5yQyxZQUFPLGFBQWFnQyxPQUFTO0FBSnZCLEtBQVA7QUFNQTs7QUFqRlc7O0FBb0ZieEUsV0FBV1ksR0FBWCxDQUFlTSxlQUFmLENBQStCLFFBQS9CLEVBQXlDWSxNQUF6QyxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3Ntcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdTTVMnLCBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmFkZCgnU01TX0VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0aTE4bkxhYmVsOiAnRW5hYmxlZCcsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnU01TX1NlcnZpY2UnLCAndHdpbGlvJywge1xuXHRcdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0XHR2YWx1ZXM6IFt7XG5cdFx0XHRcdGtleTogJ3R3aWxpbycsXG5cdFx0XHRcdGkxOG5MYWJlbDogJ1R3aWxpbycsXG5cdFx0XHR9XSxcblx0XHRcdGkxOG5MYWJlbDogJ1NlcnZpY2UnLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5zZWN0aW9uKCdUd2lsaW8nLCBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuYWRkKCdTTVNfVHdpbGlvX0FjY291bnRfU0lEJywgJycsIHtcblx0XHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdFx0X2lkOiAnU01TX1NlcnZpY2UnLFxuXHRcdFx0XHRcdHZhbHVlOiAndHdpbGlvJyxcblx0XHRcdFx0fSxcblx0XHRcdFx0aTE4bkxhYmVsOiAnQWNjb3VudF9TSUQnLFxuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLmFkZCgnU01TX1R3aWxpb19hdXRoVG9rZW4nLCAnJywge1xuXHRcdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0XHRfaWQ6ICdTTVNfU2VydmljZScsXG5cdFx0XHRcdFx0dmFsdWU6ICd0d2lsaW8nLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpMThuTGFiZWw6ICdBdXRoX1Rva2VuJyxcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9KTtcbn0pO1xuIiwiLyogZ2xvYmFscyBSb2NrZXRDaGF0ICovXG5Sb2NrZXRDaGF0LlNNUyA9IHtcblx0ZW5hYmxlZDogZmFsc2UsXG5cdHNlcnZpY2VzOiB7fSxcblx0YWNjb3VudFNpZDogbnVsbCxcblx0YXV0aFRva2VuOiBudWxsLFxuXHRmcm9tTnVtYmVyOiBudWxsLFxuXG5cdHJlZ2lzdGVyU2VydmljZShuYW1lLCBzZXJ2aWNlKSB7XG5cdFx0dGhpcy5zZXJ2aWNlc1tuYW1lXSA9IHNlcnZpY2U7XG5cdH0sXG5cblx0Z2V0U2VydmljZShuYW1lKSB7XG5cdFx0aWYgKCF0aGlzLnNlcnZpY2VzW25hbWVdKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1zbXMtc2VydmljZS1ub3QtY29uZmlndXJlZCcpO1xuXHRcdH1cblx0XHRyZXR1cm4gbmV3IHRoaXMuc2VydmljZXNbbmFtZV0odGhpcy5hY2NvdW50U2lkLCB0aGlzLmF1dGhUb2tlbiwgdGhpcy5mcm9tTnVtYmVyKTtcblx0fSxcbn07XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTTVNfRW5hYmxlZCcsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0Um9ja2V0Q2hhdC5TTVMuZW5hYmxlZCA9IHZhbHVlO1xufSk7XG4iLCIvKiBnbG9iYWxzIFJvY2tldENoYXQgKi9cbmltcG9ydCB0d2lsaW8gZnJvbSAndHdpbGlvJztcblxuY2xhc3MgVHdpbGlvIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5hY2NvdW50U2lkID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NNU19Ud2lsaW9fQWNjb3VudF9TSUQnKTtcblx0XHR0aGlzLmF1dGhUb2tlbiA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTTVNfVHdpbGlvX2F1dGhUb2tlbicpO1xuXHR9XG5cdHBhcnNlKGRhdGEpIHtcblx0XHRsZXQgbnVtTWVkaWEgPSAwO1xuXG5cdFx0Y29uc3QgcmV0dXJuRGF0YSA9IHtcblx0XHRcdGZyb206IGRhdGEuRnJvbSxcblx0XHRcdHRvOiBkYXRhLlRvLFxuXHRcdFx0Ym9keTogZGF0YS5Cb2R5LFxuXG5cdFx0XHRleHRyYToge1xuXHRcdFx0XHR0b0NvdW50cnk6IGRhdGEuVG9Db3VudHJ5LFxuXHRcdFx0XHR0b1N0YXRlOiBkYXRhLlRvU3RhdGUsXG5cdFx0XHRcdHRvQ2l0eTogZGF0YS5Ub0NpdHksXG5cdFx0XHRcdHRvWmlwOiBkYXRhLlRvWmlwLFxuXHRcdFx0XHRmcm9tQ291bnRyeTogZGF0YS5Gcm9tQ291bnRyeSxcblx0XHRcdFx0ZnJvbVN0YXRlOiBkYXRhLkZyb21TdGF0ZSxcblx0XHRcdFx0ZnJvbUNpdHk6IGRhdGEuRnJvbUNpdHksXG5cdFx0XHRcdGZyb21aaXA6IGRhdGEuRnJvbVppcCxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdGlmIChkYXRhLk51bU1lZGlhKSB7XG5cdFx0XHRudW1NZWRpYSA9IHBhcnNlSW50KGRhdGEuTnVtTWVkaWEsIDEwKTtcblx0XHR9XG5cblx0XHRpZiAoaXNOYU4obnVtTWVkaWEpKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKGBFcnJvciBwYXJzaW5nIE51bU1lZGlhICR7IGRhdGEuTnVtTWVkaWEgfWApO1xuXHRcdFx0cmV0dXJuIHJldHVybkRhdGE7XG5cdFx0fVxuXG5cdFx0cmV0dXJuRGF0YS5tZWRpYSA9IFtdO1xuXG5cdFx0Zm9yIChsZXQgbWVkaWFJbmRleCA9IDA7IG1lZGlhSW5kZXggPCBudW1NZWRpYTsgbWVkaWFJbmRleCsrKSB7XG5cdFx0XHRjb25zdCBtZWRpYSA9IHtcblx0XHRcdFx0dXJsOiAnJyxcblx0XHRcdFx0Y29udGVudFR5cGU6ICcnLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgbWVkaWFVcmwgPSBkYXRhW2BNZWRpYVVybCR7IG1lZGlhSW5kZXggfWBdO1xuXHRcdFx0Y29uc3QgY29udGVudFR5cGUgPSBkYXRhW2BNZWRpYUNvbnRlbnRUeXBlJHsgbWVkaWFJbmRleCB9YF07XG5cblx0XHRcdG1lZGlhLnVybCA9IG1lZGlhVXJsO1xuXHRcdFx0bWVkaWEuY29udGVudFR5cGUgPSBjb250ZW50VHlwZTtcblxuXHRcdFx0cmV0dXJuRGF0YS5tZWRpYS5wdXNoKG1lZGlhKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmV0dXJuRGF0YTtcblx0fVxuXHRzZW5kKGZyb21OdW1iZXIsIHRvTnVtYmVyLCBtZXNzYWdlKSB7XG5cdFx0Y29uc3QgY2xpZW50ID0gdHdpbGlvKHRoaXMuYWNjb3VudFNpZCwgdGhpcy5hdXRoVG9rZW4pO1xuXG5cdFx0Y2xpZW50Lm1lc3NhZ2VzLmNyZWF0ZSh7XG5cdFx0XHR0bzogdG9OdW1iZXIsXG5cdFx0XHRmcm9tOiBmcm9tTnVtYmVyLFxuXHRcdFx0Ym9keTogbWVzc2FnZSxcblx0XHR9KTtcblx0fVxuXHRyZXNwb25zZSgvKiBtZXNzYWdlICovKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0J0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3htbCcsXG5cdFx0XHR9LFxuXHRcdFx0Ym9keTogJzxSZXNwb25zZT48L1Jlc3BvbnNlPicsXG5cdFx0fTtcblx0fVxuXHRlcnJvcihlcnJvcikge1xuXHRcdGxldCBtZXNzYWdlID0gJyc7XG5cdFx0aWYgKGVycm9yLnJlYXNvbikge1xuXHRcdFx0bWVzc2FnZSA9IGA8TWVzc2FnZT4keyBlcnJvci5yZWFzb24gfTwvTWVzc2FnZT5gO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHQnQ29udGVudC1UeXBlJzogJ3RleHQveG1sJyxcblx0XHRcdH0sXG5cdFx0XHRib2R5OiBgPFJlc3BvbnNlPiR7IG1lc3NhZ2UgfTwvUmVzcG9uc2U+YCxcblx0XHR9O1xuXHR9XG59XG5cblJvY2tldENoYXQuU01TLnJlZ2lzdGVyU2VydmljZSgndHdpbGlvJywgVHdpbGlvKTtcbiJdfQ==
