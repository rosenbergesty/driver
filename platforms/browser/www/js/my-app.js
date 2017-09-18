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

    // Check connection
    if(checkConnection() == 'none'){
        myApp.connection = 'offline';
    } else {
        myApp.connection = 'online';
    }

    // Check if logged in
    if(loggedIn()){
        mainView.router.loadPage('stops.html');
        if('online'){
            setupPush();   
        }
    }

    // If not logged in...
    $$('#login').click(function(e){
        var email = $$('#email').val().toLowerCase().trim();
        var password = $$('#password').val();

        $$.post('http://estyrosenberg.com/guma/fetch-driver-by-email.php', {email: email}, function(data){
            var data = JSON.parse(data);
            if(data == '0 results'){
                myApp.alert("Invalid email address. Please try again.", "");
            } else {
                if(data[0].password == password){
                    localStorage.setItem('login', data[0].ID);
                    myApp.driverId = data[0].ID;
                    setupPush();
                    console.log('load stops');
                    mainView.router.loadPage('stops.html');
                } else {
                    myApp.alert("Invalid password. Please try again", "");
                }   
            }
        }, function(xhr, status){
            console.log(JSON.stringify(xhr));
            console.log(status);

            myApp.alert("Error connecting. Please try agian later.", "");
        });
    });
});

function checkConnection() {
    var networkState = navigator.connection.type;
    return networkState;
}
document.addEventListener("offline", function(){
    myApp.connection = 'offline';
}, false);
document.addEventListener("online", reconnected, false);
function reconnected(){
    myApp.connection = 'online';

    if(loggedIn()){
        setupPush();

        if(localStorage.getItem('cachedPickups') != null){
            $$.each(JSON.parse(localStorage.getItem('cachedPickups')), function(index, value){
                myApp.updatePickup(value.id, value.containerNum);
            });
            localStorage.removeItem('cachedPickups');
        }
    }
}

