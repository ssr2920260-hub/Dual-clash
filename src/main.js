import './style.css';

const app = document.querySelector('#app');

const state = {
  balance: 10000,
  round: 1,
  timer: 35,
  amount: 10,
  pending: {},
  confirmed: [],
  locked: false,
  history: []
};

const amounts = [10, 50, 100, 500, 1000, 5000, 10000];
const fmt = n => Math.round(n).toLocaleString('en-IN') + ' PTS';

function totalPending() {
  return Object.values(state.pending).reduce((a,b)=>a+b,0);
}

function render() {
  app.innerHTML = `
    <main class="app-shell">
      <header class="header">
        <div class="logo">⚡ DUAL<span>CLASH</span></div>
        <div class="right-head">
          <div class="wallet">
            <small>DEMO BALANCE</small>
            <b id="wallet">${fmt(state.balance)}</b>
          </div>
          <button class="menu-btn" id="menuBtn">☰</button>
        </div>
        <div class="menu-popup hidden" id="menuPopup">
          <button id="howBtn">How to Play</button>
          <button id="rulesBtn">Game Rules</button>
        </div>
      </header>

      <div class="round-bar">
        <b>● LIVE ROUND #<span id="round">${state.round}</span></b>
        <strong id="timer">00:35</strong>
      </div>

      <section class="arena">
        <div class="arena-fighters">
          <div class="fighter blue" id="pulseFighter">
            <b class="fighter-name">PULSE</b>
            <strong class="result-card hidden" id="pulseResult">0</strong>
            <small class="winner-label hidden" id="pulseWinner">★ WINNER</small>
          </div>
          <div class="vs-label">VS</div>
          <div class="fighter red" id="bladeFighter">
            <b class="fighter-name">BLADE</b>
            <strong class="result-card hidden" id="bladeResult">0</strong>
            <small class="winner-label hidden" id="bladeWinner">★ WINNER</small>
          </div>
        </div>
        <div class="arena-status" id="arenaStatus">PREDICT THE ROUND</div>
      </section>

      <section class="table">
        <div class="table-heading"><b>PULSE <span>VS</span> BLADE</b><em>2X</em></div>
        <div class="options">
          <button data-key="winner:PULSE" class="option blue">PULSE</button>
          <button data-key="winner:BLADE" class="option red">BLADE</button>
        </div>
        <div class="result-line" id="winnerResult">Choose your prediction</div>
      </section>

      <section class="table">
        <div class="table-heading"><b>ODD <span>/</span> EVEN</b><em>2X</em></div>
        <div class="options">
          <button data-key="parity:ODD" class="option blue">ODD</button>
          <button data-key="parity:EVEN" class="option red">EVEN</button>
        </div>
        <div class="result-line" id="parityResult">Choose your prediction</div>
      </section>

      <section class="table">
        <div class="table-heading"><b>LUCKY NUMBER</b><em class="nine">9X</em></div>
        <div class="numbers">
          ${Array.from({length:10},(_,i)=>`
            <button data-key="number:${i}" class="number">${i}</button>
          `).join('')}
        </div>
        <div class="result-line" id="numberResult">Choose a number from 0 to 9</div>
      </section>

      <section class="amount-section">
        <div class="table-heading"><b>SELECT DEMO POINTS</b></div>
        <div class="amounts">
          ${amounts.map(n=>`
            <button data-amount="${n}" class="${n===10?'active':''}">${n.toLocaleString('en-IN')}</button>
          `).join('')}
        </div>
      </section>

      <div class="pending-bar hidden" id="pendingBar">
        <span>Do you want to bet?</span>
        <b id="pendingTotal">${fmt(0)}</b>
        <button id="clearBtn" aria-label="Clear">✕</button>
        <button id="confirmBtn" aria-label="Confirm">✓</button>
      </div>

      <section class="history">
        <div class="table-heading"><b>RECENT ROUNDS</b></div>
        <div id="historyList">No completed rounds yet.</div>
      </section>

      <div class="toast" id="toast"></div>

      <div class="modal hidden" id="modal">
        <div class="modal-card">
          <button class="modal-close" id="closeModal">×</button>
          <h3 id="modalTitle"></h3>
          <p id="modalText"></p>
        </div>
      </div>

      <footer>DUALCLASH · VIRTUAL DEMO POINTS ONLY</footer>
    </main>
  `;

  bindEvents();
  updatePending();
  updateHistory();
}

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(()=>el.classList.remove('show'),2400);
}

