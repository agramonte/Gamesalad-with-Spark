// Version 1.1
// Change these parameters for your game
var leaderboardName = "";
var leaderboardEvent = "";
var previewMode = false;
// Amplitude.
var amplitudeKey = "";

// Base url:
// https://preview.gamesparks.net/callback/<apiKey>/<callbacktype>/<callbacksecret>
// 
// Register example:
// ?requestType=register&userName=adrian44&userPassword=password&displayName=twoluckyplay33er
// Returns: True or False
//
// Login example:
// ?requestType=login&userName=adrian44&userPassword=password
// Returns: True or False
//
// Record score example:
// ?requestType=putScore&userName=adrian44&userPassword=password&score=200
// Returns: Leaderboard Table
//
// Get Leaderboard:
// ?requestType=getLeaderboard
// Returns: Leaderboard Table
// 
// Send Event:
// ?requestType=saveEvent&userName=adrian44&userPassword=password&eventName=app_launch&app_version=100&os_name=ios&os_version=8&country=us&language=us&device_model=test
// 
// Create GameData: "responseTemplates" and insert "templateleaderboard.json" as "templateleaderboard"
var app_version = Spark.getData().app_version;
var os_name = Spark.getData().os_name;
var os_version = Spark.getData().os_version;
var device_model = Spark.getData().device_model;
var country = Spark.getData().country;
var language = Spark.getData().language;
var baseURL = "https://api.amplitude.com/httpapi";

var gdsAPI = Spark.getGameDataService();
var tableData = Spark.getData().params;
var templateName = Spark.getData().templateName;
var gamesData = Spark.getData();
var isError = true;

function sendEvent(dataObject) {
    
    var requestObject = {};
    requestObject.api_key = amplitudeKey;
    requestObject.event = [];
    requestObject.event[0] = dataObject;
    
    var jsonRequestObject = JSON.stringify(requestObject);
    
    var postRequest = Spark.getHttp(baseURL).setHeaders(
        {
            "Content-Type": "application/json"
        }
    ).postForm(requestObject);
    
    Spark.getLog().error(postRequest.getResponseJson());
    Spark.setScriptData("RESPONSE_RAW", '{“Status”:”Success”}');
    isError = false;
    
    
}

function playerLogin(userName, password) {
    if (userName && password) {
        var authenticationResponse = Spark.sendRequest(
            {
            "@class": ".AuthenticationRequest",
            "password": password,
            "userName": userName
            }
        )
    

        if(authenticationResponse.userId) {
            return authenticationResponse.userId;
            
        } else {
            Spark.getLog().error(authenticationResponse);
            return null;

        }

    }   
}

function getProfile(userId) {
    var profile = gdsAPI.getItem("userProfile", userId);
    var profileObject = profile.document().getData();
        
    return profileObject;
}

function putProfile(userId, profile) {
    var record = gdsAPI.getItem("userProfile", userId);
    
    if (record) {
        record = gdsAPI.createItem("userProfile", userId);  
    } 

    record.setData(profile);
    record.persistor().persist();
}

function returnLeaderboard() {
    var object = gdsAPI.getItem("responseTemplates", "templateleaderboard");
    var jsonObject = object.document().getData();
    
    var propNumber = 0;
    var leaderboardResponse = Spark.getLeaderboards().getLeaderboard(leaderboardName).getEntries();
        
    while (leaderboardResponse.hasNext() && propNumber < 5) {
        if (propNumber < 5) {
            var leaderEntry = leaderboardResponse.next();
            
            if (leaderEntry) {
                
                 
                var rank = propNumber + 1 
                var rowValue = "|" + rank + "|";
                
                if (leaderEntry.getUserName() )
                {
                    rowValue = rowValue + leaderEntry.getUserName() + "|" ;
                } else {
                    rowValue = rowValue + "|";
                }
                
                if (leaderEntry.getAttribute("score") )
                {
                    rowValue = rowValue + leaderEntry.getAttribute("score") + "|" ;
                } else {
                    rowValue = rowValue + "0|";
                }
                
                jsonObject.Children[1].Properties[propNumber].Value = rowValue;
                
            }
            
            propNumber = propNumber + 1;
        }
        
    }
    
    return jsonObject;
}

function findPlayerMatches(uId) {
    var condition = gdsAPI.S("player1Id").eq(uId);
    var matches = gdsAPI.queryItems("matches", condition, null);
    var error = matches.error();
    var tcursor = matches.cursor();

    var index = 0
    while (tcursor.hasNext()) {
        var record = tcursor.next();
        
        if (record.getData().player1Removed == 0) {
            gameTournaments[index] = record.getData();
            index = index + 1
        }
    }
    
    condition = gdsAPI.S("player2Id").eq(uId);
    matches = gdsAPI.queryItems("matches", condition, null);
    error = matches.error();
    tcursor = matches.cursor();
    
    while (tcursor.hasNext()) {
        var record = tcursor.next();
        
        if (record.getData().player2Removed == 0) {
            gameTournaments[index] = record.getData();
            index = index + 1
        }
    }
    
    return gameTournaments;
}

