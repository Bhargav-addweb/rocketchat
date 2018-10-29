(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var check = Package.check.check;
var Match = Package.check.Match;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:slashcommands-help":{"server.js":function(){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/rocketchat_slashcommands-help/server.js                            //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
/*
* Help is a named function that will replace /join commands
* @param {Object} message - The message object
*/
RocketChat.slashCommands.add('help', function Help(command, params, item) {
  const user = Meteor.users.findOne(Meteor.userId());
  const keys = [{
    Open_channel_user_search: 'Command (or Ctrl) + p OR Command (or Ctrl) + k'
  }, {
    Edit_previous_message: 'Up Arrow'
  }, {
    Move_beginning_message: 'Command (or Alt) + Left Arrow'
  }, {
    Move_beginning_message: 'Command (or Alt) + Up Arrow'
  }, {
    Move_end_message: 'Command (or Alt) + Right Arrow'
  }, {
    Move_end_message: 'Command (or Alt) + Down Arrow'
  }, {
    New_line_message_compose_input: 'Shift + Enter'
  }];
  keys.forEach(key => {
    RocketChat.Notifications.notifyUser(Meteor.userId(), 'message', {
      _id: Random.id(),
      rid: item.rid,
      ts: new Date(),
      msg: TAPi18n.__(Object.keys(key)[0], {
        postProcess: 'sprintf',
        sprintf: [key[Object.keys(key)[0]]]
      }, user.language)
    });
  });
}, {
  description: 'Show_the_keyboard_shortcut_list'
});
/////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:slashcommands-help/server.js");

/* Exports */
Package._define("rocketchat:slashcommands-help");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_slashcommands-help.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFzaGNvbW1hbmRzLWhlbHAvc2VydmVyLmpzIl0sIm5hbWVzIjpbIlJvY2tldENoYXQiLCJzbGFzaENvbW1hbmRzIiwiYWRkIiwiSGVscCIsImNvbW1hbmQiLCJwYXJhbXMiLCJpdGVtIiwidXNlciIsIk1ldGVvciIsInVzZXJzIiwiZmluZE9uZSIsInVzZXJJZCIsImtleXMiLCJPcGVuX2NoYW5uZWxfdXNlcl9zZWFyY2giLCJFZGl0X3ByZXZpb3VzX21lc3NhZ2UiLCJNb3ZlX2JlZ2lubmluZ19tZXNzYWdlIiwiTW92ZV9lbmRfbWVzc2FnZSIsIk5ld19saW5lX21lc3NhZ2VfY29tcG9zZV9pbnB1dCIsImZvckVhY2giLCJrZXkiLCJOb3RpZmljYXRpb25zIiwibm90aWZ5VXNlciIsIl9pZCIsIlJhbmRvbSIsImlkIiwicmlkIiwidHMiLCJEYXRlIiwibXNnIiwiVEFQaTE4biIsIl9fIiwiT2JqZWN0IiwicG9zdFByb2Nlc3MiLCJzcHJpbnRmIiwibGFuZ3VhZ2UiLCJkZXNjcmlwdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0E7Ozs7QUFNQUEsV0FBV0MsYUFBWCxDQUF5QkMsR0FBekIsQ0FBNkIsTUFBN0IsRUFBcUMsU0FBU0MsSUFBVCxDQUFjQyxPQUFkLEVBQXVCQyxNQUF2QixFQUErQkMsSUFBL0IsRUFBcUM7QUFDekUsUUFBTUMsT0FBT0MsT0FBT0MsS0FBUCxDQUFhQyxPQUFiLENBQXFCRixPQUFPRyxNQUFQLEVBQXJCLENBQWI7QUFDQSxRQUFNQyxPQUFPLENBQUM7QUFDYkMsOEJBQTBCO0FBRGIsR0FBRCxFQUdiO0FBQ0NDLDJCQUF1QjtBQUR4QixHQUhhLEVBTWI7QUFDQ0MsNEJBQXdCO0FBRHpCLEdBTmEsRUFTYjtBQUNDQSw0QkFBd0I7QUFEekIsR0FUYSxFQVliO0FBQ0NDLHNCQUFrQjtBQURuQixHQVphLEVBZWI7QUFDQ0Esc0JBQWtCO0FBRG5CLEdBZmEsRUFrQmI7QUFDQ0Msb0NBQWdDO0FBRGpDLEdBbEJhLENBQWI7QUFzQkFMLE9BQUtNLE9BQUwsQ0FBY0MsR0FBRCxJQUFTO0FBQ3JCbkIsZUFBV29CLGFBQVgsQ0FBeUJDLFVBQXpCLENBQW9DYixPQUFPRyxNQUFQLEVBQXBDLEVBQXFELFNBQXJELEVBQWdFO0FBQy9EVyxXQUFLQyxPQUFPQyxFQUFQLEVBRDBEO0FBRS9EQyxXQUFLbkIsS0FBS21CLEdBRnFEO0FBRy9EQyxVQUFJLElBQUlDLElBQUosRUFIMkQ7QUFJL0RDLFdBQUtDLFFBQVFDLEVBQVIsQ0FBV0MsT0FBT25CLElBQVAsQ0FBWU8sR0FBWixFQUFpQixDQUFqQixDQUFYLEVBQWdDO0FBQ3BDYSxxQkFBYSxTQUR1QjtBQUVwQ0MsaUJBQVMsQ0FBQ2QsSUFBSVksT0FBT25CLElBQVAsQ0FBWU8sR0FBWixFQUFpQixDQUFqQixDQUFKLENBQUQ7QUFGMkIsT0FBaEMsRUFHRlosS0FBSzJCLFFBSEg7QUFKMEQsS0FBaEU7QUFTQSxHQVZEO0FBWUEsQ0FwQ0QsRUFvQ0c7QUFDRkMsZUFBYTtBQURYLENBcENILEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfc2xhc2hjb21tYW5kcy1oZWxwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKlxuKiBIZWxwIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHJlcGxhY2UgL2pvaW4gY29tbWFuZHNcbiogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgLSBUaGUgbWVzc2FnZSBvYmplY3RcbiovXG5cblxuUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmFkZCgnaGVscCcsIGZ1bmN0aW9uIEhlbHAoY29tbWFuZCwgcGFyYW1zLCBpdGVtKSB7XG5cdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZShNZXRlb3IudXNlcklkKCkpO1xuXHRjb25zdCBrZXlzID0gW3tcblx0XHRPcGVuX2NoYW5uZWxfdXNlcl9zZWFyY2g6ICdDb21tYW5kIChvciBDdHJsKSArIHAgT1IgQ29tbWFuZCAob3IgQ3RybCkgKyBrJyxcblx0fSxcblx0e1xuXHRcdEVkaXRfcHJldmlvdXNfbWVzc2FnZTogJ1VwIEFycm93Jyxcblx0fSxcblx0e1xuXHRcdE1vdmVfYmVnaW5uaW5nX21lc3NhZ2U6ICdDb21tYW5kIChvciBBbHQpICsgTGVmdCBBcnJvdycsXG5cdH0sXG5cdHtcblx0XHRNb3ZlX2JlZ2lubmluZ19tZXNzYWdlOiAnQ29tbWFuZCAob3IgQWx0KSArIFVwIEFycm93Jyxcblx0fSxcblx0e1xuXHRcdE1vdmVfZW5kX21lc3NhZ2U6ICdDb21tYW5kIChvciBBbHQpICsgUmlnaHQgQXJyb3cnLFxuXHR9LFxuXHR7XG5cdFx0TW92ZV9lbmRfbWVzc2FnZTogJ0NvbW1hbmQgKG9yIEFsdCkgKyBEb3duIEFycm93Jyxcblx0fSxcblx0e1xuXHRcdE5ld19saW5lX21lc3NhZ2VfY29tcG9zZV9pbnB1dDogJ1NoaWZ0ICsgRW50ZXInLFxuXHR9LFxuXHRdO1xuXHRrZXlzLmZvckVhY2goKGtleSkgPT4ge1xuXHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKE1ldGVvci51c2VySWQoKSwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkOiBpdGVtLnJpZCxcblx0XHRcdHRzOiBuZXcgRGF0ZSxcblx0XHRcdG1zZzogVEFQaTE4bi5fXyhPYmplY3Qua2V5cyhrZXkpWzBdLCB7XG5cdFx0XHRcdHBvc3RQcm9jZXNzOiAnc3ByaW50ZicsXG5cdFx0XHRcdHNwcmludGY6IFtrZXlbT2JqZWN0LmtleXMoa2V5KVswXV1dLFxuXHRcdFx0fSwgdXNlci5sYW5ndWFnZSksXG5cdFx0fSk7XG5cdH0pO1xuXG59LCB7XG5cdGRlc2NyaXB0aW9uOiAnU2hvd190aGVfa2V5Ym9hcmRfc2hvcnRjdXRfbGlzdCcsXG59KTtcbiJdfQ==
