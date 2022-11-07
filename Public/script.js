socket = io();
var currentRaid;
var theme = 'light';

socket.on("currentRaids", function(raids){
  document.getElementById("raidList").innerHTML = "";
  for(tier in raids){
    for(pokemon of raids[tier]){
      addNewRaid(pokemon.tier, pokemon.name, pokemon.sprite)
    }
  }
});


socket.on("raidFound", function(raid){
  joinRaid(raid);
  console.log(raid)
});

function addNewRaid(tier, pokemon, sprite){
  var abrv;
  var niceTier;
  if(tier == 1){
    abrv = '1';
    niceTier = 'tierOne';
  } else if(tier == 3){
    abrv = '3';
    niceTier = 'tierThree';
  } else if(tier == 5){
    abrv = '5';
    niceTier = 'tierFive';
  } else if(tier == "mega"){
    abrv = 'M';
    niceTier = 'mega';
  }

  document.getElementById("raidList").appendChild(constructRaidElement(niceTier, abrv, pokemon, sprite));  
}

function constructRaidElement(tier, abrv, pokemon, sprite){
  var div = document.createElement('DIV');
  div.classList.add('raid');
  var h = document.createElement('H1');
  var pokemonAbrv = document.createTextNode(abrv);     h.appendChild(pokemonAbrv);
  h.classList.add(tier);
  var p = document.createElement('P');
  var pokemonName = document.createTextNode(pokemon);   p.appendChild(pokemonName);
  var img = document.createElement('IMG');
  if(sprite == undefined){
    img.src = 'favicon.png'
  } else {
    img.src = sprite;
  }
  
  div.appendChild(h);
  div.appendChild(p);
  div.appendChild(img);

  return(div);
}

document.addEventListener('click', function( event ){
  const raidDivs = document.getElementsByClassName('raid');
  for(div of raidDivs){
    if(div.contains(event.target)){
      socket.emit('raidRequest', div.children[1].innerText);
    }
  }
});

function joinRaid(raid){
  currentRaid = raid;
  if(raid.error){
    var errorMessage;
    if(raid.error == 'Not found'){
      errorMessage = `No open raids for ${raid.raidBoss}`;
    }
    document.getElementById('friendCode').innerHTML = '';
    document.getElementById('raidBoss').innerText = errorMessage;
    document.getElementById('menuShadow').style.visibility = 'visible';
    document.getElementById('raidMenu').style.visibility = 'visible';
  } else {
    document.getElementById('friendCode').innerHTML = `Add the host to your friend list in-game with their friend code: <b>${raid.friendCode}</b>`;
    document.getElementById('raidBoss').innerText = `Joining a ${raid.raidBoss} raid`;
    document.getElementById('menuShadow').style.visibility = 'visible';
    document.getElementById('raidMenu').style.visibility = 'visible';
  }
}

function back(){
  currentRaid = undefined;
  document.getElementById('menuShadow').style.visibility = 'hidden';
  document.getElementById('createMenu').style.visibility = 'hidden';
  document.getElementById('raidMenu').style.visibility = 'hidden';
  document.getElementById('instructions').style.visibility = 'hidden';
}

function leaveRaid(){
  if(currentRaid){
    socket.emit('leaveRaid', currentRaid);
  }
  currentRaid = undefined;
}

function openCreateMenu(){
  document.getElementById('raidMenu').style.visibility = 'hidden';
  document.getElementById('createBoss').innerText = `Creating a ${currentRaid.raidBoss} raid`;
  document.getElementById('menuShadow').style.visibility = 'visible';
  document.getElementById('createMenu').style.visibility = 'visible';
}

function createRaid(){
  if(currentRaid){
    const friendCode = document.getElementById('codeInput').value.replace(/[\s-]/g, '');
    if(/[a-zA-Z]/g.test(friendCode) || friendCode.length > 12){
      return;
    }
    const raidObj = {
      raidBoss: currentRaid.raidBoss,
      friendCode: friendCode
    }
    back();
    socket.emit('createRaid', raidObj);
  }
}

window.onbeforeunload = function() {
  leaveRaid();
};

if(localStorage.getItem('theme') == 'dark'){
  toggleTheme();
}

function toggleTheme(){
  document.body.classList.toggle('light-theme');
  document.body.classList.toggle('dark-theme');
  if(theme == 'light'){
    localStorage.setItem('theme', 'dark');
    theme = 'dark';
  } else if(theme == 'dark'){
    localStorage.setItem('theme', 'light');
    theme = 'light';
  }
}

function openInstructions(){
  document.getElementById('menuShadow').style.visibility = 'visible';
  document.getElementById('instructions').style.visibility = 'visible';
}

const options = {
  clicksToSave: 40,
  detectNonhumanClick: true,
  detectClickInterval: {
    enabled: true,
    margin: 10
  },
  detectFastClicking: {
    enabled: true,
    maximumAvgPerSecond: 35
  }
}

function punishment(){
  window.location.reload();
}

const detector = new antiautoclick(punishment, options);