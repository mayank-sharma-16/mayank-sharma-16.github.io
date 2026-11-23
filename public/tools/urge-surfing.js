const KEY="urge-surfing-sessions";
const DEFAULT_MINUTES=15;
const TASKS=[
  "Take five slow breaths. Notice where the urge is strongest in your body.",
  "Drink some water and pay attention to each sip.",
  "Walk slowly for a few minutes. Notice your surroundings.",
  "Name five things you can see, four you can touch, three you can hear.",
  "Relax your jaw and shoulders. Notice whether the urge changes.",
  "Remind yourself: an urge is a wave. You do not have to act on it.",
  "Change your physical location for a few minutes.",
  "Notice the urge without judging it. Is it rising, falling, or staying still?",
  "Stretch for two minutes and keep observing the sensation.",
  "Put some distance between yourself and whatever you would normally use to act on the urge."
];

let session=null,timer=null,remaining=DEFAULT_MINUTES*60,running=false;

const $=id=>document.getElementById(id);
const sessions=()=>JSON.parse(localStorage.getItem(KEY)||"[]");
const saveSessions=x=>localStorage.setItem(KEY,JSON.stringify(x));

function newSession(){
  session={id:crypto.randomUUID(),startedAt:new Date().toISOString(),duration:DEFAULT_MINUTES*60,ratings:[],note:"",endedAt:null};
  remaining=session.duration;running=false;
  updateUI();showTask();
}

