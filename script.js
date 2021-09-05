var ws;

var me;

var shouldSend = true;

var waited = false;

var night = false;

var vid = document.querySelector('#player');
var enterURL = document.querySelector('#enter-url');

var joinStates = {
  create: document.querySelector('#j-create'),
  failed: document.querySelector('#j-failed'),
  loading: document.querySelector('#j-loading'),
  name: document.querySelector('#j-name')
};

var roomC = document.querySelector('#room-container');
var joinC = document.querySelector('#join-container');
var windowC = document.querySelector('#window-container');

var enterName = document.querySelector('#enter-name');

var welcomeTo = document.querySelector('#welcome-room');

var chatIn = document.querySelector('#chat-in');
var chatOut = document.querySelector('#chat-out');

var banner = document.querySelector('#banner-text');

var eListC = document.querySelector('#e-list');

var enterCC = document.querySelector('#enter-cc');
var directBox = document.querySelector('#direct-check');
var ccBox = document.querySelector('#cc-check');

const emotes = 'BillySMH|Brrrep|Deadgar|EatBugTime|EdgarIII|FrickBoy|FrickMan|HEWWO|JanBruh|JanNom|JanRemy|JanSucks|JMCool|MamasGirl|NoBrows|PeaceOut|PWEASE|RockTrauma|SansBadtime|SansGaming|SansMpreg|SansWink';
const eList = emotes.split('|');

const emoticons = new RegExp(emotes, 'g');

//const serverAddress = 'http://127.0.0.1:3000';
const serverAddress = 'https://watchitwithme.herokuapp.com';

var eHTML = '';

//Loading emmote
eList.forEach(item => eHTML += `<div class="e-option" onclick="chatIn.value+='${item}'; chatIn.focus();"><img src="res/${item}.png"></div>`);

eListC.innerHTML = eHTML;

cycleStates('create');

function cycleStates(next) {
  for (var state in joinStates) {
    joinStates[state].style.display = 'none';
  }
  joinStates[next].style.display = 'flex';
}

function colorMode() {
  if (night) {
    document.body.style.backgroundColor = '';
    chatOut.style.color = '#000';
  } else {
    document.body.style.backgroundColor = '#222';
    chatOut.style.color = '#DDD';
  }

  night = !night;
}

function toggleCCInput() {
  enterCC.toggleAttribute('disabled');
}

document.onclick = function(e) {
  if (e.target.id !== 'e-list' && e.target.id !== 'e-button' && e.target.id !== 'chat-in') {
    eListC.style.display = 'none';
  }
};

