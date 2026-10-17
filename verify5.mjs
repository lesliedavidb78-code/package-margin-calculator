import fs from 'fs';
// 用 vm 在同一上下文执行，模拟浏览器真实单作用域
import vm from 'vm';
const potJs=fs.readFileSync('pot-data.js','utf8'), main=fs.readFileSync('_main.js','utf8');
const store={};
function el(id){if(!store[id])store[id]={id,value:0,textContent:'',innerHTML:'',style:{},checked:false,
 classList:{add(){},remove(){},toggle(){},contains:()=>false},appendChild(){},remove(){},click(){},
 addEventListener(){},querySelectorAll:()=>[],contains:()=>false,closest:()=>null,
 getContext:()=>null,width:0,height:0,dataset:{},getAttribute:()=>null,open:false};return store[id];}
const sandbox={document:{getElementById:id=>el(id),createElement:()=>el('_n'+Math.random()),addEventListener(){},querySelectorAll:()=>[]},
 console,alert:m=>{throw new Error('ALERT '+m)},structuredClone,Math,Date,Number,String,Array,Object,JSON,Set,Map,isFinite,parseFloat,parseInt};
sandbox.window=sandbox; sandbox.Image=class{constructor(){this.width=0;this.height=0}};
sandbox.Blob=class{}; sandbox.FileReader=class{readAsArrayBuffer(){}};
vm.createContext(sandbox);
vm.runInContext(potJs+"\n"+main, sandbox);
sandbox.__api = ()=>({state:sandbox.state,pot:sandbox.pot,expandAllPotGroups:sandbox.expandAllPotGroups,
  collapseAllPotGroups:sandbox.collapseAllPotGroups,addPotByKey:sandbox.addPotByKey,
  potOpenSpecs:()=>sandbox.potOpenSpecs, potFlat:()=>sandbox.potFlat()});

const api=sandbox.__api();
const openSpecs=()=>[...store['potRows'].innerHTML.matchAll(/data-spec="([^"]+)" open/g)].map(m=>m[1]);

console.log('=== 1. 初始状态 ===');
console.log('  potOpenSpecs:', JSON.stringify(api.potOpenSpecs()));
console.log('  展开组数:', openSpecs().length, '（应 0）');

console.log('\n=== 2. 「展开全部」===');
api.expandAllPotGroups();
console.log('  potOpenSpecs:', JSON.stringify(api.potOpenSpecs()));
console.log('  展开组数:', openSpecs().length, '（应 6）');

console.log('\n=== 3. 连续跨锅型添加 —— 展开状态必须保持 ===');
[['42','鸳鸯锅42cm（大） · 红汤＋番茄'],['38','鸳鸯锅38cm（小） · 红汤＋番茄'],
 ['benz38','奔驰锅38cm（小·三格） · 红汤＋酸汤＋番茄'],['benz42','奔驰锅42cm（大·三格） · 红汤＋酸汤＋番茄']
].forEach(([sp,n],i)=>{
  api.addPotByKey(sp+'|'+n);
  const o=openSpecs();
  console.log(`  加第${i+1}个 ${n.slice(0,20).padEnd(22)} → 仍展开 ${o.length} 组 ${o.includes(sp)?'✓ 保持':'✗ 丢失'}`);
});

console.log('\n=== 4. 「收起全部」===');
api.collapseAllPotGroups();
console.log("  展开组数:", openSpecs().length, "（应 0）");
console.log("  候选池保留的锅底行:", (store['potRows'].innerHTML.match(/class="potrow"/g)||[]).length);

console.log('\n=== 5. 收起后核算正常 ===');
console.log('  候选池标题:', store['potCount'].textContent);
console.log('  平均成本:', store['avgCost'].textContent);
