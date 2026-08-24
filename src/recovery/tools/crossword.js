const SIZE=13;
const $=id=>document.getElementById(id);

let terms=[],puzzle=null;

function glossaryPath(){
  const parts=location.pathname.split("/").filter(Boolean);
  const section=parts[0]||"recovery";
  return `/${section}/glossary/manifest.json`;
}

async function loadGlossary(){
  const manifest=await fetch(glossaryPath()).then(r=>r.json());
  terms=(manifest.terms||[]).filter(x=>x.term&&x.clue);
  newPuzzle();
}

function cleanTerm(term){
  return term.toUpperCase().replace(/[^A-Z]/g,"");
}

function newPuzzle(){
  puzzle=generatePuzzle(terms);
  render();
}

function generatePuzzle(items){
  const candidates=items
    .map(item=>({...item,word:cleanTerm(item.term)}))
    .filter(x=>x.word.length>=2&&x.word.length<=SIZE);

  let best=null;

  for(let attempt=0;attempt<1000;attempt++){
    const grid=Array.from({length:SIZE},()=>Array(SIZE).fill(null));
    const entries=[];
    const shuffled=[...candidates].sort(()=>Math.random()-.5);

    // Start with a word near the middle.
    const first=shuffled.shift();
    const col=Math.floor((SIZE-first.word.length)/2);

    place(grid,first.word,Math.floor(SIZE/2),col,"across");
    entries.push({
      row:Math.floor(SIZE/2),
      col,
      dir:"across",
      word:first.word,
      item:first
    });

    // Repeatedly try to cross existing words.
    let changed=true;

    while(changed){
      changed=false;

      const remaining=shuffled.filter(
        item=>!entries.some(e=>e.word===item.word)
      );

      remaining.sort(
        ()=>Math.random()-.5
      );

      for(const item of remaining){
        const positions=findCrossings(
          grid,
          item.word,
          entries
        );

        if(!positions.length)continue;

        const pos=positions[
          Math.floor(Math.random()*positions.length)
        ];

        place(
          grid,
          item.word,
          pos.row,
          pos.col,
          pos.dir
        );

        entries.push({
          ...pos,
          word:item.word,
          item
        });

        changed=true;
      }
    }

    if(!best||entries.length>best.entries.length){
      numberEntries(entries);
      best={grid,entries};

      if(entries.length>=Math.min(12,candidates.length)){
        break;
      }
    }
  }

  return best||{
    grid:Array.from(
      {length:SIZE},
      ()=>Array(SIZE).fill(null)
    ),
    entries:[]
  };
}

function findCrossings(grid,word,entries){
  const out=[];
  const directions=["across","down"];

  for(const existing of entries){
    for(let i=0;i<word.length;i++){
      for(let j=0;j<existing.word.length;j++){
        if(word[i]!==existing.word[j])continue;

        const er=existing.row+
          (existing.dir==="down"?j:0);

        const ec=existing.col+
          (existing.dir==="across"?j:0);

        for(const dir of directions){
          // New word must run perpendicular.
          if(dir===existing.dir)continue;

          const row=er-
            (dir==="down"?i:0);

          const col=ec-
            (dir==="across"?i:0);

          if(canPlace(
            grid,
            word,
            row,
            col,
            dir
          )){
            out.push({
              row,
              col,
              dir
            });
          }
        }
      }
    }
  }

  return out;
}

