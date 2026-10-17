import fs from 'fs';
const potJs = fs.readFileSync('pot-data.js','utf8');
const main  = fs.readFileSync('_main.js','utf8');
const store={};
function el(id){
  if(!store[id]) store[id]={id,value:0,textContent:'',innerHTML:'',style:{},checked:false,
    classList:{add(){},remove(){},toggle(){}},appendChild(){},remove(){},click(){},
    addEventListener(){},querySelectorAll:()=>[],contains:()=>false,closest:()=>null,
    getContext:()=>null,width:0,height:0,dataset:{}};
  return store[id];
}
globalThis.document={
  getElementById:id=>el(id),
  createElement:()=>el('_new'+Math.random()),
  addEventListener(){},
  querySelectorAll:()=>[],
};
globalThis.window=globalThis;
globalThis.Image=class{constructor(){this.width=0;this.height=0;}};
globalThis.Blob=class{};globalThis.FileReader=class{readAsArrayBuffer(){}};
const api=new Function(potJs+"\n"+main+"\n;return{state,pot,loadSpec,specTitle,POTDATA,allSpecKeys};")();

console.log('=== 1. 各锅型组合数 ===');
let tot=0;
for(const k of api.allSpecKeys()){const d=api.POTDATA[k];tot+=d.rows.length;
  console.log(`  ${k.padEnd(8)} ${api.specTitle(k).padEnd(20)} ${String(d.rows.length).padStart(2)} 组合`);}
console.log('  ── 合计', tot, '组合');

console.log('\n=== 2. 跨锅型同时选用（核心需求）===');
const show=t=>{const s=new Set(api.state.pots.map(x=>x.spec));
  console.log(`  ${t.padEnd(22)} → 候选 ${String(api.state.pots.length).padStart(2)} 个，锅型 ${s.size} 种`);};
api.loadSpec('38');   show('载入 38 鸳鸯');
api.loadSpec('42');   show('＋42 鸳鸯');
api.loadSpec('benz38');show('＋38 奔驰');
api.loadSpec('benz42');show('＋42 奔驰');
api.loadSpec('wildyy');show('＋山野风鸳鸯');
const p=api.pot();
console.log('  ▸ 同池核算：', p.name);
console.log('    平均成本 ¥'+p.base.toFixed(4),'| 最高售价 ¥'+p.price,'| 跨',p.specs,'种锅型');

console.log('\n=== 3. 去重（重复载入同一锅型）===');
const b=api.state.pots.length;
api.loadSpec('38');api.loadSpec('benz38');api.loadSpec('38');
console.log(`  ${b} → ${api.state.pots.length}（应不变）`);

console.log('\n=== 4. 清空 + 全锅型汇总 ===');
api.state.pots=[];api.state.loaded=[];
api.loadSpec('__all__');
show('载入全部锅型');

console.log('\n=== 5. 成本卡口径校验 ===');
const r1=api.POTDATA['38'].rows.find(r=>r.name.includes('红汤＋三鲜'));
console.log(`  38鸳鸯 红汤＋三鲜 = ¥${r1.cost.toFixed(4)}  (27.6129+3.8351=31.4480) 售价 ${r1.price} 卡建议 ${r1.card}`);
const r2=api.POTDATA['benz42'].rows.find(r=>r.name.includes('酸汤＋番茄'));
console.log(`  ${r2.name} = ¥${r2.cost.toFixed(4)} 售价 ${r2.price} 卡建议 ${r2.card}`);
const r3=api.POTDATA['benz38'].rows.find(r=>r.name.includes('酸汤＋番茄'));
console.log(`  ${r3.name} = ¥${r3.cost.toFixed(4)} 售价 ${r3.price} 卡建议 ${r3.card}`);

console.log('\n=== 6. 售价低于成本卡建议的组合（真实经营预警）===');
let warn=0;
for(const k of api.allSpecKeys())for(const r of api.POTDATA[k].rows)
  if(r.price<r.card){warn++;
    if(warn<=6)console.log(`  ${api.specTitle(k)} | ${r.name} 售价${r.price} < 建议${r.card}`);}
console.log(`  共 ${warn} / ${tot} 个组合售价低于成本卡建议售价`);