function animateBalance(target) {
  const el = document.querySelector('#wallet');
  if (!el) return;

  const start = Number(el.dataset.value || state.balance);
  const end = target;
  const duration = 700;
  const began = performance.now();

  el.dataset.value = end;

  function frame(now) {
    const progress = Math.min((now-began)/duration,1);
    const eased = 1-Math.pow(1-progress,3);
    const value = Math.round(start+(end-start)*eased);
    el.textContent = fmt(value);

    if(progress<1) requestAnimationFrame(frame);
    else el.textContent = fmt(end);
  }

  requestAnimationFrame(frame);
}

function animatePoints(from, to, amount) {
  const a = document.querySelector(from);
  const b = document.querySelector(to);
  if(!a || !b) return;

  const start = a.getBoundingClientRect();
  const end = b.getBoundingClientRect();
  const dot = document.createElement('div');

  dot.className = 'flying-point';
  dot.textContent = '+'+amount;
  dot.style.left = (start.left+start.width/2)+'px';
  dot.style.top = (start.top+start.height/2)+'px';
  dot.style.setProperty('--dx',(end.left+end.width/2-start.left-start.width/2)+'px');
  dot.style.setProperty('--dy',(end.top+end.height/2-start.top-start.height/2)+'px');

  document.body.appendChild(dot);
  dot.addEventListener('animationend',()=>dot.remove());
}

function updatePending() {
  const total = totalPending();
  const bar = document.querySelector('#pendingBar');

  bar.classList.toggle('hidden',total===0);
  document.querySelector('#pendingTotal').textContent = fmt(total);
  document.querySelector('#wallet').textContent = fmt(state.balance);
  document.querySelector('#wallet').dataset.value = state.balance;

  document.querySelectorAll('[data-key]').forEach(btn=>{
    btn.classList.toggle('selected',!!state.pending[btn.dataset.key]);
    btn.disabled = state.locked;
  });

  document.querySelectorAll('[data-amount]').forEach(btn=>{
    btn.classList.toggle('active',Number(btn.dataset.amount)===state.amount);
    btn.disabled = state.locked;
  });

  document.querySelector('#confirmBtn').disabled = state.locked;
  document.querySelector('#clearBtn').disabled = state.locked;
}

function bindEvents() {
  document.querySelectorAll('[data-amount]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(state.locked) return;
      state.amount = Number(btn.dataset.amount);
      updatePending();
    });
  });

  document.querySelectorAll('[data-key]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(state.locked) return;

      const key = btn.dataset.key;
      const next = totalPending()+state.amount;

      if(next>state.balance) {
        toast('Not enough demo points!');
        return;
      }

      state.pending[key] = (state.pending[key]||0)+state.amount;
      animatePoints('.wallet','#'+btn.closest('.table').classList[0],state.amount);
      btn.classList.add('tap-flash');
      setTimeout(()=>btn.classList.remove('tap-flash'),350);
      updatePending();
    });
  });

  document.querySelector('#clearBtn').onclick = ()=>{
    if(state.locked) return;
    state.pending = {};
    updatePending();
    toast('Selections cleared');
  };

  document.querySelector('#confirmBtn').onclick = confirmBets;

  document.querySelector('#menuBtn').onclick = ()=>{
    document.querySelector('#menuPopup').classList.toggle('hidden');
  };

  document.querySelector('#howBtn').onclick = ()=>showModal(
    'How to Play',
    'Choose a table option and select demo points. Confirm your selections before the countdown ends. The round result appears automatically.'
  );

  document.querySelector('#rulesBtn').onclick = ()=>showModal(
    'Game Rules',
    'Winner and Odd/Even use a 2X demo multiplier. Lucky Number uses 9X. Odd/Even is based on the higher revealed number. A tie refunds Winner selections. Demo points have no cash value.'
  );

  document.querySelector('#closeModal').onclick = ()=>{
    document.querySelector('#modal').classList.add('hidden');
  };
}

function showModal(title,text) {
  document.querySelector('#modalTitle').textContent = title;
  document.querySelector('#modalText').textContent = text;
  document.querySelector('#modal').classList.remove('hidden');
  document.querySelector('#menuPopup').classList.add('hidden');
}

function confirmBets() {
  const total = totalPending();

  if(!total || state.locked) return;

  if(total>state.balance) {
    toast('Not enough demo points!');
    return;
  }

  const oldBalance = state.balance;
  state.balance -= total;
  state.confirmed = Object.entries(state.pending).map(([key,amount])=>({key,amount}));
  state.pending = {};

  updatePending();
  animateBalance(state.balance);
  toast('Selections confirmed');
}

