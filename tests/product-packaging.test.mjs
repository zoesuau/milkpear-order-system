import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import test from 'node:test';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const contracts=JSON.parse(readFileSync(new URL('./unchanged-contracts.json',import.meta.url),'utf8'));
const base={id:'g8',code:'G8',variety:'蔗香梨',grade:'8A',category:'一般禮盒',count:'6顆',price:1200,stock:80,active:true,sortOrder:1,shippingRule:'standard_3',productSeries:'禮盒版',imageUrl:'https://example.com/gift.png'};
const premium={...base,id:'p8',code:'P8',productSeries:'精裝版',price:1500,imageUrl:'https://example.com/premium.png'};
const grade9={...base,id:'g9',code:'G9',grade:'9A',price:1800};
function runtime(){
 const nodes=new Map(),inputs=[];
 const doc={readyState:'loading',addEventListener(){},querySelectorAll:s=>s==='.qty-input'?inputs:[],querySelector:()=>null,getElementById:id=>nodes.get(id)||null};
 const c=vm.createContext({document:doc,window:{ORDER_SYSTEM_CONFIG:{line:{},productId:'fixture',customerId:'sanheyuan',environment:'test'}},URL,console,sessionStorage:{getItem(){return null}},alert(){}});
 vm.runInContext(app,c);
 vm.runInContext('recordOrderFunnelEvent=()=>{}; scheduleOrderDraftSave=()=>{}; updateOrderSubmitAvailability=()=>{};',c);
 return {c,nodes,inputs};
}
function input(p,value=0){return {dataset:{id:p.id,code:p.code},value:String(value),getAttribute(k){return ({'data-id':p.id,'data-code':p.code,'data-price':String(p.price),'data-shipping-rule':p.shippingRule,'data-category':p.category,'data-stock':String(p.stock),'data-variety':p.variety,'data-level':p.grade,'data-count':p.count})[k]??null}};}
test('same grade packaging merges; other grades and sales categories remain separate',()=>{
 const {c}=runtime();const groups=c.groupPublicProductPackaging([base,premium,grade9,{...base,id:'pair',category:'兩粒禮盒',count:'2顆'}]);
 assert.deepEqual(JSON.parse(JSON.stringify(groups.map(g=>g.map(p=>p.id)))),[['g8','p8'],['g9'],['pair']]);
});
test('missing, unfamiliar and duplicate packaging metadata never hide SKUs or invent options',()=>{
 const {c}=runtime();const ps=[{...base,productSeries:''},{...premium,productSeries:''}];
 assert.equal(c.groupPublicProductPackaging(ps).length,2);
 assert.equal(c.groupPublicProductPackaging([base,{...premium,count:'8顆'}]).length,1,'packaging may carry its own count');
 assert.equal(c.groupPublicProductPackaging([base,{...base,id:'duplicate'},premium]).length,3);
 const html=c.renderPublicProductCard(ps.slice(0,1));assert.doesNotMatch(html,/<select/);
 assert.equal(c.groupPublicProductPackaging([{...base,productSeries:'Ｑ版'},premium]).length,2);
});
test('dropdown contains packaging labels only and every SKU keeps exactly one canonical quantity',()=>{
 const {c}=runtime();const html=c.renderPublicProductCard([base,premium]);
 assert.equal((html.match(/class="qty-input product-direct-input"/g)||[]).length,2);
 assert.match(html,/>禮盒版<\/option>/);assert.match(html,/>精裝版<\/option>/);
 assert.doesNotMatch(html,/<option[^>]*>[^<]*8A/);
 assert.match(html,/data-code="G8"/);assert.match(html,/data-code="P8"/);
});
test('switching packaging changes only visible pane; all quantities survive independently',()=>{
 const {c}=runtime();const panes=[{dataset:{productId:'g8'},hidden:false,value:2},{dataset:{productId:'p8'},hidden:true,value:1}];
 const card={dataset:{packagingGroup:c.getPublicPackagingGroupKey(base)},querySelectorAll:()=>panes};
 const select={value:'p8',closest:()=>card};c.selectPublicProductPackaging(select);
 assert.equal(panes[0].hidden,true);assert.equal(panes[1].hidden,false);assert.equal(panes[0].value,2);
 assert.match(c.renderPublicProductCard([base,premium]),/value="p8" selected/);
 select.value='g8';c.selectPublicProductPackaging(select);assert.equal(panes[0].hidden,false);assert.equal(panes[1].value,1);
 select.value='not-real';c.selectPublicProductPackaging(select);assert.equal(panes[0].hidden,false);
});
test('API normalization retains optional image/series and rejects unsafe image URLs',()=>{
 const {c}=runtime();assert.equal(c.normalizePublicCatalogProduct(premium).productSeries,'精裝版');
 assert.equal(c.normalizePublicCatalogProduct(premium).imageUrl,premium.imageUrl);
 for(const url of ['javascript:alert(1)','data:image/svg+xml,test','//other.example/a','http://example.com/a','https://user:pass@example.com/a','assets/../secret']) assert.equal(c.normalizePublicProductImageUrl(url),'');
 assert.equal(c.normalizePublicProductImageUrl('assets/test.png'),'assets/test.png');
 const html=c.renderPublicProductCard([{...base,productSeries:'<img src=x onerror=alert(1)>',imageUrl:''}]);assert.doesNotMatch(html,/<img src=x/);
});
test('image failure exposes neutral fallback without touching product controls',()=>{
 const {c}=runtime();const fallback={hidden:true},image={hidden:false,parentElement:{querySelector:()=>fallback}};
 c.handlePublicProductImageError(image);assert.equal(image.hidden,true);assert.equal(fallback.hidden,false);
});
test('both packaging quantities count once; original shipping, subtotal and draft codes remain correct',()=>{
 const {c,inputs,nodes}=runtime();const products=[base,premium];
 c.testProducts=products;vm.runInContext('PUBLIC_PRODUCT_CATALOG=testProducts;',c);
 inputs.push(input(base,2),input(premium,1));
 for(const id of ['subTotal','shippingFee','grandTotal','totalBoxes'])nodes.set(id,{innerText:''});
 c.calculate();assert.equal(nodes.get('subTotal').innerText,'3,900');assert.equal(nodes.get('shippingFee').innerText,'0');assert.equal(nodes.get('grandTotal').innerText,'3,900');assert.equal(nodes.get('totalBoxes').innerText,3);
 assert.deepEqual(JSON.parse(JSON.stringify(c.getSelectedQuantitiesByCode())),{G8:2,P8:1});
 assert.match(c.getProductDisplayLabel(premium),/精裝版/);
 inputs[0].value='0';c.calculate();assert.equal(nodes.get('grandTotal').innerText,'1,650');
});
test('existing stock and two-piece constraints remain, zero-stock variants stay off sale',()=>{
 const {c,inputs}=runtime();c.testProducts=[{...base,stock:2},{...premium,stock:0}];vm.runInContext('PUBLIC_PRODUCT_CATALOG=testProducts;',c);
 assert.equal(c.getActivePublicProducts().length,1);
 inputs.push(input({...base,stock:2}));c.syncAndCalculate('g8',9);assert.equal(inputs[0].value,2);
 assert.equal(c.getTwoPieceSelectionState([{category:'兩粒禮盒',qty:1}]).isComplete,false);
 assert.equal(c.getTwoPieceSelectionState([{category:'兩粒禮盒',qty:2}]).isComplete,true);
 assert.equal(c.calculateShippingFeeByAddress(3,'台北'),0);
 assert.equal(c.calculateShippingFeeByAddress(1,'台北'),150);
});
test('calculation, stock sync and order submission functions are unchanged from the baseline',()=>{
 const names=['calculate','syncAndCalculate','calculateShippingFeeByAddress','getTwoPieceSelectionState','getSelectedQuantitiesByCode','applySelectedQuantitiesByCode','submitOrder'];
 for(const name of names){const pattern=new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\n\\}`);assert.equal(createHash('sha256').update(app.match(pattern)?.[0]||'').digest('hex'),contracts.functions[name],name);}
});