function canPlace(grid,word,row,col,dir){
  const dr=dir==="down"?1:0;
  const dc=dir==="across"?1:0;

  const endRow=row+dr*(word.length-1);
  const endCol=col+dc*(word.length-1);

  if(
    row<0||
    col<0||
    endRow>=SIZE||
    endCol>=SIZE
  ){
    return false;
  }

  let crosses=false;

  for(let i=0;i<word.length;i++){
    const r=row+dr*i;
    const c=col+dc*i;
    const cell=grid[r][c];

    if(cell&&cell!==word[i]){
      return false;
    }

    if(cell===word[i]){
      crosses=true;
    }

    // Perpendicular neighbors are only allowed
    // when the current cell is an actual crossing.
    if(!cell){
      if(dir==="across"){
        if(
          grid[r-1]?.[c]||
          grid[r+1]?.[c]
        ){
          return false;
        }
      }else{
        if(
          grid[r]?.[c-1]||
          grid[r]?.[c+1]
        ){
          return false;
        }
      }
    }

    // The cells immediately before and after the
    // word must be empty. This prevents words like
    // VIAGRA + AMBIVALENCE from becoming one word.
    if(i===0){
      const beforeR=r-dr;
      const beforeC=c-dc;

      if(
        beforeR>=0&&
        beforeR<SIZE&&
        beforeC>=0&&
        beforeC<SIZE&&
        grid[beforeR][beforeC]
      ){
        return false;
      }
    }

    if(i===word.length-1){
      const afterR=r+dr;
      const afterC=c+dc;

      if(
        afterR>=0&&
        afterR<SIZE&&
        afterC>=0&&
        afterC<SIZE&&
        grid[afterR][afterC]
      ){
        return false;
      }
    }
  }

  return crosses;
}

function place(grid,word,row,col,dir){
  const dr=dir==="down"?1:0;
  const dc=dir==="across"?1:0;

  for(let i=0;i<word.length;i++){
    grid[row+dr*i][col+dc*i]=word[i];
  }
}

function numberEntries(entries){
  const starts=new Map();

  for(const entry of entries){
    const key=`${entry.row},${entry.col}`;

    if(!starts.has(key)){
      starts.set(key,starts.size+1);
    }

    entry.number=starts.get(key);
  }
}

function render(){
  renderGrid();
  renderClues();
  $("message").textContent="";
}

function renderGrid(){
  const grid=$("grid");
  grid.innerHTML="";
  grid.style.gridTemplateColumns=`repeat(${SIZE},1fr)`;

  const numbers=new Map(
    puzzle.entries.map(e=>[
      `${e.row},${e.col}`,
      e.number
    ])
  );

  puzzle.grid.forEach((row,r)=>{
    row.forEach((letter,c)=>{
      const cell=document.createElement("div");
      cell.className=`cell ${letter?"":"black"}`;

      if(!letter){
        grid.appendChild(cell);
        return;
      }

      const key=`${r},${c}`;

      if(numbers.has(key)){
        const number=document.createElement("span");
        number.className="number";
        number.textContent=numbers.get(key);
        cell.appendChild(number);
      }

      const input=document.createElement("input");
      input.maxLength=1;
      input.dataset.answer=letter;
      input.dataset.row=r;
      input.dataset.col=c;

      input.addEventListener("input",()=>{
        input.value=input.value.toUpperCase().replace(/[^A-Z]/g,"");

        updateEntryColors();

        if(input.value){
          moveNext(input);
        }

        checkComplete();
      });

      input.addEventListener("keydown",event=>{
        if(event.key==="Backspace"&&!input.value){
          event.preventDefault();
          movePrevious(input);
        }
      });

      input.addEventListener("focus",()=>{
        document
          .querySelectorAll(".cell")
          .forEach(cell=>cell.classList.remove("selected"));
        input.parentElement.classList.add("selected");
      });

      cell.appendChild(input);
      grid.appendChild(cell);
    });
  });
}

function getEntryAt(row,col){
  const entries=puzzle.entries.filter(entry=>{
    const r=entry.row+
      (entry.dir==="down"?0:0);

    const c=entry.col;

    for(let i=0;i<entry.word.length;i++){
      const er=entry.row+
        (entry.dir==="down"?i:0);

      const ec=entry.col+
        (entry.dir==="across"?i:0);

      if(er===row&&ec===col){
        return true;
      }
    }

    return false;
  });

  // If both directions are possible,
  // horizontal wins.
  return (
    entries.find(e=>e.dir==="across") ||
    entries.find(e=>e.dir==="down") ||
    null
  );
}

function getInputAt(row,col){
  return document.querySelector(
    `.cell input[data-row="${row}"][data-col="${col}"]`
  );
}

