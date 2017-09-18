// Initialize app
var myApp = new Framework7({
    template7Pages: true
});

var $$ = Dom7;

var mainView = myApp.addView('.view-main', {
    dynamicNavbar: true
});

// Handle Cordova Device Ready Event
$$(document).on('deviceready', function() {
    console.log("Device is ready!");

    setupPush();

    // set driverId
});

function setupPush(){
    var push = PushNotification.init({
        android: {

        },
        browser: {
            pushServiceURL: 'http://push.api.phonegap.com/v1/push'
        },
        ios: {
            alert: true,
            badge: true,
            sound: true
        },
        windows: {}
    });
    push.on('registration', function(data){
        console.log(data.registrationId);
        var regId = localStorage.getItem('registrationId');
        if(regId != null){
            if(regId != data.registrationId){
                var id = JSON.parse(localStorage.getItem('registrationId')[0]);
                localStorage.setItem('registrationId', [id, data.registrationId]);

                if(myApp.connection == 'online'){
                    // save to db
                }
            } 
        } else {
            // Add to database - returns id
            // use returned id to set localStorage
        }
    });
    push.on('notification', function(data){
        console.log(data.message);
    });
    push.on('error', function(e){
        console.log("error");
        console.log(e.message);
    });
}


// Now we need to run the code that will be executed only for About page.

// Option 1. Using page callback for page (for "about" page in this case) (recommended way):
myApp.onPageInit('about', function (page) {
    // Do something here for "about" page

})

// Option 2. Using one 'pageInit' event handler for all pages:
$$(document).on('pageInit', function (e) {
    // Get page data from event data
    var page = e.detail.page;

    if (page.name === 'about') {
        // Following code will be executed for page with data-page attribute equal to "about"
        myApp.alert('Here comes About page');
    }
})

// Option 2. Using live 'pageInit' event handlers for each page
$$(document).on('pageInit', '.page[data-page="about"]', function (e) {
    // Following code will be executed for page with data-page attribute equal to "about"
    myApp.alert('Here comes About page');
})