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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:tutum":{"startup.js":function(require){

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                      //
// packages/rocketchat_tutum/startup.js                                                                 //
//                                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                        //
/* Examples

DOCKERCLOUD_REDIS_HOST=redis://:password@host:6379
DOCKERCLOUD_CLIENT_NAME=mywebsite
DOCKERCLOUD_CLIENT_HOST=mywebsite.dotcloud.com
*/
if (process.env.DOCKERCLOUD_REDIS_HOST != null) {
  const redis = require('redis');

  const client = redis.createClient(process.env.DOCKERCLOUD_REDIS_HOST);
  client.on('error', err => console.log('Redis error ->', err));
  client.del(`frontend:${process.env.DOCKERCLOUD_CLIENT_HOST}`);
  client.rpush(`frontend:${process.env.DOCKERCLOUD_CLIENT_HOST}`, process.env.DOCKERCLOUD_CLIENT_NAME);
  const port = process.env.PORT || 3000;
  client.rpush(`frontend:${process.env.DOCKERCLOUD_CLIENT_HOST}`, `http://${process.env.DOCKERCLOUD_IP_ADDRESS.split('/')[0]}:${port}`); // removes the redis entry in 90 seconds on a SIGTERM

  process.on('SIGTERM', () => client.expire(`frontend:${process.env.DOCKERCLOUD_CLIENT_HOST}`, 90));
  process.on('SIGINT', () => client.expire(`frontend:${process.env.DOCKERCLOUD_CLIENT_HOST}`, 90));
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:tutum/startup.js");

/* Exports */
Package._define("rocketchat:tutum");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_tutum.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp0dXR1bS9zdGFydHVwLmpzIl0sIm5hbWVzIjpbInByb2Nlc3MiLCJlbnYiLCJET0NLRVJDTE9VRF9SRURJU19IT1NUIiwicmVkaXMiLCJyZXF1aXJlIiwiY2xpZW50IiwiY3JlYXRlQ2xpZW50Iiwib24iLCJlcnIiLCJjb25zb2xlIiwibG9nIiwiZGVsIiwiRE9DS0VSQ0xPVURfQ0xJRU5UX0hPU1QiLCJycHVzaCIsIkRPQ0tFUkNMT1VEX0NMSUVOVF9OQU1FIiwicG9ydCIsIlBPUlQiLCJET0NLRVJDTE9VRF9JUF9BRERSRVNTIiwic3BsaXQiLCJleHBpcmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7O0FBT0EsSUFBSUEsUUFBUUMsR0FBUixDQUFZQyxzQkFBWixJQUFzQyxJQUExQyxFQUFnRDtBQUMvQyxRQUFNQyxRQUFRQyxRQUFRLE9BQVIsQ0FBZDs7QUFFQSxRQUFNQyxTQUFTRixNQUFNRyxZQUFOLENBQW1CTixRQUFRQyxHQUFSLENBQVlDLHNCQUEvQixDQUFmO0FBRUFHLFNBQU9FLEVBQVAsQ0FBVSxPQUFWLEVBQW9CQyxHQUFELElBQVNDLFFBQVFDLEdBQVIsQ0FBWSxnQkFBWixFQUE4QkYsR0FBOUIsQ0FBNUI7QUFFQUgsU0FBT00sR0FBUCxDQUFZLFlBQVlYLFFBQVFDLEdBQVIsQ0FBWVcsdUJBQXlCLEVBQTdEO0FBQ0FQLFNBQU9RLEtBQVAsQ0FBYyxZQUFZYixRQUFRQyxHQUFSLENBQVlXLHVCQUF5QixFQUEvRCxFQUFrRVosUUFBUUMsR0FBUixDQUFZYSx1QkFBOUU7QUFFQSxRQUFNQyxPQUFPZixRQUFRQyxHQUFSLENBQVllLElBQVosSUFBb0IsSUFBakM7QUFDQVgsU0FBT1EsS0FBUCxDQUFjLFlBQVliLFFBQVFDLEdBQVIsQ0FBWVcsdUJBQXlCLEVBQS9ELEVBQW1FLFVBQVVaLFFBQVFDLEdBQVIsQ0FBWWdCLHNCQUFaLENBQW1DQyxLQUFuQyxDQUF5QyxHQUF6QyxFQUE4QyxDQUE5QyxDQUFrRCxJQUFJSCxJQUFNLEVBQXpJLEVBWCtDLENBYS9DOztBQUNBZixVQUFRTyxFQUFSLENBQVcsU0FBWCxFQUFzQixNQUFNRixPQUFPYyxNQUFQLENBQWUsWUFBWW5CLFFBQVFDLEdBQVIsQ0FBWVcsdUJBQXlCLEVBQWhFLEVBQW1FLEVBQW5FLENBQTVCO0FBRUFaLFVBQVFPLEVBQVIsQ0FBVyxRQUFYLEVBQXFCLE1BQU1GLE9BQU9jLE1BQVAsQ0FBZSxZQUFZbkIsUUFBUUMsR0FBUixDQUFZVyx1QkFBeUIsRUFBaEUsRUFBbUUsRUFBbkUsQ0FBM0I7QUFDQSxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3R1dHVtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogRXhhbXBsZXNcblxuRE9DS0VSQ0xPVURfUkVESVNfSE9TVD1yZWRpczovLzpwYXNzd29yZEBob3N0OjYzNzlcbkRPQ0tFUkNMT1VEX0NMSUVOVF9OQU1FPW15d2Vic2l0ZVxuRE9DS0VSQ0xPVURfQ0xJRU5UX0hPU1Q9bXl3ZWJzaXRlLmRvdGNsb3VkLmNvbVxuKi9cblxuaWYgKHByb2Nlc3MuZW52LkRPQ0tFUkNMT1VEX1JFRElTX0hPU1QgIT0gbnVsbCkge1xuXHRjb25zdCByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XG5cblx0Y29uc3QgY2xpZW50ID0gcmVkaXMuY3JlYXRlQ2xpZW50KHByb2Nlc3MuZW52LkRPQ0tFUkNMT1VEX1JFRElTX0hPU1QpO1xuXG5cdGNsaWVudC5vbignZXJyb3InLCAoZXJyKSA9PiBjb25zb2xlLmxvZygnUmVkaXMgZXJyb3IgLT4nLCBlcnIpKTtcblxuXHRjbGllbnQuZGVsKGBmcm9udGVuZDokeyBwcm9jZXNzLmVudi5ET0NLRVJDTE9VRF9DTElFTlRfSE9TVCB9YCk7XG5cdGNsaWVudC5ycHVzaChgZnJvbnRlbmQ6JHsgcHJvY2Vzcy5lbnYuRE9DS0VSQ0xPVURfQ0xJRU5UX0hPU1QgfWAsIHByb2Nlc3MuZW52LkRPQ0tFUkNMT1VEX0NMSUVOVF9OQU1FKTtcblxuXHRjb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCAzMDAwO1xuXHRjbGllbnQucnB1c2goYGZyb250ZW5kOiR7IHByb2Nlc3MuZW52LkRPQ0tFUkNMT1VEX0NMSUVOVF9IT1NUIH1gLCBgaHR0cDovLyR7IHByb2Nlc3MuZW52LkRPQ0tFUkNMT1VEX0lQX0FERFJFU1Muc3BsaXQoJy8nKVswXSB9OiR7IHBvcnQgfWApO1xuXG5cdC8vIHJlbW92ZXMgdGhlIHJlZGlzIGVudHJ5IGluIDkwIHNlY29uZHMgb24gYSBTSUdURVJNXG5cdHByb2Nlc3Mub24oJ1NJR1RFUk0nLCAoKSA9PiBjbGllbnQuZXhwaXJlKGBmcm9udGVuZDokeyBwcm9jZXNzLmVudi5ET0NLRVJDTE9VRF9DTElFTlRfSE9TVCB9YCwgOTApKTtcblxuXHRwcm9jZXNzLm9uKCdTSUdJTlQnLCAoKSA9PiBjbGllbnQuZXhwaXJlKGBmcm9udGVuZDokeyBwcm9jZXNzLmVudi5ET0NLRVJDTE9VRF9DTElFTlRfSE9TVCB9YCwgOTApKTtcbn1cbiJdfQ==