function moveNext(input){
  const row=Number(input.dataset.row);
  const col=Number(input.dataset.col);

  const entry=getEntryAt(row,col);

  if(!entry)return;

  const dr=entry.dir==="down"?1:0;
  const dc=entry.dir==="across"?1:0;

  const nextRow=row+dr;
  const nextCol=col+dc;

  const next=getInputAt(nextRow,nextCol);

  if(next){
    next.focus();
    next.select();
  }
}

function movePrevious(input){
  const row=Number(input.dataset.row);
  const col=Number(input.dataset.col);

  const entry=getEntryAt(row,col);

  if(!entry)return;

  const dr=entry.dir==="down"?1:0;
  const dc=entry.dir==="across"?1:0;

  const previousRow=row-dr;
  const previousCol=col-dc;

  const previous=getInputAt(
    previousRow,
    previousCol
  );

  if(previous){
    previous.focus();
    previous.select();
  }
}

function focusEntry(entry){
  const input=getInputAt(
    entry.row,
    entry.col
  );

  if(!input)return;

  document
    .querySelectorAll(".cell")
    .forEach(cell=>{
      cell.classList.remove("selected");
    });

  input.parentElement.classList.add("selected");
  input.focus();
  input.select();
}


function updateEntryColors(){
  document
    .querySelectorAll(".cell")
    .forEach(cell=>{
      cell.classList.remove(
        "correct",
        "wrong"
      );
    });

  for(const entry of puzzle.entries){
    let complete=true;
    let correct=true;

    for(let i=0;i<entry.word.length;i++){
      const r=entry.row+
        (entry.dir==="down"?i:0);

      const c=entry.col+
        (entry.dir==="across"?i:0);

      const input=document.querySelector(
        `.cell input[data-row="${r}"][data-col="${c}"]`
      );

      if(!input||!input.value){
        complete=false;
        break;
      }

      if(input.value!==input.dataset.answer){
        correct=false;
      }
    }

    if(complete){
      for(let i=0;i<entry.word.length;i++){
        const r=entry.row+
          (entry.dir==="down"?i:0);

        const c=entry.col+
          (entry.dir==="across"?i:0);

        const input=document.querySelector(
          `.cell input[data-row="${r}"][data-col="${c}"]`
        );

        input.parentElement.classList.add(
          correct?"correct":"wrong"
        );
      }
    }
  }
}

function renderClues(){
  const clues=$("clues");
  clues.innerHTML="";

  for(const [label,dir] of [
    ["Across","across"],
    ["Down","down"]
  ]){
    const list=puzzle.entries
      .filter(e=>e.dir===dir)
      .sort((a,b)=>a.number-b.number);

    if(!list.length)continue;

    const heading=document.createElement("h3");
    heading.textContent=label;
    clues.appendChild(heading);

    for(const entry of list){
      const div=document.createElement("div");
      div.className="clue";

      const number=document.createElement("button");
      number.textContent=entry.number;
      number.onclick=()=>focusEntry(entry);

      const text=document.createElement("div");
      text.className="clue-text";
      text.innerHTML=
        strikeTerm(
          entry.item.clue,
          entry.item.term
        );

      div.append(number,text);
      clues.appendChild(div);
    }
  }
}


function strikeTerm(clue,term){
  const escaped=esc(clue);
  const pattern=new RegExp(
    `(${escapeRegex(term)})`,
    "gi"
  );

  return escaped.replace(
    pattern,
    "<s>$1</s>"
  );
}

function checkComplete(){
  const inputs=[
    ...document.querySelectorAll(
      ".cell input"
    )
  ];

  if(
    inputs.length&&
    inputs.every(
      input=>input.value===input.dataset.answer
    )
  ){
    $("message").textContent=
      "Puzzle complete.";
  }
}

function escapeRegex(s){
  return s.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function esc(v){
  return String(v??"").replace(
    /[&<>"']/g,
    m=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[m])
  );
}

$("newPuzzle").onclick=newPuzzle;

loadGlossary().catch(err=>{
  console.error(err);
  $("message").textContent=
    "Could not load the glossary.";
});