function loggedIn(){
    var userId = localStorage.getItem('login');
    myApp.driverId = userId;
    if(userId != null){
        return true;
    }
}

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
        var regId = localStorage.getItem('registrationId');
        if(regId != null){
            if(regId != data.registrationId){
                var id = JSON.parse(localStorage.getItem('registrationId')[0]);
                localStorage.setItem('registrationId', [id, data.registrationId]);

                $$.post('http://estyrosenberg.com/guma/update-device-token.php', 
                    {newDevice: data.registrationId, oldDevice: regId},
                    function(response){
                        var resp = JSON.parse(response);
                        if(resp.code == '200'){
                            localStorage.setItem('registrationId', data.registrationId);
                        } else {
                            myApp.alert('There was an error setting up push notifications. To recieve notifications, contact the developer');
                        }
                    }, function(xhr, status){
                        console.log(JSON.stringify(xhr));
                        console.log(status);
                    });
            } 
        } else {
            $$.post('http://estyrosenberg.com/guma/add-device-token.php', 
                {driverId: myApp.driverId, deviceId: data.registrationId},
                function(response){
                    var resp = JSON.parse(response);
                    if(resp.code == '200'){
                        localStorage.setItem('registrationId', data.registrationId);
                    } else {
                        myApp.alert('There was an error setting up push notifications. To recieve notifications, contact the developer');
                    }
                }, function(xhr, status){
                    console.log(JSON.stringify(xhr));
                    console.log(status);
                });
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

// Stops Page
myApp.onPageInit('stops', function(page){
    // initialize list view 
    var stops = [];
    var driverId = myApp.driverId;
    var stopsList = myApp.virtualList('#stopsList', {
        items: stops,
        template: '<a href="{{url}}" data-context=\'{"address": "{{address}}", "id": "{{id}}" }\' class="item-content item-link {{status}}">'+
                    '<div class="item-inner">'+
                        '<div class="itme-title-row">'+
                            '<div class="item-title">{{address}}</div>'+
                        '</div>'+
                        '<div class="item-subtitle">{{action}} | {{size}} yard</div>'+
                        '<div class="item-text">{{date}}</div>'+
                    '</div>'+
                   '</a>',
        searchAll: function(query, items){
            var foundItems = [];
            for (var i = 0; i < items.length; i++){
                if(items[i].address.indexOf(query.trim()) >= 0 || +
                    items[i].action.indexOf(query.trim()) >= 0 || +
                    items[i].size.indexOf(query.trim()) >= 0) foundItems.push(i);
            }
            return foundItems;
        }
    });
    updateList();

    var searchbar = myApp.searchbar('.searchbar', {
        searchList: '.list-block-search',
        searchIn: '.item-title'
    });

    // initialize pull to refresh
    var ptrContent = $$('.pull-to-refresh-content');
    ptrContent.on('refresh', function(e){
        updateList();
        myApp.pullToRefreshDone();
    });


    // get data for list
    function updateList(){
        if(myApp.connection = 'online'){
            $$.post('http://estyrosenberg.com/guma/fetch-stops-by-driverId.php', {driverID: driverId}, function(data){
                localStorage.setItem('stops'+driverId, data);
                renderList(data);
            });   
        } else {
            var data = localStorage.getItem('stops'+driverId);
            renderList(data);
        }
    }

    function renderList(data){
        if(JSON.parse(data) != '0 results'){
            stopsList.deleteAllItems();
            $$('.empty-state').hide();
            $$.each(JSON.parse(data), function(index, value){
                var address = value.address;
                var url = "";
                var action = value.type;
                switch(action){
                    case "DD":
                        action = "Dropdown";
                        url = "dropdown.html";
                        break;
                    case "PU":
                        action = "Pick Up";
                        url = "pickup.html";
                        break;
                    case "SW":
                        action = "Switch";
                        url = "switch.html";
                        break;
                }
                var date = value.date;
                var size = value.size;
                var status = value.status;
                var time = value.time;
                var itemId = value.ID;

                stopsList.appendItem({
                    address: address,
                    action: action,
                    date: date,
                    size: size,
                    status: status,
                    time: time,
                    id: itemId,
                    url: url
                });
            });
        }
    }

});

// Pickup
myApp.onPageInit('pickup', function(page){
    $$('.preloader').hide();
    $$('.save').click(function(){
        $$('.preloader').show();
        var containerNumber = $$('#containerNum').val();
        var datetime = new Date();
        var date = (datetime.getMonth() + 1)+"/"+datetime.getDate ()+"/"+datetime.getFullYear();
        var time = datetime.getHours()+":"+datetime.getMinutes()+":"+datetime.getSeconds();

        if(containerNumber <= 0){
            myApp.alert('Please enter a valid container number', '');
        } else {
            $('.preloader').show();
            if(myApp.connection = 'online'){
                myApp.updatePickup(page.context.id, containerNumber, date, time);
            } else {
                myApp.addNotification({
                    message: "You seem to be offline. File will be cached and uploaded once you're reconnected."
                });
                var cachedPickups = [];
                if(localStorage.getItem('chachedPickups') != null){
                    cachedPickpups = JSON.parse(localStorage.getItem('cachedPickups'));
                }
                chachedPickups.push({id: page.context.id, containerNum: containerNumber, date: date, time: time});
                localStorage.setItem('cachedPickpus', cachedPickpups);
            }
        }
    });

});


// Switch
myApp.onPageInit('switch', function(page){
    $('#signature').jSignature();

    $('.preloader').hide();
    $('.save').click(function(){
        var error = false;
        var message = '';

        var containerNumber = $('#containerNum').val();
        if(containerNumber <= 0){
            error = true;
            message = 'Please entera a valid container number';
        }

        var container2Number = $('#container2Num').val();
        if(container2Number <= 0){
            error = true;
            message = 'Please entera a valid container number';
        }

        var borough = $('#borough')[0].selectedOptions[0].value;
        var comments = $('#comments').val();

        var datetime = new Date();
        var date = (datetime.getMonth() + 1)+"/"+datetime.getDate ()+"/"+datetime.getFullYear();
        var time = datetime.getHours()+":"+datetime.getMinutes()+":"+datetime.getSeconds();

        if(error == true){
            myApp.alert('Please enter a valid container number', '');
        } else {
            $('.preloader').show();

            var datapair = $('#signature').jSignature("getData", "svg");
            console.log(datapair);
            if(myApp.connection == 'online'){
                myApp.updateSwitch(page.context.id, containerNumber, container2Number, borough, comments, datapair[1], date, time);
            } else {
                myApp.addNotification({
                    message: "You seem to be offline. File will be cached and uploaded once you're reconnected."
                });
                var cachedSwitches = [];
                if(localStorage.getItem('chachedSwitches') != null){
                    cachedSwitches = JSON.parse(localStorage.getItem('cachedSwitches'));
                }
                chachedSwitches.push({id: page.context.id, containerNum: containerNumber, containerNum2: container2Number, borough: borough, comments: comments, signature: datapair[1], date: date, time: time});
                localStorage.setItem('cachedSwitches', cachedSwitches);
            }
        }

    });
});

myApp.updateSwitch = function(id, container, container2, borough, comments, sign, date, time){
    $$.post('http://estyrosenberg.com/guma/upload-signature.php',
        {svg: sign},
        function(data){
            $$.post('http://estyrosenberg.com/guma/update-stop-switch.php', 
                {stopId: id, container: container, container2: container2, borough: borough, comments: comments, signature: data, date: date, time: time}, 
                function(response){
                    console.log(response);
                    var resp = JSON.parse(response);
                    if(resp.code == '200'){
                        mainView.router.loadPage('stops.html');
                        $$('.preloader').hide();
                    } else {
                        myApp.alert("There was an error saving this file. Please contact administrator.", "");
                    }
                }
            ); 
            mainView.router.loadPage('stops.html');
        },
        function(xhr, status){
            console.log(xhr);
            console.log(status);
        }
    );
}

myApp.updatePickup = function(id, containerNum, date, time){
    $$.post('http://estyrosenberg.com/guma/update-stop-pickup.php', 
        {stopId: id, container: containerNum, date, time}, 
        function(data){
            var data = JSON.parse(data);
            if(data.code == '200'){
                mainView.router.loadPage('stops.html');
                $$('.preloader').hide();
            } else {
                myApp.alert("There was an error saving this file. Please contact administrator.", "");
            }
        }
    ); 
}
