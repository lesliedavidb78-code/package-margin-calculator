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

const D=sb.document.getElementById;
// 极端压测：超长套餐名 + 超长菜品名 + 全部 62 锅底
D('packName').value='相聚重庆四人餐（地道重庆味·重庆牛油红汤锅底搭配时令鲜蔬与手打虾滑超值四人套餐限量特惠）';
D('packSale').value=198; D('people').value=4;
sb.clearPots();
sb.loadAllSpecs();   // 62 个全部入池
// 改一个超长菜品名
sb.state0=null;
const rows=el('groups').innerHTML;

console.log('场景：超长套餐名 + 62 锅底全入池');
sb.exportCompactPng();
const texts=[...svgOut.matchAll(/<text x="(\d+)" y="(\d+)"[^>]*text-anchor="(\w+)"[^>]*font-size="(\d+)"[^>]*>(.*?)<\/text>/g)]
  .map(m=>({x:+m[1],y:+m[2],a:m[3],size:+m[4],t:m[5]}));
const W=(t,sz)=>[...t].reduce((a,c)=>a+(/[\u2E80-\uFFFF]/.test(c)?1:0.56),0)*sz*0.5;
const x0=o=>{const w=W(o.t,o.size);return o.a==='end'?o.x-w:o.a==='middle'?o.x-w/2:o.x;};
const x1=o=>{const w=W(o.t,o.size);return o.a==='end'?o.x:o.a==='middle'?o.x+w/2:o.x+w;};

const byRow={}; texts.forEach(o=>{(byRow[o.y]=byRow[o.y]||[]).push(o);});
let ov=0, worst=0;
for(const arr of Object.values(byRow)){
  const b=arr.slice().sort((a,c)=>x0(a)-x0(c));
  for(let i=1;i<b.length;i++){const d=x0(b[i])-(x1(b[i-1]));if(d<-0.5){ov++;worst=Math.min(worst,d);}}
}
console.log('  文本节点:', texts.length);
console.log('  重叠处数:', ov, ov?'（最严重 '+worst.toFixed(1)+'px）':'✅');
const over=texts.filter(o=>x1(o)>1160||x0(o)<40);
console.log('  越界处数:', over.length, over.length?'⚠':'✅');
if(over.length) over.slice(0,5).forEach(o=>console.log(`    x:[${x0(o).toFixed(0)},${x1(o).toFixed(0)}] ${o.t.slice(0,40)}`));
const ell=[...svgOut.matchAll(/>([^<]*…)<\/text>/g)].map(m=>m[1]);
console.log('  截断条数:', ell.length);
ell.slice(0,5).forEach(t=>console.log('    '+t));
// SVG 完整性
console.log('  SVG 结构:', svgOut.startsWith('<svg')&&svgOut.endsWith('</svg>')?'✅ 完整':'❌ 破损');
console.log('  图片高度:', svgOut.match(/height="(\d+)"/)?.[1], 'px');
