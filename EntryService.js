'use strict';
var AWS         = require("aws-sdk");

var EntryService = function() {
    this.dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
}

EntryService.prototype.create = function (userId, location, cb) {
    var params = {
        TableName: "facebookLocations",
        Item: {
            "userId": userId,
            "locationMap": location
        }
    };
    this.dynamodb.put(params, cb);
};

EntryService.prototype.read = function (userId, cb) {
    var params = {
        TableName: "facebookLocations",
        Key: {
            "userId": userId
        }
    };
    this.dynamodb.get(params, cb);
};

module.exports = EntryService;