function formatTime(s){
  s=Math.max(0,s);
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

function updateUI(){
  $("timer").textContent=formatTime(remaining);
  const elapsed=session?session.duration-remaining:0;
  $("progress").style.width=session?`${Math.min(100,elapsed/session.duration*100)}%`:"0%";
  $("lastRating").textContent=session?.ratings.length?`Last: ${session.ratings.at(-1).value}/10`:"No rating yet";
  $("ratingCount").textContent=`${session?.ratings.length||0} rating${session?.ratings.length===1?"":"s"}`;
  $("pauseBtn").textContent=running?"Pause":"Resume";
  drawChart();
}

function start(){
  if(!session)newSession();
  if(running)return;

  running=true;
  clearInterval(timer);

  timer=setInterval(()=>{
    if(remaining<=0){
      finish();
      return;
    }

    remaining--;
    updateUI();
  },1000);

  updateUI();
}

function pause(){
  if(!session)return;

  if(running){
    running=false;
    clearInterval(timer);
    timer=null;
  }else{
    start();
  }

  updateUI();
}


function addTime(){
  if(!session)newSession();
  remaining+=300;
  session.duration+=300;
  updateUI();
}

function finish(){
  clearInterval(timer);running=false;
  if(!session)return;
  session.note=$("note").value.trim();
  session.endedAt=new Date().toISOString();
  const all=sessions();
  all.unshift(session);
  saveSessions(all);
  alert("Session saved locally.");
  updateUI();
}

function rate(value){
  if(!session)newSession();
  const elapsed=session.duration-remaining;
  session.ratings.push({value,time:new Date().toISOString(),elapsed});
  $("lastRating").textContent=`Last: ${value}/10`;
  updateUI();
  showTask();
}

function showTask(){
  $("task").textContent=TASKS[Math.floor(Math.random()*TASKS.length)];
}

function drawChart(){
  const canvas=$("urgeChart"),ctx=canvas.getContext("2d");
  const rect=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;
  canvas.width=rect.width*dpr;canvas.height=260*dpr;
  ctx.scale(dpr,dpr);
  const w=rect.width,h=260,p={l:35,r:15,t:15,b:30};
  ctx.strokeStyle="#ddd";ctx.lineWidth=1;
  for(let i=0;i<=10;i++){
    const y=h-p.b-(i/10)*(h-p.t-p.b);
    ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.stroke();
    ctx.fillStyle="#777";ctx.font="11px system-ui";ctx.fillText(i,p.l-22,y+4);
  }
  if(!session?.ratings.length)return;
  const ratings=session.ratings;
  const maxTime=Math.max(session.duration,...ratings.map(x=>x.elapsed),1);
  ctx.strokeStyle="#315c8a";ctx.lineWidth=3;ctx.beginPath();
  ratings.forEach((r,i)=>{
    const x=p.l+(r.elapsed/maxTime)*(w-p.l-p.r);
    const y=h-p.b-(r.value/10)*(h-p.t-p.b);
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.stroke();
  ratings.forEach(r=>{
    const x=p.l+(r.elapsed/maxTime)*(w-p.l-p.r);
    const y=h-p.b-(r.value/10)*(h-p.t-p.b);
    ctx.fillStyle="#315c8a";ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
  });
  ctx.fillStyle="#777";ctx.font="11px system-ui";
  ctx.fillText("time",w-35,h-8);
}

function openHistory(){
  const list=sessions();
  $("history").innerHTML=list.length?list.map((s,i)=>`
    <div class="session">
      <strong>${new Date(s.startedAt).toLocaleString()}</strong>
      <span>${s.ratings.length} ratings · ${Math.round(s.duration/60)} minutes</span>
      <div class="session-actions">
        <button onclick="exportSession(${i})">Export</button>
        <button onclick="deleteSession(${i})">Delete</button>
      </div>
    </div>
  `).join(""):"<div class=\"session\">No saved sessions.</div>";
  $("historyModal").classList.add("open");
}

function exportSession(index){
  const s=sessions()[index];
  printSessions([s]);
}

function exportAll(){
  printSessions(sessions());
}

function printSessions(list){
  if(!list.length){alert("No saved sessions.");return}
  const win=open("","_blank");
  if(!win){alert("Please allow pop-ups to export.");return}
  win.document.write(`
    <!doctype html><html><head><title>Urge Surfing Sessions</title>
    <style>body{font:13px system-ui;padding:30px;color:#111}section{break-inside:avoid;margin-bottom:35px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px;border-bottom:1px solid #ddd}</style>
    </head><body>
    ${list.map(s=>`
      <section>
        <h1>Urge Surfing Session</h1>
        <p><strong>Started:</strong> ${new Date(s.startedAt).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${Math.round(s.duration/60)} minutes</p>
        ${s.note?`<p><strong>Reflection:</strong> ${esc(s.note)}</p>`:""}
        <table><thead><tr><th>Time</th><th>Elapsed</th><th>Urge</th></tr></thead>
        <tbody>${s.ratings.map(r=>`<tr><td>${new Date(r.time).toLocaleTimeString()}</td><td>${formatTime(r.elapsed)}</td><td>${r.value}/10</td></tr>`).join("")}</tbody></table>
      </section>
    `).join("")}
    </body></html>
  `);
  win.document.close();win.focus();win.onload=()=>win.print();
}

function deleteSession(i){
  if(!confirm("Delete this saved session?"))return;
  const list=sessions();list.splice(i,1);saveSessions(list);openHistory();
}

function esc(v){
  return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

$("ratingButtons").innerHTML=[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-rating="${n}">${n}</button>`).join("");
$("ratingButtons").onclick=e=>{
  const n=e.target.dataset.rating;
  if(n)rate(Number(n));
};
$("startBtn").onclick=start;
$("pauseBtn").onclick=pause;
$("add5Btn").onclick=addTime;
$("endBtn").onclick=finish;
$("newBtn").onclick=()=>{
  if(session?.ratings.length&&!confirm("Start a new session? The current unsaved session will be discarded."))return;
  newSession();
};
$("historyBtn").onclick=openHistory;
$("nextTaskBtn").onclick=showTask;
$("exportAllBtn").onclick=exportAll;
$("note").oninput=()=>{if(session)session.note=$("note").value};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).classList.remove("open"));
window.onresize=drawChart;

newSession();
showTask();
