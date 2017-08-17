'use strict';
var $q         = require('q');
var Alexa      = require('alexa-sdk');
var FB         = require('facebook-node');
var dynamoDB   = require('./EntryService.js');

// Messages used for Alexa to tell the user
var repeatWelcomeMessage = "You can tell me to 'retrieve my feed', 'read my feed' or 'post a message'. What would you like to do?";

var welcomeMessage = "Welcome to the Unofficial Facebook check-in skill, " + repeatWelcomeMessage;

var stopSkillMessage = "goodbye, see you next time!";

var helpText = "You can say things like 'retrieve my feed', 'read my feed' or 'post a message'. What would you like to do?";

var tryLaterText = "Please try again later."

var noAccessToken = "There was a problem connecting to facebook. Please check if you are connected to the internet and if you have given this skill permission to read your feed.";// + tryLaterText;

var states = {
    COMMANDMODE: '_COMMANDMODE', // User is posting or reading feed
    CHATMODE: '_CHATMODE'  // Unimplemented: User is chatting with someone through FB messenger
};


var newSessionHandlers = {
    'NewSession': function() {
        console.log('NewSession');
        this.handler.state = states.COMMANDMODE;
        var alexa = this;
        var accessToken = alexa.event.session.user.accessToken;
        FB.setAccessToken(accessToken);
        alexa.emit(":ask", welcomeMessage);
    }
};


var commandHandlers = Alexa.CreateStateHandler(states.COMMANDMODE, {
    'NewSession': function() {
        this.emit(":ask",welcomeMessage);
    },

    'PostMyLocation' : function() {
        var alexa = this;
        var accessToken = alexa.event.session.user.accessToken;
        var service = new dynamoDB();
        var number = alexa.event.request.intent.slots.Number.value;
        if (number > 5) {
            alexa.emit(":ask","Please say a number between 1-5");
            return;
        }
        FB.setAccessToken(accessToken);
        
        service.read(alexa.event.session.user.userId, function(err, data) {
            if(err) {
                alexa.emit(":tell", "Error getting data from location");
                return;
            } else {
                if(data.length == 0) {
                    alexa.emit(":tell","fetch some location first");
                } else {
                    var location = data.Item.locationMap.data[number-1];
                    var msg = "Chilling at " + location.name;
                    FB.api("/me/feed", "POST",
                    {
                        "message": msg,
                        "place": location.id
                    }, function(res) {
                        if(!res && res.error) {
                            console.log(res.error);
                            alexa.emit(":tell","There was a problem in posting");
                        } else {
                            alexa.emit(':ask', "I posted ' "+ msg +" ' successfully. What would you like to do next?",helpText);
                        }
                    });
                }
            }
        });
    },
     
    'ShareMyLocation' : function() {
        var alexa = this;
        var accessToken = alexa.event.session.user.accessToken;
        var service = new dynamoDB();
        var origin;
        if (alexa.event.context.Geolocation == undefined) {
            alexa.emit(':tell', 'No geolocation context available! Is your GPS on?');
            return;
        } else {
            var coordinate = alexa.event.context.Geolocation.coordinate;
            origin = coordinate.latitudeInDegrees + ',' + coordinate.longitudeInDegrees;
        }
        FB.setAccessToken(accessToken);
        
        FB.api("/search", "GET", {
            "type":'place',
            "center": origin,
            "distance":'1000'
        }, function (res) {
            if(!res && res.err) {
                console.log(res.err);
                alexa.emit(":tell","Problem getting places nearby");
                return;
            } else {
                console.log(res);
                var msg = "Reply by number. The five options are";
                for(var i=0; i<5; i++) {
                    var count = i+1;
                    msg+= " Number " +count + ": " + res.data[i].name + ".";
                }
                msg += " Say Alexa I am at number followed by the number ";
                service.create(alexa.event.session.user.userId, res, function(err, data){
                    if(err){
                        alexa.emit(":tell","Error accessing database");
                    } else {
                        alexa.emit(":ask",msg,msg);
                    }
                });
            }
        });
    },

    'AMAZON.CancelIntent': function () {
        // Triggered wheen user asks Alexa top cancel interaction
        this.emit(':tell', stopSkillMessage);
    },

    'AMAZON.StopIntent': function () {
        // Triggered when user asks Alexa to stop interaction
        this.emit(':tell', stopSkillMessage);
    },

    // Triggered wheen user asks Alexa for help
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', helpText, helpText);
    },

    // Triggered when no intent matches Alexa request
    'Unhandled': function () {
        this.emit(':ask', helpText, helpText);
    }
});


// Add handlers.
exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = 'amzn1.ask.skill.f878a0a7-66b7-4136-8371-13a802dcf7e5';  
    alexa.registerHandlers(newSessionHandlers, commandHandlers);
    alexa.execute();
};
