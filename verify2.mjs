import fs from 'fs';
const potJs = fs.readFileSync('pot-data.js','utf8');
const main  = fs.readFileSync('_main.js','utf8');
const store={};
function el(id){if(!store[id])store[id]={id,value:0,textContent:'',innerHTML:'',style:{},checked:false,
 classList:{add(){},remove(){},toggle(){}},appendChild(){},remove(){},click(){},addEventListener(){},
 querySelectorAll:()=>[],contains:()=>false,closest:()=>null,getContext:()=>null,width:0,height:0,dataset:{}};
 return store[id];}
globalThis.document={getElementById:id=>el(id),createElement:()=>el('_n'+Math.random()),addEventListener(){},querySelectorAll:()=>[]};
globalThis.window=globalThis; globalThis.Image=class{constructor(){this.width=0;this.height=0}};
globalThis.Blob=class{}; globalThis.FileReader=class{readAsArrayBuffer(){}};
globalThis.alert=m=>{throw new Error('ALERT: '+m)};
const api=new Function(potJs+"\n"+main+"\n;return{state,pot,potFlat,potSearch,addPotByKey,addPotFromCombo,clearPots,loadAllSpecs,specTitle,POT_ORDER,render};")();

console.log('=== 1. 初始状态 ===');
console.log('  候选池:', api.state.pots.length, '个（应为 0，不再默认预载）');
console.log('  锅底库总数:', api.potFlat().length, '种');

console.log('\n=== 2. 模拟九思的操作：先 42 鸳鸯，再加 38 鸳鸯 ===');
const addByName = n => { const p=api.potFlat().find(x=>x.name===n); if(!p) throw new Error('not found '+n);
  api.addPotByKey(p.spec+'|'+p.name); return p; };
let p=addByName('鸳鸯锅42cm（大） · 红汤＋番茄');
console.log(`  ① 加入 ${p.name}`);
console.log(`     → 候选 ${api.state.pots.length}，成本 ¥${api.pot().base.toFixed(4)}，售价 ¥${api.pot().price}`);
p=addByName('鸳鸯锅38cm（小） · 红汤＋番茄');
console.log(`  ② 加入 ${p.name}`);
console.log(`     → 候选 ${api.state.pots.length}，成本 ¥${api.pot().base.toFixed(4)}，售价 ¥${api.pot().price}`);
const r=api.pot();
console.log('  ▸ 标题:', r.name);

console.log('\n=== 3. 再叠加奔驰锅（跨锅型）===');
p=addByName('奔驰锅38cm（小·三格） · 红汤＋酸汤＋番茄');
console.log(`  ③ 加入 ${p.name}`);
p=addByName('奔驰锅42cm（大·三格） · 红汤＋酸汤＋番茄');
console.log(`  ④ 加入 ${p.name}`);
const r2=api.pot();
console.log('  ▸ 标题:', r2.name);
console.log('    平均成本 ¥'+r2.base.toFixed(4),'| 跨',r2.specs,'种锅型');

console.log('\n=== 4. 搜索过滤 ===');
['奔驰','酸汤','山野','42cm 鸳鸯','红汤＋三鲜'].forEach(q=>{
  console.log(`  「${q}」→ ${api.potSearch(q).length} 种`);
});

console.log('\n=== 5. 去重（重复加入同一锅底）===');
const b=api.state.pots.length;
api.addPotByKey('benz38|奔驰锅38cm（小·三格） · 红汤＋酸汤＋番茄');
console.log(`  ${b} → ${api.state.pots.length}（应不变）`);

console.log('\n=== 6. 输入框模式（模拟打字后点「加入候选锅底」）===');
const hit=api.potSearch('奔驰锅42cm（大·三格） · 红汤＋酸汤');
console.log('  精确名命中:', hit.length===1 ? hit[0].name : '多结果('+hit.length+')');
if(hit.length===1){ api.addPotByKey(hit[0].spec+'|'+hit[0].name);
  console.log('  → 加入成功，候选', api.state.pots.length); }

console.log('\n=== 7. 删除与清空 ===');
api.state.pots.pop();
console.log('  删 1 个后:', api.state.pots.length);
api.clearPots();
console.log('  清空后:', api.state.pots.length, '｜pot() 安全返回:', typeof api.pot().base==='number');
api.loadAllSpecs();
console.log('  批量载入全部 →', api.state.pots.length, '种 /', new Set(api.state.pots.map(x=>x.spec)).size, '型');