function startRound() {
  state.timer = 35;
  state.locked = false;
  state.pending = {};
  state.confirmed = [];

  document.querySelector('#round').textContent = state.round;
  document.querySelector('#pulseResult').textContent = '0';
  document.querySelector('#bladeResult').textContent = '0';

  document.querySelectorAll('.fighter').forEach(el=>{
    el.classList.remove('winner-fighter','loser-fighter','tie-fighter');
  });

  document.querySelectorAll('.fighter-name').forEach(el=>el.classList.remove('hidden'));
  document.querySelectorAll('.result-card,.winner-label').forEach(el=>el.classList.add('hidden'));

  document.querySelector('#arenaStatus').textContent = 'PULSE VS BLADE';
  document.querySelector('#winnerResult').textContent = 'Choose your prediction';
  document.querySelector('#parityResult').textContent = 'Choose your prediction';
  document.querySelector('#numberResult').textContent = 'Choose a number from 0 to 9';

  updatePending();

  clearInterval(window.roundClock);

  window.roundClock = setInterval(()=>{
    state.timer--;
    document.querySelector('#timer').textContent = '00:'+String(state.timer).padStart(2,'0');

    if(state.timer<=0) {
      clearInterval(window.roundClock);
      finishRound();
    }
  },1000);
}

function finishRound() {
  state.locked = true;
  updatePending();

  document.querySelector('#timer').textContent = '00:00';
  document.querySelector('#arenaStatus').textContent = 'REVEALING RESULTS';

  const pulse = Math.floor(Math.random()*10);
  const blade = Math.floor(Math.random()*10);
  const winner = pulse>blade?'PULSE':blade>pulse?'BLADE':'TIE';
  const higher = Math.max(pulse,blade);
  const parity = higher%2===0?'EVEN':'ODD';

  document.querySelector('#pulseResult').textContent = String(pulse);
  document.querySelector('#bladeResult').textContent = String(blade);

  document.querySelectorAll('.fighter-name').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('.result-card').forEach(el=>el.classList.remove('hidden'));

  if(winner==='PULSE') {
    document.querySelector('#pulseFighter').classList.add('winner-fighter');
    document.querySelector('#bladeFighter').classList.add('loser-fighter');
    document.querySelector('#pulseWinner').classList.remove('hidden');
  } else if(winner==='BLADE') {
    document.querySelector('#bladeFighter').classList.add('winner-fighter');
    document.querySelector('#pulseFighter').classList.add('loser-fighter');
    document.querySelector('#bladeWinner').classList.remove('hidden');
  } else {
    document.querySelectorAll('.fighter').forEach(el=>el.classList.add('tie-fighter'));
    document.querySelector('#arenaStatus').textContent = 'ROUND TIED';
  }

  document.querySelector('#winnerResult').textContent = `${winner} · ${pulse} : ${blade}`;
  document.querySelector('#parityResult').textContent = `${parity} · Higher number ${higher}`;
  document.querySelector('#numberResult').textContent = `Revealed numbers: ${pulse} and ${blade}`;

  if(winner!=='TIE') {
    document.querySelector('#arenaStatus').textContent = `${winner} WINS`;
  }

  let payout = 0;
  let wins = 0;

  state.confirmed.forEach(b=>{
    const [market,choice] = b.key.split(':');
    let won = false;

    if(market==='winner') {
      if(winner==='TIE') {
        payout += b.amount;
        won = true;
      } else if(choice===winner) {
        payout += b.amount*2;
        won = true;
      }
    }

    if(market==='parity' && choice===parity) {
      payout += b.amount*2;
      won = true;
    }

    if(market==='number' && (Number(choice)===pulse || Number(choice)===blade)) {
      payout += b.amount*9;
      won = true;
    }

    if(won) wins++;
  });

  if(payout>0) {
    const oldBalance = state.balance;
    state.balance += payout;
    animateBalance(state.balance);
    toast(`${wins} winning selection(s) · +${fmt(payout)}`);

    const wallet = document.querySelector('.wallet');
    wallet.classList.add('wallet-win');
    setTimeout(()=>wallet.classList.remove('wallet-win'),1200);
  } else if(state.confirmed.length) {
    toast('Round settled');
  }

  state.history.unshift({round:state.round,pulse,blade,winner});
  state.history = state.history.slice(0,8);
  updateHistory();

  setTimeout(()=>{
    state.round++;
    startRound();
  },6000);
}

function updateHistory() {
  const el = document.querySelector('#historyList');

  if(!state.history.length) {
    el.textContent = 'No completed rounds yet.';
    return;
  }

  el.innerHTML = state.history.map(r=>`
    <div class="history-row">
      <span>ROUND #${r.round}</span>
      <span class="history-score">${r.pulse} : ${r.blade}</span>
      <b class="${r.winner==='PULSE'?'blue-text':r.winner==='BLADE'?'red-text':'tie-text'}">${r.winner}</b>
    </div>
  `).join('');
}

render();
startRound();
