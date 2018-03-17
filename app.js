const config = require('./config.json');
const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const client = new SteamUser();
const community = new SteamCommunity();

const manager = new TradeOfferManager({
    "steam": client,
    "language": "en"
});

const logOnOptions = {
	accountName: config.username,
	password: config.password,
  twoFactorCode: SteamTotp.generateAuthCode(config.secret)
}

var cardList = config.saleCardsWhitelist;
var readyToTrade = false;

client.logOn(logOnOptions);

client.on('steamGuard', function(domain, callback) {
	console.log("Steam Guard code needed from email ending in " + domain);
	var code = getCodeSomehow();
	callback(code);
});

client.on('loggedOn', () => {
	console.log('sucessfully logged on.');
	client.setPersona(SteamUser.Steam.EPersonaState.Online)
  // SETS COOKIES FOR TRADING
  client.on('webSession', (sessionID, cookies) => {
  	manager.setCookies(cookies);
    community.setCookies(cookies);
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
        console.log(`[${offer.id}] Got new offer ` + offer.id);
        offerFilter(offer);
      })
    }
  })
}

var offerFilter = (offer) => {
  declineFilter(offer);
}

var declineFilter = (offer) => {
  // var id = offer.id;
  //
  // console.log("***************RECEIVING***************")
  // offer.itemsToReceive.forEach((item) => {
  //   itemOverview(item);
  // })
  // console.log("***************SEND***************")
  // offer.itemsToGive.forEach((item) => {
  //   itemOverview(item);
  //   console.log("MULM");
  // })

  acceptFilter(offer);

}

var acceptFilter = (offer) => {

  var valueGive = 0;
  var valueReceive = 0;
  var whitelistedGive = true;
  var whitelistedReceive = true;

  offer.itemsToGive.forEach((item) => {
    cardList.forEach((whitelist) => {
      if(whitelist == item.classid) {
        valueGive++;
        console.log(`[${offer.id}] To give: ` + item.name);
      }else {
        whitelistedGive = false;
        console.log(`[${offer.id}] Not whitelisted item to give: ` + item.name);
      }
    })
  })

  offer.itemsToReceive.forEach((item) => {
    cardList.forEach((whitelist) => {
      if(whitelist == item.classid) {
        valueReceive++;
        console.log(`[${offer.id}] To receive: ` + item.name);
      }else {
        whitelistedReceive = false;
        console.log(`[${offer.id}] Not whitelisted item to receive: ` + item.name);
      }
    })
  })

  // console.log("GIVE: " + valueGive);
  // console.log("RECEIVE: " + valueReceive);
  // console.log("Give Whitelisted: " + whitelistedGive);
  // console.log("Receive Whitelisted: " + whitelistedReceive);


  if(!(valueReceive >= valueGive) && !whitelistedGive && !whitelistedReceive){
    manualOffer(offer);
  }else if(!(valueReceive >= valueGive) && !whitelistedGive && whitelistedReceive){
    declineOffer(offer);
  }else if(!(valueReceive >= valueGive) && whitelistedGive && !whitelistedReceive){
    manualOffer(offer);
  }else if(!(valueReceive >= valueGive) && whitelistedGive && whitelistedReceive){
    declineOffer(offer);
  }else if((valueReceive >= valueGive) && !whitelistedGive && !whitelistedReceive){
    manualOffer(offer);
  }else if((valueReceive > valueGive) && !whitelistedGive && whitelistedReceive){
    manualOffer(offer);
  }else if((valueReceive >= valueGive) && !whitelistedGive && whitelistedReceive){
    declineOffer(offer);
  }else if((valueReceive >= valueGive) && whitelistedGive && !whitelistedReceive){
    acceptOffer(offer);
  }else if((valueReceive >= valueGive) && whitelistedGive && whitelistedReceive){
    acceptOffer(offer);
  }
}

var itemOverview = (item) => {
  console.log(item.name);
  console.log(item.classid);
}

var declineOffer = (offer) => {
  console.log(`[${offer.id}] Declining offer...`);
  offer.decline((err) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`[${offer.id}] Offer Declined!`);
    }
  });
}
var manualOffer = (offer) => {
  console.log(`[${offer.id}] Offer needs manual checking`);
}
var acceptOffer = (offer) => {
  console.log(`[${offer.id}] Accepting offer`);
  offer.accept((err) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`[${offer.id}] Offer accepted!`);
    }
  });
}

//TODO polling rate
var getConfirmations = () => {
  setTimeout(() => {
    var time = Math.floor(new Date() / 1000);
    community.getConfirmations(time, SteamTotp.getConfirmationKey(config.identity_secret, time, "conf"), (err, confirmations) => {
      if (err) {
        console.log(err);
      } else {
        //TODO array durcharbeiten + filtern dass nur zuvor angenommene ausgeführt werden
        console.log("Accepting Mobile Confirmation");
        confirmations.forEach((confirmation) => {
          confirmation.respond(time, SteamTotp.getConfirmationKey(config.identity_secret, time, "allow"), true, (err) => {
            if (err) {
                console.log("Cannot accept confirmation: " + err.message);
            } else {
                console.log("Confirmation accepted successfully");
            }
          });
        })
      }
    })
  }, 10000);
  getConfirmations()
}
//TODO whitelist admin
//TODO diffrent modes -> same game or whitelist game or whitelist cards
