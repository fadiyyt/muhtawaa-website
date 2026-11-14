#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const api=require('../assets/js/tools/math-family.js');
const calc=api.calculate;
const normalize=value=>String(value).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[؜‎‏]/g,'').replace(/[٬,]/g,'').replace(/٫/g,'.');
const equal=(actual,expected,message)=>assert.equal(normalize(actual),normalize(expected),message);
for(const slug of Object.keys(api.tools)) assert.ok(api.tools[slug],`${slug} registered`);
{
 const s='percentage-adjustment';
 equal(calc(s,{base:'250',percent:'12',operation:'increase'})['القيمة بعد العملية'],'280');
 equal(calc(s,{base:'46',percent:'100',operation:'decrease'})['القيمة بعد العملية'],'0');
 equal(calc(s,{base:'0',percent:'0',operation:'increase'})['مقدار التغير'],'0');
 assert.throws(()=>calc(s,{base:'1',percent:'101',operation:'increase'}),/بين 0 و100/);
 assert.throws(()=>calc(s,{base:'-1',percent:'2',operation:'increase'}),/غير سالبة/);
 assert.throws(()=>calc(s,{base:'100',percent:'10',operation:'x'}),/زيادة أو نقصان/);
}
{
 const s='percent-of-number';
 equal(calc(s,{base:'240',percent:'15'})['النسبة من الرقم'],'36');
 equal(calc(s,{base:'80',percent:'2.5'})['الباقي بعد طرحها'],'78');
 equal(calc(s,{base:'50',percent:'200'})['النسبة من الرقم'],'100');
 equal(calc(s,{base:'-50',percent:'100'})['الباقي بعد طرحها'],'0');
 assert.throws(()=>calc(s,{base:'10',percent:'-1'}),/غير سالبة/);
 assert.throws(()=>calc(s,{base:'',percent:'5'}),/بشكل صحيح/);
}
{
 const s='percentage-difference';
 equal(calc(s,{first:'40',second:'60'})['الفرق النسبي'],'40%');
 equal(calc(s,{first:'-4',second:'6'})['الفرق النسبي'],'200%');
 equal(calc(s,{first:'12',second:'12'})['الفرق النسبي'],'0%');
 equal(calc(s,{first:'5',second:'-5'})['الفرق النسبي'],'200%');
 assert.throws(()=>calc(s,{first:'0',second:'0'}),/غير معرّف/);
 assert.throws(()=>calc(s,{first:'x',second:'1'}),/بشكل صحيح/);
}
{
 const s='average-calculator';
 equal(calc(s,{values:'4, 7, 10'})['المتوسط الحسابي'],'7');
 equal(calc(s,{values:'2، 6، 8، 12'})['الوسيط'],'7');
 equal(calc(s,{values:'-4 0 4'})['المتوسط الحسابي'],'0');
 equal(calc(s,{values:'١٫٥،٢٫٥'})['الوسيط'],'2');
 assert.throws(()=>calc(s,{values:''}),/قائمة/);
 assert.throws(()=>calc(s,{values:'1, two'}),/غير رقمية/);
 assert.throws(()=>api.parseValues(Array.from({length:501},(_,i)=>i).join(','),500),/1 إلى 500/);
}
{
 const s='ratio-proportion-calculator';
 equal(calc(s,{a:'1',b:'1',c:'5'})['القيمة المجهولة x'],'5');
 equal(calc(s,{a:'4',b:'6',c:'3'})['القيمة المجهولة x'],'4.5');
 equal(calc(s,{a:'8',b:'12',c:'10'})['القيمة المجهولة x'],'15');
 equal(calc(s,{a:'-2',b:'3',c:'4'})['القيمة المجهولة x'],'-6');
 assert.throws(()=>calc(s,{a:'0',b:'3',c:'4'}),/صفر/);
 assert.throws(()=>calc(s,{a:'1',b:'',c:'4'}),/بشكل صحيح/);
}
{
 const s='gcd-lcm-calculator';
 assert.deepEqual(calc(s,{values:'18,24'}),{'القاسم المشترك الأكبر':'6','المضاعف المشترك الأصغر':'72','عدد القيم':'2'});
 equal(calc(s,{values:'8،15'})['المضاعف المشترك الأصغر'],'120');
 equal(calc(s,{values:'0,-12,18'})['القاسم المشترك الأكبر'],'6');
 equal(calc(s,{values:'0,-12,18'})['المضاعف المشترك الأصغر'],'0');
 equal(calc(s,{values:'12345678901234567890,10'})['القاسم المشترك الأكبر'],'10');
 assert.throws(()=>calc(s,{values:'1.5,2'}),/أعدادًا صحيحة/);
 assert.throws(()=>calc(s,{values:'7'}),/من عددين/);
}
{
 const s='simple-interest-calculator';
 equal(calc(s,{principal:'10000',rate:'5',days:'90'})['الفائدة البسيطة التقديرية'],'123.28767123');
 equal(calc(s,{principal:'2400',rate:'12',days:'30'})['الإجمالي بعد المدة'],'2423.67123288');
 equal(calc(s,{principal:'750',rate:'0',days:'120'})['الفائدة البسيطة التقديرية'],'0');
 equal(calc(s,{principal:'100',rate:'5',days:'0'})['الإجمالي بعد المدة'],'100');
 assert.throws(()=>calc(s,{principal:'1',rate:'1001',days:'1'}),/لا يتجاوز 1000/);
 assert.throws(()=>calc(s,{principal:'1',rate:'5',days:'1.5'}),/مدة أيام صحيحة/);
}
{
 const s='compound-interest-calculator';
 equal(calc(s,{principal:'1000',rate:'10',periods:'1',years:'1'})['القيمة المستقبلية التقديرية'],'1,100');
 equal(calc(s,{principal:'1000',rate:'12',periods:'12',years:'1'})['القيمة المستقبلية التقديرية'],'1,126.82503013');
 equal(calc(s,{principal:'5000',rate:'8',periods:'4',years:'2'})['الفائدة المتراكمة'],'858.29690501');
 equal(calc(s,{principal:'500',rate:'0',periods:'12',years:'10'})['القيمة المستقبلية التقديرية'],'500');
 assert.throws(()=>calc(s,{principal:'100',rate:'5',periods:'3',years:'1'}),/اختر رسملة/);
 assert.throws(()=>calc(s,{principal:'100',rate:'5',periods:'12',years:'101'}),/حتى 100 سنة/);
}
console.log('PASS: 8 calculator tools; at least six checks per tool, including numeric, Arabic input, edge and rejection cases.');