function connect() {
  cycleStates('loading');

  ws = new WebSocket('wss://watchitwithme.herokuapp.com/');
  //ws = new WebSocket('ws://127.0.0.1:5000/');

  ws.addEventListener('error', () => {
    cycleStates('failed');
    window.setTimeout(() => {
      window.location.href = '/watch';
    }, 2000);
  });

  ws.addEventListener('open', () => {

    if (meeting) {
      ws.send(JSON.stringify({
        ask: 'exists',
        room: meeting
      }));
    } else {
      // create meeting code
      ws.send(JSON.stringify({
        ask: 'create',
        vLink: `${(directBox.checked ? 'D' : '')}${enterURL.value}${(ccBox.checked ? `|||${enterCC.value}` : '')}`
      }));
    }

  });

  ws.addEventListener('message', ({
    data
  }) => {
    m = JSON.parse(data);

    switch (m.ask) {
      case 'ERROR':
        // error notification
        break;
      case 'inform':
        // message notification

        if (m.t !== '_IGNORE_') {
          let sender = '';
          let item = m.t.replace(emoticons, (match) => {
            return `<div class="wap"><img class="emote" src="res/${match}.png"></div>`;
          });

          if (m.h) {
            sender = (m.h === me ? 'You' : m.h);
          } else {
            sender = someone;
          }

          chatOut.innerHTML += `<div class="chat-item"><strong>${sender+' '}</strong>${item}</div>`;
          chatOut.scrollTop = chatOut.scrollHeight;
        } else if (m.h == 'p') {
          ws.send(JSON.stringify({
            ask: 'p'
          }));
        }

        break;
      case 'created':
        // DISPLAY: REDIRECT TO ROOM
        window.location.href = `/watch/#${m.room}`;
        window.location.reload(false);

        break;
      case 'failed':
        // DISPLAY: FAILURE TO CREATE ROOM
        cycleStates('failed');
        window.setTimeout(() => {
          window.location.href = '/watch';
        }, 2000);

        break;
      case 'roomReal':
        cycleStates('name');
        welcomeTo.innerHTML = `<strong>Room #${meeting}</strong><br>` + welcomeTo.innerHTML;
        banner.innerHTML += '&nbsp;&nbsp;&nbsp;' + `<span id="share">&nbsp;${window.location.href}&nbsp;</span>`;

        // display enter name
        vid.onloadedmetadata = () => {
          windowC.style.height = `${75*(vid.videoHeight/vid.videoWidth)}vw`;
        }

        fetch(`${serverAddress}/${meeting}`).then(response => {
          console.log(`${serverAddress}/${meeting}`);
          console.log(response.status);
          if (response.status !== 300) {
            console.log('CC found!');
            vid.crossOrigin = '';
            vid.innerHTML = `<source src="${m.src}" onerror="this.onerror=null; this.crossorigin='';"><track default crossorigin kind="subtitles" srclang="en" label="English" src="${serverAddress}/${meeting}" />`;
          } else {
            console.log('CC not found!');
            vid.innerHTML += `<source src="${m.src}" onerror="this.onerror=null; this.crossorigin='';">`;
          }
        });

        vid.volume = 0.3;

        break;
      case 'roomFake':
        cycleStates('failed');
        window.setTimeout(() => {
          window.location.href = '/watch';
        }, 2000);

        break;
      case 'joined':
        joinC.style.display = 'none';
        roomC.style.display = 'flex';

        waited = false;
        setTimeout(() => {
          waited = true;
        }, 1000);

        if (m.paused) {
          vid.currentTime = m.time;
          vid.pause();
        } else {
          vid.currentTime = m.time + (Date.now() - m.stime) / 1000;
          vid.play();
        }

        break;
      case 'vid':
        if (m.paused && !vid.paused) {
          shouldSend = false;
          vid.pause();

        } else if (!m.paused && vid.paused) {
          shouldSend = false;
          vid.play();
        }

        if (Math.abs(vid.currentTime - m.time) > 1) {
          vid.currentTime = m.time;
        }

        break;
      default:
        console.log('---???');
    }
  });
}

vid.onseeked = () => {
  if (shouldSend && waited) {
    ws.send(JSON.stringify({
      ask: 'roomE',
      r: meeting,
      e: 'vid',
      s: 'seek',
      name: me,
      time: vid.currentTime,
      paused: vid.paused
    }));
  }

  shouldSend = true;
}

vid.onplay = () => {
  if (shouldSend && waited) {
    ws.send(JSON.stringify({
      ask: 'roomE',
      r: meeting,
      e: 'vid',
      s: 'play',
      name: me,
      time: vid.currentTime,
      paused: vid.paused
    }));
  }

  shouldSend = true;
}

vid.onpause = () => {
  if (shouldSend && waited) {
    ws.send(JSON.stringify({
      ask: 'roomE',
      r: meeting,
      e: 'vid',
      s: 'pause',
      name: me,
      time: vid.currentTime,
      paused: vid.paused
    }));
  }

  shouldSend = true;
}

function say() {
  let msg = chatIn.value;

  // https://stackoverflow.com/questions/1981349/regex-to-replace-multiple-spaces-with-a-single-space
  msg = msg.replace(/\s\s+/g, ' ');

  if (msg && msg !== ' ') {
    ws.send(JSON.stringify({
      ask: 'roomE',
      r: meeting,
      e: 'chat',
      name: me,
      say: msg
    }));
  }

  chatIn.value = '';
}

function join() {
  cycleStates('loading');
  me = enterName.value.replace(/\s/g, '');

  ws.send(JSON.stringify({
    ask: 'roomE',
    r: meeting,
    e: 'join',
    name: me
  }));
}

if (meeting) {
  connect();
} else {
  // Wake up sleepyhead
  fetch(serverAddress);
}