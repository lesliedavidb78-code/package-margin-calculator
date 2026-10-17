import fs from 'fs';
const potJs=fs.readFileSync('pot-data.js','utf8'), main=fs.readFileSync('_main.js','utf8');
const store={};
function el(id){if(!store[id])store[id]={id,value:0,textContent:'',innerHTML:'',style:{},checked:false,
 classList:{add(){},remove(){},toggle(){},contains:()=>false},appendChild(){},remove(){},click(){},
 addEventListener(){},querySelectorAll:()=>[],contains:()=>false,closest:()=>null,
 getContext:()=>null,width:0,height:0,dataset:{},getAttribute:()=>null,open:false};return store[id];}
globalThis.document={getElementById:id=>el(id),createElement:()=>el('_n'+Math.random()),addEventListener(){},querySelectorAll:()=>[]};
globalThis.window=globalThis;globalThis.Image=class{constructor(){this.width=0;this.height=0}};
globalThis.Blob=class{};globalThis.FileReader=class{readAsArrayBuffer(){}};
globalThis.alert=m=>{throw new Error('ALERT: '+m)};
const api=new Function(potJs+"\n"+main+"\n;return{state,pot,addPotByKey,render,clearPots,expandAllPotGroups,collapseAllPotGroups};")();
let html=''; const orig=api.render;
api.render=()=>{orig();html=store['potRows'].innerHTML;};
const openSpecs=()=>[...html.matchAll(/data-spec="([^"]+)" open/g)].map(m=>m[1]);
const hasBtns=()=>({展开:(html.match(/展开全部/g)||[]).length,收起:(html.match(/收起全部/g)||[]).length});

console.log('=== 1. 初始：全部收起 + 两个按钮都在 ===');
api.render();
console.log('  展开的组:', openSpecs().length, '（应为 0）');
console.log('  按钮:', JSON.stringify(hasBtns()));

console.log('\n=== 2. 点「展开全部」→ 6 组全开 ===');
api.expandAllPotGroups();
console.log('  展开的组:', openSpecs().join(', '));

console.log('\n=== 3. 连续跨锅型添加，展开状态应保持（核心）===');
[['42','鸳鸯锅42cm（大） · 红汤＋番茄'],
 ['38','鸳鸯锅38cm（小） · 红汤＋番茄'],
 ['benz38','奔驰锅38cm（小·三格） · 红汤＋酸汤＋番茄'],
 ['benz42','奔驰锅42cm（大·三格） · 红汤＋酸汤＋番茄']
].forEach(([sp,n],i)=>{
  api.addPotByKey(sp+'|'+n);
  const o=openSpecs();
  console.log(`  ①${'②③④⑤⑥⑦⑧'[i]} 加 ${n.slice(0,22).padEnd(24)} → 仍展开 ${o.length} 组 ${o.includes(sp)?'✓':'✗'}`);
});
console.log('  ▸ 候选池', api.state.pots.length, '个｜平均成本 ¥'+api.pot().base.toFixed(4));
console.log('  ▸', api.pot().name);

console.log('\n=== 4. 点「收起全部」→ 全部收起 ===');
api.collapseAllPotGroups();
console.log('  展开的组:', openSpecs().length, '（应为 0）');
console.log('  候选池仍在:', api.state.pots.length, '（收起不影响已选）');

console.log('\n=== 5. 收起状态下候选池核算仍正常 ===');
console.log('  平均成本 ¥'+api.pot().base.toFixed(4), '| 跨', api.pot().specs, '型');

console.log('\n=== 6. 剩余数量实时递减 ===');
api.render();
[...html.matchAll(/<summary><span class="pgName">([^<]+)<\/span><span class="pgCount">剩 (\d+) 种/g)].forEach(m=>
  console.log(`  ${m[1].padEnd(20)} 剩 ${m[2]} 种`));
