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
var visionData;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:google-vision":{"server":{"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_google-vision/server/settings.js                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.startup(function () {
  RocketChat.settings.add('GoogleVision_Enable', false, {
    type: 'boolean',
    group: 'FileUpload',
    section: 'Google Vision',
    public: true,
    enableQuery: {
      _id: 'FileUpload_Storage_Type',
      value: 'GoogleCloudStorage'
    }
  });
  RocketChat.settings.add('GoogleVision_ServiceAccount', '', {
    type: 'string',
    group: 'FileUpload',
    section: 'Google Vision',
    multiline: true,
    enableQuery: {
      _id: 'GoogleVision_Enable',
      value: true
    }
  });
  RocketChat.settings.add('GoogleVision_Max_Monthly_Calls', 0, {
    type: 'int',
    group: 'FileUpload',
    section: 'Google Vision',
    enableQuery: {
      _id: 'GoogleVision_Enable',
      value: true
    }
  });
  RocketChat.settings.add('GoogleVision_Current_Month', 0, {
    type: 'int',
    group: 'FileUpload',
    section: 'Google Vision',
    hidden: true
  });
  RocketChat.settings.add('GoogleVision_Current_Month_Calls', 0, {
    type: 'int',
    group: 'FileUpload',
    section: 'Google Vision',
    blocked: true
  });
  RocketChat.settings.add('GoogleVision_Type_Document', false, {
    type: 'boolean',
    group: 'FileUpload',
    section: 'Google Vision',
    enableQuery: {
      _id: 'GoogleVision_Enable',
      value: true
    }
  });
  RocketChat.settings.add('GoogleVision_Type_Faces', false, {
    type: 'boolean',
    group: 'FileUpload',
    section: 'Google Vision',
    enableQuery: {
      _id: 'GoogleVision_Enable',
      value: true
    }
  });
  RocketChat.settings.add('GoogleVision_Type_Landmarks', false, {
    type: 'boolean',
    group: 'FileUpload',
    section: 'Google Vision',
    enableQuery: {
      _id: 'GoogleVision_Enable',
      value: true
    }
  });
  RocketChat.settings.add('GoogleVision_Type_Labels', false, {
    type: 'boolean',
    group: 'FileUpload',
    section: 'Google Vision',
    enableQuery: {
      _id: 'GoogleVision_Enable',
      value: true
    }
  });
  RocketChat.settings.add('GoogleVision_Type_Logos', false, {
    type: 'boolean',
    group: 'FileUpload',
    section: 'Google Vision',
    enableQuery: {
      _id: 'GoogleVision_Enable',
      value: true
    }
  });
  RocketChat.settings.add('GoogleVision_Type_Properties', false, {
    type: 'boolean',
    group: 'FileUpload',
    section: 'Google Vision',
    enableQuery: {
      _id: 'GoogleVision_Enable',
      value: true
    }
  });
  RocketChat.settings.add('GoogleVision_Type_SafeSearch', false, {
    type: 'boolean',
    group: 'FileUpload',
    section: 'Google Vision',
    enableQuery: {
      _id: 'GoogleVision_Enable',
      value: true
    }
  });
  RocketChat.settings.add('GoogleVision_Block_Adult_Images', false, {
    type: 'boolean',
    group: 'FileUpload',
    section: 'Google Vision',
    enableQuery: [{
      _id: 'GoogleVision_Enable',
      value: true
    }, {
      _id: 'GoogleVision_Type_SafeSearch',
      value: true
    }]
  });
  RocketChat.settings.add('GoogleVision_Type_Similar', false, {
    type: 'boolean',
    group: 'FileUpload',
    section: 'Google Vision',
    enableQuery: {
      _id: 'GoogleVision_Enable',
      value: true
    }
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"googlevision.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_google-vision/server/googlevision.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
class GoogleVision {
  constructor() {
    this.storage = require('@google-cloud/storage');
    this.vision = require('@google-cloud/vision');
    this.storageClient = {};
    this.visionClient = {};
    this.enabled = RocketChat.settings.get('GoogleVision_Enable');
    this.serviceAccount = {};
    RocketChat.settings.get('GoogleVision_Enable', (key, value) => {
      this.enabled = value;
    });
    RocketChat.settings.get('GoogleVision_ServiceAccount', (key, value) => {
      try {
        this.serviceAccount = JSON.parse(value);
        this.storageClient = this.storage({
          credentials: this.serviceAccount
        });
        this.visionClient = this.vision({
          credentials: this.serviceAccount
        });
      } catch (e) {
        this.serviceAccount = {};
      }
    });
    RocketChat.settings.get('GoogleVision_Block_Adult_Images', (key, value) => {
      if (value) {
        RocketChat.callbacks.add('beforeSaveMessage', this.blockUnsafeImages.bind(this), RocketChat.callbacks.priority.MEDIUM, 'googlevision-blockunsafe');
      } else {
        RocketChat.callbacks.remove('beforeSaveMessage', 'googlevision-blockunsafe');
      }
    });
    RocketChat.callbacks.add('afterFileUpload', this.annotate.bind(this));
  }

  incCallCount(count) {
    const currentMonth = new Date().getMonth();
    const maxMonthlyCalls = RocketChat.settings.get('GoogleVision_Max_Monthly_Calls') || 0;

    if (maxMonthlyCalls > 0) {
      if (RocketChat.settings.get('GoogleVision_Current_Month') !== currentMonth) {
        RocketChat.settings.set('GoogleVision_Current_Month', currentMonth);

        if (count > maxMonthlyCalls) {
          return false;
        }
      } else if (count + (RocketChat.settings.get('GoogleVision_Current_Month_Calls') || 0) > maxMonthlyCalls) {
        return false;
      }
    }

    RocketChat.models.Settings.update({
      _id: 'GoogleVision_Current_Month_Calls'
    }, {
      $inc: {
        value: count
      }
    });
    return true;
  }

  blockUnsafeImages(message) {
    if (this.enabled && this.serviceAccount && message && message.file && message.file._id) {
      const file = RocketChat.models.Uploads.findOne({
        _id: message.file._id
      });

      if (file && file.type && file.type.indexOf('image') !== -1 && file.store === 'GoogleCloudStorage:Uploads' && file.GoogleStorage) {
        if (this.incCallCount(1)) {
          const bucket = this.storageClient.bucket(RocketChat.settings.get('FileUpload_GoogleStorage_Bucket'));
          const bucketFile = bucket.file(file.GoogleStorage.path);
          const results = Meteor.wrapAsync(this.visionClient.detectSafeSearch, this.visionClient)(bucketFile);

          if (results && results.adult === true) {
            FileUpload.getStore('Uploads').deleteById(file._id);
            const user = RocketChat.models.Users.findOneById(message.u && message.u._id);

            if (user) {
              RocketChat.Notifications.notifyUser(user._id, 'message', {
                _id: Random.id(),
                rid: message.rid,
                ts: new Date(),
                msg: TAPi18n.__('Adult_images_are_not_allowed', {}, user.language)
              });
            }

            throw new Meteor.Error('GoogleVisionError: Image blocked');
          }
        } else {
          console.error('Google Vision: Usage limit exceeded');
        }

        return message;
      }
    }
  }

  annotate({
    message
  }) {
    const visionTypes = [];

    if (RocketChat.settings.get('GoogleVision_Type_Document')) {
      visionTypes.push('document');
    }

    if (RocketChat.settings.get('GoogleVision_Type_Faces')) {
      visionTypes.push('faces');
    }

    if (RocketChat.settings.get('GoogleVision_Type_Landmarks')) {
      visionTypes.push('landmarks');
    }

    if (RocketChat.settings.get('GoogleVision_Type_Labels')) {
      visionTypes.push('labels');
    }

    if (RocketChat.settings.get('GoogleVision_Type_Logos')) {
      visionTypes.push('logos');
    }

    if (RocketChat.settings.get('GoogleVision_Type_Properties')) {
      visionTypes.push('properties');
    }

    if (RocketChat.settings.get('GoogleVision_Type_SafeSearch')) {
      visionTypes.push('safeSearch');
    }

    if (RocketChat.settings.get('GoogleVision_Type_Similar')) {
      visionTypes.push('similar');
    }

    if (this.enabled && this.serviceAccount && visionTypes.length > 0 && message.file && message.file._id) {
      const file = RocketChat.models.Uploads.findOne({
        _id: message.file._id
      });

      if (file && file.type && file.type.indexOf('image') !== -1 && file.store === 'GoogleCloudStorage:Uploads' && file.GoogleStorage) {
        if (this.incCallCount(visionTypes.length)) {
          const bucket = this.storageClient.bucket(RocketChat.settings.get('FileUpload_GoogleStorage_Bucket'));
          const bucketFile = bucket.file(file.GoogleStorage.path);
          this.visionClient.detect(bucketFile, visionTypes, Meteor.bindEnvironment((error, results) => {
            if (!error) {
              RocketChat.models.Messages.setGoogleVisionData(message._id, this.getAnnotations(visionTypes, results));
            } else {
              console.trace('GoogleVision error: ', error.stack);
            }
          }));
        } else {
          console.error('Google Vision: Usage limit exceeded');
        }
      }
    }
  }

  getAnnotations(visionTypes, visionData) {
    if (visionTypes.length === 1) {
      const _visionData = {};
      _visionData[`${visionTypes[0]}`] = visionData;
      visionData = _visionData;
    }

    const results = {};

    for (const index in visionData) {
      if (visionData.hasOwnProperty(index)) {
        switch (index) {
          case 'faces':
          case 'landmarks':
          case 'labels':
          case 'similar':
          case 'logos':
            results[index] = (results[index] || []).concat(visionData[index] || []);
            break;

          case 'safeSearch':
            results.safeSearch = visionData.safeSearch;
            break;

          case 'properties':
            results.colors = visionData[index].colors;
            break;
        }
      }
    }

    return results;
  }

}

RocketChat.GoogleVision = new GoogleVision();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"Messages.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_google-vision/server/models/Messages.js                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.models.Messages.setGoogleVisionData = function (messageId, visionData) {
  const updateObj = {};

  for (const index in visionData) {
    if (visionData.hasOwnProperty(index)) {
      updateObj[`attachments.0.${index}`] = visionData[index];
    }
  }

  return this.update({
    _id: messageId
  }, {
    $set: updateObj
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:google-vision/server/settings.js");
require("/node_modules/meteor/rocketchat:google-vision/server/googlevision.js");
require("/node_modules/meteor/rocketchat:google-vision/server/models/Messages.js");

/* Exports */
Package._define("rocketchat:google-vision");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_google-vision.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpnb29nbGUtdmlzaW9uL3NlcnZlci9zZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpnb29nbGUtdmlzaW9uL3NlcnZlci9nb29nbGV2aXNpb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z29vZ2xlLXZpc2lvbi9zZXJ2ZXIvbW9kZWxzL01lc3NhZ2VzLmpzIl0sIm5hbWVzIjpbIk1ldGVvciIsInN0YXJ0dXAiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJhZGQiLCJ0eXBlIiwiZ3JvdXAiLCJzZWN0aW9uIiwicHVibGljIiwiZW5hYmxlUXVlcnkiLCJfaWQiLCJ2YWx1ZSIsIm11bHRpbGluZSIsImhpZGRlbiIsImJsb2NrZWQiLCJHb29nbGVWaXNpb24iLCJjb25zdHJ1Y3RvciIsInN0b3JhZ2UiLCJyZXF1aXJlIiwidmlzaW9uIiwic3RvcmFnZUNsaWVudCIsInZpc2lvbkNsaWVudCIsImVuYWJsZWQiLCJnZXQiLCJzZXJ2aWNlQWNjb3VudCIsImtleSIsIkpTT04iLCJwYXJzZSIsImNyZWRlbnRpYWxzIiwiZSIsImNhbGxiYWNrcyIsImJsb2NrVW5zYWZlSW1hZ2VzIiwiYmluZCIsInByaW9yaXR5IiwiTUVESVVNIiwicmVtb3ZlIiwiYW5ub3RhdGUiLCJpbmNDYWxsQ291bnQiLCJjb3VudCIsImN1cnJlbnRNb250aCIsIkRhdGUiLCJnZXRNb250aCIsIm1heE1vbnRobHlDYWxscyIsInNldCIsIm1vZGVscyIsIlNldHRpbmdzIiwidXBkYXRlIiwiJGluYyIsIm1lc3NhZ2UiLCJmaWxlIiwiVXBsb2FkcyIsImZpbmRPbmUiLCJpbmRleE9mIiwic3RvcmUiLCJHb29nbGVTdG9yYWdlIiwiYnVja2V0IiwiYnVja2V0RmlsZSIsInBhdGgiLCJyZXN1bHRzIiwid3JhcEFzeW5jIiwiZGV0ZWN0U2FmZVNlYXJjaCIsImFkdWx0IiwiRmlsZVVwbG9hZCIsImdldFN0b3JlIiwiZGVsZXRlQnlJZCIsInVzZXIiLCJVc2VycyIsImZpbmRPbmVCeUlkIiwidSIsIk5vdGlmaWNhdGlvbnMiLCJub3RpZnlVc2VyIiwiUmFuZG9tIiwiaWQiLCJyaWQiLCJ0cyIsIm1zZyIsIlRBUGkxOG4iLCJfXyIsImxhbmd1YWdlIiwiRXJyb3IiLCJjb25zb2xlIiwiZXJyb3IiLCJ2aXNpb25UeXBlcyIsInB1c2giLCJsZW5ndGgiLCJkZXRlY3QiLCJiaW5kRW52aXJvbm1lbnQiLCJNZXNzYWdlcyIsInNldEdvb2dsZVZpc2lvbkRhdGEiLCJnZXRBbm5vdGF0aW9ucyIsInRyYWNlIiwic3RhY2siLCJ2aXNpb25EYXRhIiwiX3Zpc2lvbkRhdGEiLCJpbmRleCIsImhhc093blByb3BlcnR5IiwiY29uY2F0Iiwic2FmZVNlYXJjaCIsImNvbG9ycyIsIm1lc3NhZ2VJZCIsInVwZGF0ZU9iaiIsIiRzZXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsT0FBUCxDQUFlLFlBQVc7QUFDekJDLGFBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLHFCQUF4QixFQUErQyxLQUEvQyxFQUFzRDtBQUNyREMsVUFBTSxTQUQrQztBQUVyREMsV0FBTyxZQUY4QztBQUdyREMsYUFBUyxlQUg0QztBQUlyREMsWUFBUSxJQUo2QztBQUtyREMsaUJBQWE7QUFBRUMsV0FBSyx5QkFBUDtBQUFrQ0MsYUFBTztBQUF6QztBQUx3QyxHQUF0RDtBQU9BVCxhQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3Qiw2QkFBeEIsRUFBdUQsRUFBdkQsRUFBMkQ7QUFDMURDLFVBQU0sUUFEb0Q7QUFFMURDLFdBQU8sWUFGbUQ7QUFHMURDLGFBQVMsZUFIaUQ7QUFJMURLLGVBQVcsSUFKK0M7QUFLMURILGlCQUFhO0FBQUVDLFdBQUsscUJBQVA7QUFBOEJDLGFBQU87QUFBckM7QUFMNkMsR0FBM0Q7QUFPQVQsYUFBV0MsUUFBWCxDQUFv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QUNEOztBQUVELFNBQU8sS0FBS2hELE1BQUwsQ0FBWTtBQUFFcEMsU0FBS3lGO0FBQVAsR0FBWixFQUFnQztBQUFFRSxVQUFNRDtBQUFSLEdBQWhDLENBQVA7QUFDQSxDQVRELEMiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfZ29vZ2xlLXZpc2lvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnR29vZ2xlVmlzaW9uX0VuYWJsZScsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnRmlsZVVwbG9hZCcsXG5cdFx0c2VjdGlvbjogJ0dvb2dsZSBWaXNpb24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsIHZhbHVlOiAnR29vZ2xlQ2xvdWRTdG9yYWdlJyB9LFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0dvb2dsZVZpc2lvbl9TZXJ2aWNlQWNjb3VudCcsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdGaWxlVXBsb2FkJyxcblx0XHRzZWN0aW9uOiAnR29vZ2xlIFZpc2lvbicsXG5cdFx0bXVsdGlsaW5lOiB0cnVlLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0dvb2dsZVZpc2lvbl9FbmFibGUnLCB2YWx1ZTogdHJ1ZSB9LFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0dvb2dsZVZpc2lvbl9NYXhfTW9udGhseV9DYWxscycsIDAsIHtcblx0XHR0eXBlOiAnaW50Jyxcblx0XHRncm91cDogJ0ZpbGVVcGxvYWQnLFxuXHRcdHNlY3Rpb246ICdHb29nbGUgVmlzaW9uJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdHb29nbGVWaXNpb25fRW5hYmxlJywgdmFsdWU6IHRydWUgfSxcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdHb29nbGVWaXNpb25fQ3VycmVudF9Nb250aCcsIDAsIHtcblx0XHR0eXBlOiAnaW50Jyxcblx0XHRncm91cDogJ0ZpbGVVcGxvYWQnLFxuXHRcdHNlY3Rpb246ICdHb29nbGUgVmlzaW9uJyxcblx0XHRoaWRkZW46IHRydWUsXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnR29vZ2xlVmlzaW9uX0N1cnJlbnRfTW9udGhfQ2FsbHMnLCAwLCB7XG5cdFx0dHlwZTogJ2ludCcsXG5cdFx0Z3JvdXA6ICdGaWxlVXBsb2FkJyxcblx0XHRzZWN0aW9uOiAnR29vZ2xlIFZpc2lvbicsXG5cdFx0YmxvY2tlZDogdHJ1ZSxcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdHb29nbGVWaXNpb25fVHlwZV9Eb2N1bWVudCcsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnRmlsZVVwbG9hZCcsXG5cdFx0c2VjdGlvbjogJ0dvb2dsZSBWaXNpb24nLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0dvb2dsZVZpc2lvbl9FbmFibGUnLCB2YWx1ZTogdHJ1ZSB9LFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0dvb2dsZVZpc2lvbl9UeXBlX0ZhY2VzJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdGaWxlVXBsb2FkJyxcblx0XHRzZWN0aW9uOiAnR29vZ2xlIFZpc2lvbicsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnR29vZ2xlVmlzaW9uX0VuYWJsZScsIHZhbHVlOiB0cnVlIH0sXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnR29vZ2xlVmlzaW9uX1R5cGVfTGFuZG1hcmtzJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdGaWxlVXBsb2FkJyxcblx0XHRzZWN0aW9uOiAnR29vZ2xlIFZpc2lvbicsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnR29vZ2xlVmlzaW9uX0VuYWJsZScsIHZhbHVlOiB0cnVlIH0sXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnR29vZ2xlVmlzaW9uX1R5cGVfTGFiZWxzJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdGaWxlVXBsb2FkJyxcblx0XHRzZWN0aW9uOiAnR29vZ2xlIFZpc2lvbicsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnR29vZ2xlVmlzaW9uX0VuYWJsZScsIHZhbHVlOiB0cnVlIH0sXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnR29vZ2xlVmlzaW9uX1R5cGVfTG9nb3MnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0ZpbGVVcGxvYWQnLFxuXHRcdHNlY3Rpb246ICdHb29nbGUgVmlzaW9uJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdHb29nbGVWaXNpb25fRW5hYmxlJywgdmFsdWU6IHRydWUgfSxcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdHb29nbGVWaXNpb25fVHlwZV9Qcm9wZXJ0aWVzJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdGaWxlVXBsb2FkJyxcblx0XHRzZWN0aW9uOiAnR29vZ2xlIFZpc2lvbicsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnR29vZ2xlVmlzaW9uX0VuYWJsZScsIHZhbHVlOiB0cnVlIH0sXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnR29vZ2xlVmlzaW9uX1R5cGVfU2FmZVNlYXJjaCcsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnRmlsZVVwbG9hZCcsXG5cdFx0c2VjdGlvbjogJ0dvb2dsZSBWaXNpb24nLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0dvb2dsZVZpc2lvbl9FbmFibGUnLCB2YWx1ZTogdHJ1ZSB9LFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0dvb2dsZVZpc2lvbl9CbG9ja19BZHVsdF9JbWFnZXMnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0ZpbGVVcGxvYWQnLFxuXHRcdHNlY3Rpb246ICdHb29nbGUgVmlzaW9uJyxcblx0XHRlbmFibGVRdWVyeTogW3sgX2lkOiAnR29vZ2xlVmlzaW9uX0VuYWJsZScsIHZhbHVlOiB0cnVlIH0sIHsgX2lkOiAnR29vZ2xlVmlzaW9uX1R5cGVfU2FmZVNlYXJjaCcsIHZhbHVlOiB0cnVlIH1dLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0dvb2dsZVZpc2lvbl9UeXBlX1NpbWlsYXInLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0ZpbGVVcGxvYWQnLFxuXHRcdHNlY3Rpb246ICdHb29nbGUgVmlzaW9uJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdHb29nbGVWaXNpb25fRW5hYmxlJywgdmFsdWU6IHRydWUgfSxcblx0fSk7XG59KTtcbiIsImNsYXNzIEdvb2dsZVZpc2lvbiB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMuc3RvcmFnZSA9IHJlcXVpcmUoJ0Bnb29nbGUtY2xvdWQvc3RvcmFnZScpO1xuXHRcdHRoaXMudmlzaW9uID0gcmVxdWlyZSgnQGdvb2dsZS1jbG91ZC92aXNpb24nKTtcblx0XHR0aGlzLnN0b3JhZ2VDbGllbnQgPSB7fTtcblx0XHR0aGlzLnZpc2lvbkNsaWVudCA9IHt9O1xuXHRcdHRoaXMuZW5hYmxlZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdHb29nbGVWaXNpb25fRW5hYmxlJyk7XG5cdFx0dGhpcy5zZXJ2aWNlQWNjb3VudCA9IHt9O1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdHb29nbGVWaXNpb25fRW5hYmxlJywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdHRoaXMuZW5hYmxlZCA9IHZhbHVlO1xuXHRcdH0pO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdHb29nbGVWaXNpb25fU2VydmljZUFjY291bnQnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dGhpcy5zZXJ2aWNlQWNjb3VudCA9IEpTT04ucGFyc2UodmFsdWUpO1xuXHRcdFx0XHR0aGlzLnN0b3JhZ2VDbGllbnQgPSB0aGlzLnN0b3JhZ2UoeyBjcmVkZW50aWFsczogdGhpcy5zZXJ2aWNlQWNjb3VudCB9KTtcblx0XHRcdFx0dGhpcy52aXNpb25DbGllbnQgPSB0aGlzLnZpc2lvbih7IGNyZWRlbnRpYWxzOiB0aGlzLnNlcnZpY2VBY2NvdW50IH0pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHR0aGlzLnNlcnZpY2VBY2NvdW50ID0ge307XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0dvb2dsZVZpc2lvbl9CbG9ja19BZHVsdF9JbWFnZXMnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYmVmb3JlU2F2ZU1lc3NhZ2UnLCB0aGlzLmJsb2NrVW5zYWZlSW1hZ2VzLmJpbmQodGhpcyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5Lk1FRElVTSwgJ2dvb2dsZXZpc2lvbi1ibG9ja3Vuc2FmZScpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucmVtb3ZlKCdiZWZvcmVTYXZlTWVzc2FnZScsICdnb29nbGV2aXNpb24tYmxvY2t1bnNhZmUnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyRmlsZVVwbG9hZCcsIHRoaXMuYW5ub3RhdGUuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRpbmNDYWxsQ291bnQoY291bnQpIHtcblx0XHRjb25zdCBjdXJyZW50TW9udGggPSBuZXcgRGF0ZSgpLmdldE1vbnRoKCk7XG5cdFx0Y29uc3QgbWF4TW9udGhseUNhbGxzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0dvb2dsZVZpc2lvbl9NYXhfTW9udGhseV9DYWxscycpIHx8IDA7XG5cdFx0aWYgKG1heE1vbnRobHlDYWxscyA+IDApIHtcblx0XHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnR29vZ2xlVmlzaW9uX0N1cnJlbnRfTW9udGgnKSAhPT0gY3VycmVudE1vbnRoKSB7XG5cdFx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3Muc2V0KCdHb29nbGVWaXNpb25fQ3VycmVudF9Nb250aCcsIGN1cnJlbnRNb250aCk7XG5cdFx0XHRcdGlmIChjb3VudCA+IG1heE1vbnRobHlDYWxscykge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmIChjb3VudCArIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnR29vZ2xlVmlzaW9uX0N1cnJlbnRfTW9udGhfQ2FsbHMnKSB8fCAwKSA+IG1heE1vbnRobHlDYWxscykge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLnVwZGF0ZSh7IF9pZDogJ0dvb2dsZVZpc2lvbl9DdXJyZW50X01vbnRoX0NhbGxzJyB9LCB7ICRpbmM6IHsgdmFsdWU6IGNvdW50IH0gfSk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRibG9ja1Vuc2FmZUltYWdlcyhtZXNzYWdlKSB7XG5cdFx0aWYgKHRoaXMuZW5hYmxlZCAmJiB0aGlzLnNlcnZpY2VBY2NvdW50ICYmIG1lc3NhZ2UgJiYgbWVzc2FnZS5maWxlICYmIG1lc3NhZ2UuZmlsZS5faWQpIHtcblx0XHRcdGNvbnN0IGZpbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLmZpbmRPbmUoeyBfaWQ6IG1lc3NhZ2UuZmlsZS5faWQgfSk7XG5cdFx0XHRpZiAoZmlsZSAmJiBmaWxlLnR5cGUgJiYgZmlsZS50eXBlLmluZGV4T2YoJ2ltYWdlJykgIT09IC0xICYmIGZpbGUuc3RvcmUgPT09ICdHb29nbGVDbG91ZFN0b3JhZ2U6VXBsb2FkcycgJiYgZmlsZS5Hb29nbGVTdG9yYWdlKSB7XG5cdFx0XHRcdGlmICh0aGlzLmluY0NhbGxDb3VudCgxKSkge1xuXHRcdFx0XHRcdGNvbnN0IGJ1Y2tldCA9IHRoaXMuc3RvcmFnZUNsaWVudC5idWNrZXQoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9CdWNrZXQnKSk7XG5cdFx0XHRcdFx0Y29uc3QgYnVja2V0RmlsZSA9IGJ1Y2tldC5maWxlKGZpbGUuR29vZ2xlU3RvcmFnZS5wYXRoKTtcblx0XHRcdFx0XHRjb25zdCByZXN1bHRzID0gTWV0ZW9yLndyYXBBc3luYyh0aGlzLnZpc2lvbkNsaWVudC5kZXRlY3RTYWZlU2VhcmNoLCB0aGlzLnZpc2lvbkNsaWVudCkoYnVja2V0RmlsZSk7XG5cdFx0XHRcdFx0aWYgKHJlc3VsdHMgJiYgcmVzdWx0cy5hZHVsdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0RmlsZVVwbG9hZC5nZXRTdG9yZSgnVXBsb2FkcycpLmRlbGV0ZUJ5SWQoZmlsZS5faWQpO1xuXHRcdFx0XHRcdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKG1lc3NhZ2UudSAmJiBtZXNzYWdlLnUuX2lkKTtcblx0XHRcdFx0XHRcdGlmICh1c2VyKSB7XG5cdFx0XHRcdFx0XHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKHVzZXIuX2lkLCAnbWVzc2FnZScsIHtcblx0XHRcdFx0XHRcdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0XHRcdFx0XHRcdHJpZDogbWVzc2FnZS5yaWQsXG5cdFx0XHRcdFx0XHRcdFx0dHM6IG5ldyBEYXRlLFxuXHRcdFx0XHRcdFx0XHRcdG1zZzogVEFQaTE4bi5fXygnQWR1bHRfaW1hZ2VzX2FyZV9ub3RfYWxsb3dlZCcsIHt9LCB1c2VyLmxhbmd1YWdlKSxcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdHb29nbGVWaXNpb25FcnJvcjogSW1hZ2UgYmxvY2tlZCcpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKCdHb29nbGUgVmlzaW9uOiBVc2FnZSBsaW1pdCBleGNlZWRlZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBtZXNzYWdlO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGFubm90YXRlKHsgbWVzc2FnZSB9KSB7XG5cdFx0Y29uc3QgdmlzaW9uVHlwZXMgPSBbXTtcblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0dvb2dsZVZpc2lvbl9UeXBlX0RvY3VtZW50JykpIHtcblx0XHRcdHZpc2lvblR5cGVzLnB1c2goJ2RvY3VtZW50Jyk7XG5cdFx0fVxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnR29vZ2xlVmlzaW9uX1R5cGVfRmFjZXMnKSkge1xuXHRcdFx0dmlzaW9uVHlwZXMucHVzaCgnZmFjZXMnKTtcblx0XHR9XG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdHb29nbGVWaXNpb25fVHlwZV9MYW5kbWFya3MnKSkge1xuXHRcdFx0dmlzaW9uVHlwZXMucHVzaCgnbGFuZG1hcmtzJyk7XG5cdFx0fVxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnR29vZ2xlVmlzaW9uX1R5cGVfTGFiZWxzJykpIHtcblx0XHRcdHZpc2lvblR5cGVzLnB1c2goJ2xhYmVscycpO1xuXHRcdH1cblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0dvb2dsZVZpc2lvbl9UeXBlX0xvZ29zJykpIHtcblx0XHRcdHZpc2lvblR5cGVzLnB1c2goJ2xvZ29zJyk7XG5cdFx0fVxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnR29vZ2xlVmlzaW9uX1R5cGVfUHJvcGVydGllcycpKSB7XG5cdFx0XHR2aXNpb25UeXBlcy5wdXNoKCdwcm9wZXJ0aWVzJyk7XG5cdFx0fVxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnR29vZ2xlVmlzaW9uX1R5cGVfU2FmZVNlYXJjaCcpKSB7XG5cdFx0XHR2aXNpb25UeXBlcy5wdXNoKCdzYWZlU2VhcmNoJyk7XG5cdFx0fVxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnR29vZ2xlVmlzaW9uX1R5cGVfU2ltaWxhcicpKSB7XG5cdFx0XHR2aXNpb25UeXBlcy5wdXNoKCdzaW1pbGFyJyk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmVuYWJsZWQgJiYgdGhpcy5zZXJ2aWNlQWNjb3VudCAmJiB2aXNpb25UeXBlcy5sZW5ndGggPiAwICYmIG1lc3NhZ2UuZmlsZSAmJiBtZXNzYWdlLmZpbGUuX2lkKSB7XG5cdFx0XHRjb25zdCBmaWxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kT25lKHsgX2lkOiBtZXNzYWdlLmZpbGUuX2lkIH0pO1xuXHRcdFx0aWYgKGZpbGUgJiYgZmlsZS50eXBlICYmIGZpbGUudHlwZS5pbmRleE9mKCdpbWFnZScpICE9PSAtMSAmJiBmaWxlLnN0b3JlID09PSAnR29vZ2xlQ2xvdWRTdG9yYWdlOlVwbG9hZHMnICYmIGZpbGUuR29vZ2xlU3RvcmFnZSkge1xuXHRcdFx0XHRpZiAodGhpcy5pbmNDYWxsQ291bnQodmlzaW9uVHlwZXMubGVuZ3RoKSkge1xuXHRcdFx0XHRcdGNvbnN0IGJ1Y2tldCA9IHRoaXMuc3RvcmFnZUNsaWVudC5idWNrZXQoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9CdWNrZXQnKSk7XG5cdFx0XHRcdFx0Y29uc3QgYnVja2V0RmlsZSA9IGJ1Y2tldC5maWxlKGZpbGUuR29vZ2xlU3RvcmFnZS5wYXRoKTtcblx0XHRcdFx0XHR0aGlzLnZpc2lvbkNsaWVudC5kZXRlY3QoYnVja2V0RmlsZSwgdmlzaW9uVHlwZXMsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVycm9yLCByZXN1bHRzKSA9PiB7XG5cdFx0XHRcdFx0XHRpZiAoIWVycm9yKSB7XG5cdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLnNldEdvb2dsZVZpc2lvbkRhdGEobWVzc2FnZS5faWQsIHRoaXMuZ2V0QW5ub3RhdGlvbnModmlzaW9uVHlwZXMsIHJlc3VsdHMpKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUudHJhY2UoJ0dvb2dsZVZpc2lvbiBlcnJvcjogJywgZXJyb3Iuc3RhY2spO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKCdHb29nbGUgVmlzaW9uOiBVc2FnZSBsaW1pdCBleGNlZWRlZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Z2V0QW5ub3RhdGlvbnModmlzaW9uVHlwZXMsIHZpc2lvbkRhdGEpIHtcblx0XHRpZiAodmlzaW9uVHlwZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRjb25zdCBfdmlzaW9uRGF0YSA9IHt9O1xuXHRcdFx0X3Zpc2lvbkRhdGFbYCR7IHZpc2lvblR5cGVzWzBdIH1gXSA9IHZpc2lvbkRhdGE7XG5cdFx0XHR2aXNpb25EYXRhID0gX3Zpc2lvbkRhdGE7XG5cdFx0fVxuXHRcdGNvbnN0IHJlc3VsdHMgPSB7fTtcblx0XHRmb3IgKGNvbnN0IGluZGV4IGluIHZpc2lvbkRhdGEpIHtcblx0XHRcdGlmICh2aXNpb25EYXRhLmhhc093blByb3BlcnR5KGluZGV4KSkge1xuXHRcdFx0XHRzd2l0Y2ggKGluZGV4KSB7XG5cdFx0XHRcdFx0Y2FzZSAnZmFjZXMnOlxuXHRcdFx0XHRcdGNhc2UgJ2xhbmRtYXJrcyc6XG5cdFx0XHRcdFx0Y2FzZSAnbGFiZWxzJzpcblx0XHRcdFx0XHRjYXNlICdzaW1pbGFyJzpcblx0XHRcdFx0XHRjYXNlICdsb2dvcyc6XG5cdFx0XHRcdFx0XHRyZXN1bHRzW2luZGV4XSA9IChyZXN1bHRzW2luZGV4XSB8fCBbXSkuY29uY2F0KHZpc2lvbkRhdGFbaW5kZXhdIHx8IFtdKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ3NhZmVTZWFyY2gnOlxuXHRcdFx0XHRcdFx0cmVzdWx0cy5zYWZlU2VhcmNoID0gdmlzaW9uRGF0YS5zYWZlU2VhcmNoO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAncHJvcGVydGllcyc6XG5cdFx0XHRcdFx0XHRyZXN1bHRzLmNvbG9ycyA9IHZpc2lvbkRhdGFbaW5kZXhdLmNvbG9ycztcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9XG59XG5cblJvY2tldENoYXQuR29vZ2xlVmlzaW9uID0gbmV3IEdvb2dsZVZpc2lvbjtcbiIsIlJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLnNldEdvb2dsZVZpc2lvbkRhdGEgPSBmdW5jdGlvbihtZXNzYWdlSWQsIHZpc2lvbkRhdGEpIHtcblx0Y29uc3QgdXBkYXRlT2JqID0ge307XG5cdGZvciAoY29uc3QgaW5kZXggaW4gdmlzaW9uRGF0YSkge1xuXHRcdGlmICh2aXNpb25EYXRhLmhhc093blByb3BlcnR5KGluZGV4KSkge1xuXHRcdFx0dXBkYXRlT2JqW2BhdHRhY2htZW50cy4wLiR7IGluZGV4IH1gXSA9IHZpc2lvbkRhdGFbaW5kZXhdO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0aGlzLnVwZGF0ZSh7IF9pZDogbWVzc2FnZUlkIH0sIHsgJHNldDogdXBkYXRlT2JqIH0pO1xufTtcbiJdfQ==
