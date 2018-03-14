const config = require('./config.json');
const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const client = new SteamUser();

const manager = new TradeOfferManager({
    "steam": client,
    "language": "en"
});

const logOnOptions = {
	accountName: config.username,
	password: config.password
};

var cardList = config.saleCardsWhitelist;
var readyToTrade = false;

client.logOn(logOnOptions);

client.on('loggedOn', () => {
	console.log('sucessfully logged on.');
	client.setPersona(SteamUser.Steam.EPersonaState.Online)
  // SETS COOKIES FOR TRADING
  client.on('webSession', (sessionID, cookies) => {
  	manager.setCookies(cookies)
    console.log("Set cookies!");
    readyToTrade = true;
  });
});

client.on('tradeOffers', (count) => {
  if(!readyToTrade){
    setTimeout(() => {
      recieveOffers()
    }, 3000);
  }
  else{
    console.log(count + ' active Tradeoffer(s)');
    recieveOffers()
  }
});

var recieveOffers = () => {
  manager.getOffers(1, (err, sent, recieved) => {
    if(!err) {
      recieved.forEach((offer) => {
        console.log("Got new offer " + offer.id);
        offerFilter(offer);
      })
    }
  })
}

var offerFilter = (offer) => {
  declineFilter(offer);
}

var declineFilter = (offer) => {
  var id = offer.id;
  var decline = false;

  console.log("***************RECEIVING***************")
  offer.itemsToReceive.forEach((item) => {
    itemOverview(item);
  })
  console.log("***************SEND***************")
  offer.itemsToGiveforEach((item) => {
    itemOverview(item);
  })

  if(offer.itemsToReceive.length == 0){
    decline = true;
    console.log("Recieved Empty offer " + id);
  }

  if (decline) {
    offer.decline((err) => {
      if (err) {
        console.log(err);
      } else {
        console.log('Offer Canceled ' + id);
      }
    });
  } else {
    acceptFilter(offer);
  }
}

var acceptFilter = (offer) => {
  var valueGive = 0;
  var valueReceive = 0;
  var allWhitelisted = true;
  //TODO whitelist for give and receive -> individual acceptt or decline

  offer.itemsToGive.forEach((item) => {
    cardList.forEach((whitelist) => {
      if(whitelist == item.classid) {
        valueGive++;
      }else {
        allWhitelisted = false;
        console.log("Unknown Item!");
        console.log(whitelist);
        console.log(item.classid);
      }
    })
  })

  offer.itemsToReceive.forEach((item) => {
    cardList.forEach((whitelist) => {
      if(whitelist == item.classid) {
        valueReceive++;
      }else {
        allWhitelisted = false;
        console.log("Unknown Item!");
        console.log(whitelist);
        console.log(item.classid);
      }
    })
  })

  console.log("GIVE: " + valueGive);
  console.log("RECEIVE: " + valueReceive);
  console.log("All Whitelisted: " + allWhitelisted);
  if(valueReceive >= valueGive && allWhitelisted){
    //send
    console.log("Sending offer!");
  } else {
    console.log("Offer needs manual cheking");
  }
}

var itemOverview = (item) => {
  console.log(item.name);
  console.log(item.classid);
}
