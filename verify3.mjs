import fs from 'fs';
const potJs=fs.readFileSync('pot-data.js','utf8');
const main=fs.readFileSync('_main.js','utf8');
const store={};
function el(id){if(!store[id])store[id]={id,value:0,textContent:'',innerHTML:'',style:{},checked:false,
 classList:{add(){},remove(){},toggle(){},contains:()=>false},appendChild(){},remove(){},click(){},
 addEventListener(){},querySelectorAll:()=>[],contains:()=>false,closest:()=>null,
 getContext:()=>null,width:0,height:0,dataset:{},getAttribute:()=>null,open:false};
 return store[id];}
globalThis.document={getElementById:id=>el(id),createElement:()=>el('_n'+Math.random()),
 addEventListener(){},querySelectorAll:()=>[]};
globalThis.window=globalThis;globalThis.Image=class{constructor(){this.width=0;this.height=0}};
globalThis.Blob=class{};globalThis.FileReader=class{readAsArrayBuffer(){}};
globalThis.alert=m=>{throw new Error('ALERT: '+m)};
const api=new Function(potJs+"\n"+main+"\n;return{state,pot,potFlat,addPotByKey,render,clearPots};")();

// 捕获 renderPots 生成的 HTML
let html='';
const origRender=api.render;
api.render=()=>{origRender();html=store['potRows'].innerHTML;};

console.log('=== 1. 初始（空池）：折叠标题应全部 open=false ===');
api.render();
const details=[...html.matchAll(/<details[^>]*data-spec="([^"]+)"([^>]*)>/g)];
console.log('  分组数:', details.length);
details.forEach(d=>console.log(`   ${d[1].padEnd(8)} open属性:${d[2].trim()||'无（收起）'}`));
const bodies=(html.match(/potGroupBody/g)||[]).length;
console.log('  折叠体数量:', bodies, '（内容已渲染但 CSS 隐藏）');

console.log('\n=== 2. 标题行信息（不展开也能看到）===');
[...html.matchAll(/<summary>(.*?)<\/summary>/g)].forEach(m=>{
  const t=m[1].replace(/<[^>]+>/g,'|').replace(/\|+/g,' | ').trim();
  console.log('  '+t);
});

console.log('\n=== 3. 展开 42 鸳鸯（模拟 toggle）→ 选一个 → 应自动收起 ===');
api.addPotByKey('42|鸳鸯锅42cm（大） · 红汤＋番茄');
console.log('  加入后 potOpenSpecs 应不含 42');
console.log('  候选池:', api.state.pots.length, '｜平均成本 ¥'+api.pot().base.toFixed(4));
const d2=[...html.matchAll(/data-spec="42"([^>]*)>/g)];
console.log('  42 组 open属性:', d2[0] ? (d2[0][1].trim()||'无（已收起）') : '该组已消失(全部加完?)');

console.log('\n=== 4. 该组剩余数量应减少 ===');
[...html.matchAll(/<summary>.*?剩 (\d+) 种.*?<\/summary>/g)].forEach((m,i)=>{
  const nm=[...html.matchAll(/<summary><span class="pgName">([^<]+)/g)][i];
  console.log(`  ${nm?nm[1]:'?'} → 剩 ${m[1]} 种`);
});

console.log('\n=== 5. ⚠ 低于建议售价的条目应高亮为 warn ===');
console.log('  warn 标记条目数:', (html.match(/potChip warn/g)||[]).length);
console.log('  ⚠低于建议 提示数:', (html.match(/⚠低于建议/g)||[]).length);

console.log('\n=== 6. 清空后全部收起 ===');
api.clearPots();
console.log('  候选池:', api.state.pots.length);
