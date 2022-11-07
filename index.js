const axios = require('axios');
const schedule = require('node-schedule');
const express = require('express');
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs');
var raids;
var currentRaidBosses;
var hostedRaids = [];



// Server functions //



http.listen(process.env.PORT, () => {
  console.log(`App started at ${getFormattedDate()}`);
});

app.use(express.static('Public'));

app.get('/',function(req,res) {
  res.sendFile(path.join(__dirname + '/Public/index.html'));
});

io.on('connection', (socket) => {
  socket.emit('currentRaids', currentRaidBosses);
  console.log(`A user has connected. (${io.engine.clientsCount} user(s) online)`);

  socket.on('raidRequest', (pokemon) => {
    if(pokemonIsSafe(pokemon)){
      socket.emit('raidFound', joinRaid(pokemon));
    }
  });

  socket.on('leaveRaid', (raid) => {
    if(scanRaidObject(raid)){
      leaveRaid(raid);
    }
  });

  socket.on('createRaid', (raid) => {
    if(scanRaidObject(raid) && friendCodeIsUnique(raid.friendCode)){
      createRaid(raid.raidBoss, raid.friendCode);
    }
  });
});

updateRaids()
.catch(err => {
  console.error(err);
});

setInterval(function(){
  updateRaids()
  .catch(err => {
    console.error(err);
  });
}, ((24 * 60 * 60 * 1000) + 1000));



// JSON Managment //



function isEmpty(path) {
  const file = fs.readFileSync(path);
  for(var key in file) {
    if(file.hasOwnProperty(key) && Object.keys(JSON.parse(file)).length !== 0)
      return false;
    }
  return true;
}



// Raid Functions //



async function updateRaids(){
  const raidsJSON = JSON.parse(fs.readFileSync('Data/Raids.json'));
  const date = Date.now();
  raids = await getAllRaids();
  
  if(((date - raidsJSON.date) < (1000 * 60 * 60 * 24)) || isEmpty('Data/Raids.json')){
    currentRaidBosses = await getCurrentRaidBosses(raids);
  } else {
    currentRaidBosses = raidsJSON.currentRaids;
  }

  const newRaidsJSON = {
    currentRaids: currentRaidBosses,
    date: date
  }

  fs.writeFileSync('Data/Raids.json', JSON.stringify(newRaidsJSON));
}

async function getAllRaids(){
  return await axios.get('https://pogoapi.net/api/v1/raid_bosses.json')
  .then(response => {
    return response.data;
  })
  .catch(err => {
    console.error(err);
  });
}

async function getPokemonSprite(name){
  return await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`)
  .then(response => {
    return response.data.sprites.front_default;
  })
  .catch(err => {
    console.error(err);
  });
}

async function getCurrentRaidBosses(allRaids){
  var object = {
    tierOne: allRaids.current[1],
    tierThree: allRaids.current[3],
    tierFive: allRaids.current[5],
    mega: allRaids.current.mega,
  }

  for(tier in object){
    for(pokemon of object[tier]){
      pokemon.sprite = await getPokemonSprite(  (pokemon.name).toLowerCase());
    }
  }
  
  return object;
}



// Client Functions //



function createRaid(pokemon, friendCode){
  var object = {
    id: generateUniqueID(),
    raidBoss: pokemon,
    friendCode: friendCode,
    players: 1
  }
  removeRaidInTwoMinutes(object);
  hostedRaids.push(object);
}


function joinRaid(pokemon){
  for(raid of hostedRaids){
    if(raid.raidBoss == pokemon && raid.players < 6){
      raid.players ++;
      if(raid.players >= 6){
        removeRaid(raid);
      }
      return raid;
    }
  }
  const errorObj = {
    error: 'Not found',
    raidBoss: pokemon
  }
  return errorObj;
}


function leaveRaid(toLeave){
  for(raid of hostedRaids){
    if(raid.id == toLeave.id && raid.players > 0){
      raid.players --;
      if(raid.players <= 5){
        createRaid(raid.pokemon, raid.friendCode);
      }
    }
  }
}


function removeRaid(raid){
  const raidIndex = hostedRaids.indexOf(raid);
  
  if(raidIndex !== -1) hostedRaids.splice(raidIndex, 1);
}


function removeRaidInTwoMinutes(raid){
  setTimeout(function(){
    removeRaid(raid);
  }, 1000 * 60 * 2);
}



// Security Functions //



function pokemonIsSafe(nameToCheck){
  var object = {
    tierOne: raids.current[1],
    tierThree: raids.current[3],
    tierFive: raids.current[5],
    mega: raids.current.mega,
  }
  for(tier in object){
    for(pokemon of object[tier]){
      if(pokemon.name == nameToCheck){
        return(true);
      }
    }
  }
  return(false);
}


function scanRaidObject(raidObject){
  var idIsSafe = false;
  var playerCountIsSafe = false;
  var bossIsSafe = false;
  var friendCodeIsSafe = false;
  var keyCount = raidObject.keys.length;

  if(pokemonIsSafe(raidObject.raidBoss)){
    bossIsSafe = true;
  }

  if(!(/[a-zA-Z]/g.test(raidObject.friendCode) && raidObject.friendCode.length > 12)){
    friendCodeIsSafe = true;
  }

  if(raidObject.id && raidObject.playerCount){
    if(isInteger(raidObject.playerCount) && raidObject.playerCount <= 6 && raidObject.playerCount >= 0){
      playerCountIsSafe = true
    }
    
    if(raidObject.id.length == 4 && /^[a-z0-9]+$/i.match(raidObject.id !== null)){
      playerCountIsSafe = true;
    }
  } else {
    idIsSafe = true;
    playerCountIsSafe = true;
  }

  if(bossIsSafe && friendCodeIsSafe && idIsSafe && playerCountIsSafe && (keyCount == 4)){
    return true;
  } else {
    return false;
  }
}



// Misc Functions //



function friendCodeIsUnique(friendCodeToCheck){
  var friendCodes = [];

  for(raid of hostedRaids){
    friendCodes.push(raid.friendCode)
  }

  if(friendCodes.includes(friendCodeToCheck)){
    return false;
  } else {
    return true;
  }
}


function generateUniqueID(){
  return (performance.now().toString(36)+Math.random().toString(36)).replace(/\./g,"");
}



// Console and Debug Functions //



function getFormattedDate() {
  var date = new Date();
  return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}