function findOpenMatch() {
    
    var condition = gdsAPI.S("matchStatus").eq("open");
    var matches = gdsAPI.queryItems("matches", condition, null);
    var error = matches.error();

    var tcursor = matches.cursor();
    var returnRecord = null;

    while (tcursor.hasNext()) {
        var record = tcursor.next();
        returnRecord =  record.getData();
        
        break;
    }

    
    return returnRecord;
}

function createMatch(uId, playerScore ) {
    var d = new Date();
    var n = d.getTime();
    
    var matchId = n + "." + Math.floor(Math.random() * 10000 + 1);
    
    var match = {};
    match.matchId = matchId;
    match.matchStatus = "open";
    match.player1Id = uId;
    match.player1Removed = 0;
    match.player1Score = playerScore;
    match.player2Id = "0";
    match.player2Removed = 0;
    
    var record = gdsAPI.createItem("matches", matchId);
    record.setData(match);
    record.persistor().persist();
    
}

if (gamesData){
    
    var uId = Spark.getData().userId;
    var requestType = Spark.getData().requestType;
   
    if (requestType == "template" && previewMode == true ) {
        
        Spark.getLog().debug("Template Name: " + templateName + "tableData: " + tableData);
        if (templateName && tableData) {
            var record = gdsAPI.createItem("responseTemplates", templateName);
            record.setData(tableData);
            record.persistor().persist();
        }
        
         Spark.setScriptData("RESPONSE_RAW", '{“Status”:”Success”}');
         isError = false;
         
    } else if (requestType == "saveEvent") {
        
        //Required.
        var uName = Spark.getData().userName;
        var uPwd = Spark.getData().userPassword;
        var eventName = Spark.getData().eventName;
        
        //Optional
        var app_version = Spark.getData().app_version;
        var os_name = Spark.getData().os_name;
        var os_version = Spark.getData().os_version;
        var device_model = Spark.getData().device_model;
        var country = Spark.getData().country;
        var language = Spark.getData().language;
        
        if (uName && uPwd && eventName) {
            var uId = playerLogin(uName, uPwd);
            
            if (uId) { 
                var dataObject = {};
                dataObject.user_id = uId; 
                dataObject.event_type = eventName;
                
                if (app_version) {
                    dataObject.app_version = app_version;
                }
                
                if (os_name) {
                    dataObject.os_name = os_name;
                }
                
                if (os_version) {
                    dataObject.os_version = os_version;
                }
                
                if (device_model) {
                    dataObject.device_model = device_model;
                }
                
                if (country) {
                    dataObject.country = country;
                }
                
                if (language) {
                    dataObject.language = language;
                }
                
                 sendEvent(dataObject);
            }
        } else {
            Spark.getLog().error("For putEvent request userName, userPassword and eventName are required.")
        }
    
    } else if (requestType == "getProfile" ) {
        
        var uName = Spark.getData().userName;
        var uPwd = Spark.getData().userPassword;

        if (uName && uPwd) {
            var uId = playerLogin(uName, uPwd);

            if (uId) {
                var jsonObject = getProfile(uid);

                if (jsonObject) {
                    Spark.setScriptData("RESPONSE_RAW", jsonObject);
                    isError = false;
                }
            }
        } 
 
    } else if (requestType == "saveProfile") {
        
        
        var profile = tableData;
        var uName = Spark.getData().userName;
        var uPwd = Spark.getData().userPassword;
        
        if (profile && uName && uPwd) {
            var uId = playerLogin(uName, uPwd);

            if (uId == true) {
                putProfile( uid, profile);
                Spark.setScriptData("RESPONSE_RAW", '{“Status”:”Success”}');
                isError = false;
            } 
        }
        

    } else if (requestType == "getLeaderboard") {  
        Spark.setScriptData("RESPONSE_RAW", returnLeaderboard());
        isError = false;
    
    } else if (requestType === "putScore") {
        
        var score = Spark.getData().score;
        var uName = Spark.getData().userName;
        var uPwd = Spark.getData().userPassword;

        var uId = playerLogin(uName, uPwd);

        if (uId && score) {
            Spark.sendRequestAs({"@class": ".LogEventRequest", "eventKey": leaderboardEvent, "score": score }, uId);
            Spark.setScriptData("RESPONSE_RAW", returnLeaderboard());
            isError = false;
        }
    
        
    } else if (requestType === "login") {
        var uName = Spark.getData().userName;
        var uPwd = Spark.getData().userPassword;

        var loginResponse = playerLogin(uName, uPwd);

        if (loginResponse) {
            Spark.setScriptData("RESPONSE_RAW", '{“Status”:”Success”}');
            isError = false;
        }

    } else if (requestType === "register") {
        var uName = Spark.getData().userName;
        var uPwd = Spark.getData().userPassword;
        var uDisplayName = Spark.getData().displayName;

        if (uName && uPwd && uDisplayName) {

            var registrationResponse = Spark.sendRequest(
                {
                "@class": ".RegistrationRequest",
                "displayName": uDisplayName,
                "password": uPwd,
                "segments": {},
                "userName": uName
                }
            )

            if(registrationResponse.userId) {
                Spark.setScriptData("RESPONSE_RAW", '{“Status”:”Success”}');
                isError = false;

            } else {
                Spark.getLog().error(registrationResponse);

            }
        
        }
        
    }
}

if (isError == true) {
            Spark.setScriptData("RESPONSE_RAW", ""); 
}