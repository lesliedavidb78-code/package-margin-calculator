import fs from 'fs'; import vm from 'vm';
const potJs=fs.readFileSync('pot-data.js','utf8'), main=fs.readFileSync('_main.js','utf8');
const store={};
function el(id){if(!store[id])store[id]={id,value:0,textContent:'',innerHTML:'',style:{},checked:false,
 classList:{add(){},remove(){},toggle(){},contains:()=>false},appendChild(){},remove(){},click(){},
 addEventListener(){},querySelectorAll:()=>[],contains:()=>false,closest:()=>null,
 getContext:()=>null,width:0,height:0,dataset:{},getAttribute:()=>null,open:false};return store[id];}
let svgOut='';
const sb={document:{getElementById:id=>el(id),createElement:t=>{
   if(t==='canvas')return{width:0,height:0,getContext:()=>({fillStyle:'',fillRect(){},drawImage(){}}),toDataURL:()=>'data:'};
   return el('_img');},addEventListener(){},querySelectorAll:()=>[]},
 console,alert:m=>{throw new Error('ALERT '+m)},structuredClone,Math,Date,Number,String,Array,Object,JSON,Set,Map,isFinite,parseFloat,parseInt,encodeURIComponent};
sb.window=sb; sb.Image=class{constructor(){this.width=0;this.height=0;}set src(v){svgOut=decodeURIComponent(v.split(',')[1]);if(this.onload)this.onload();}};
sb.Blob=class{}; sb.FileReader=class{readAsArrayBuffer(){}};
vm.createContext(sb); vm.runInContext(potJs+"\n"+main, sb);

// 复刻用户截图数据：相聚重庆四人餐
sb.document.getElementById('packName').value='相聚重庆四人餐（地道重庆味）';
sb.document.getElementById('packSale').value=198; sb.document.getElementById('people').value=4;
sb.clearPots();
[['38','鸳鸯锅38cm（小） · 红汤＋鸡汤'],['38','鸳鸯锅38cm（小） · 红汤＋番茄'],
 ['38','鸳鸯锅38cm（小） · 红汤＋菌汤'],['38','鸳鸯锅38cm（小） · 红汤＋三鲜']
].forEach(([sp,n])=>sb.addPotByKey(sp+'|'+n));

console.log('=== 导出 SVG，检查重叠 ===');
sb.exportCompactPng();
const texts=[...svgOut.matchAll(/<text x="(\d+)" y="(\d+)"[^>]*font-size="(\d+)"[^>]*>(.*?)<\/text>/g)]
  .map(m=>({x:+m[1],y:+m[2],size:+m[3],t:m[4]}));
console.log('  文本节点总数:', texts.length);

// 估算宽度（CJK=1, 半角=0.56）
const W=(t,sz)=>[...t].reduce((a,c)=>a+(/[\u2E80-\uFFFF]/.test(c)?1:0.56),0)*sz*0.5;

// 同一行重叠检测
const byRow={};
texts.forEach(o=>{(byRow[o.y]=byRow[o.y]||[]).push(o);});
let overlap=[];
for(const[y,arr] of Object.entries(byRow)){
  const boxes=arr.map(o=>{
    const w=W(o.t,o.size);
    const anchor=(svgOut.match(new RegExp(`<text x="${o.x}" y="${y}"[^>]*text-anchor="(\\w+)"`))||['',''])[1]||'start';
    const x0=anchor==='end'?o.x-w:anchor==='middle'?o.x-w/2:o.x;
    return {x0,x1:x0+w,t:o.t};
  }).sort((a,b)=>a.x0-b.x0);
  for(let i=1;i<boxes.length;i++)
    if(boxes[i].x0 < boxes[i-1].x1-0.5)
      overlap.push({y, a:boxes[i-1].t.slice(0,28), b:boxes[i].t.slice(0,28), over:+(boxes[i-1].x1-boxes[i].x0).toFixed(1)});
}
console.log('\n=== 重叠检测 ===');
if(!overlap.length) console.log('  ✅ 无任何重叠');
else overlap.slice(0,10).forEach(o=>console.log(`  ⚠ y=${o.y} 重叠 ${o.over}px: 「${o.a}」 ↔ 「${o.b}」`));

console.log('\n=== 溢出检测（超宽 1160）===');
const wide=texts.filter(o=>{const w=W(o.t,o.size);
  const anchor=(svgOut.match(new RegExp(`<text x="${o.x}" y="${o.y}"[^>]*text-anchor="(\\w+)"`))||['',''])[1]||'start';
  const x1=anchor==='end'?o.x:anchor==='middle'?o.x+w/2:o.x+w;
  return x1>1160;});
console.log(wide.length?'  ⚠ 溢出 '+wide.length+' 处':'  ✅ 无溢出');

console.log('\n=== 截断检查 ===');
const ell=[...svgOut.matchAll(/>([^<]*…)<\/text>/g)].map(m=>m[1]);
console.log('  带省略号:', ell.length, '条');
ell.slice(0,8).forEach(t=>console.log('   '+t));
