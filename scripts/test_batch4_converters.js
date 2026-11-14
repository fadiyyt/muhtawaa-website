#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const api=require('../assets/js/tools/converter-family.js');
const number=value=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:8}).format(value);
const cases={
 'length-converter':{value:2.5,from:'km',to:'mm',expected:2500000,back:'km'},
 'weight-converter':{value:1,from:'kg',to:'g',expected:1000,back:'kg'},
 'area-converter':{value:2,from:'ha',to:'m2',expected:20000,back:'ha'},
 'volume-converter':{value:1.5,from:'l',to:'ml',expected:1500,back:'l'},
 'speed-converter':{value:100,from:'kph',to:'mps',expected:100/3.6,back:'kph'},
 'pressure-converter':{value:1,from:'bar',to:'kpa',expected:100,back:'bar'},
 'energy-converter':{value:5,from:'wh',to:'j',expected:18000,back:'wh'},
 'data-size-converter':{value:1,from:'MiB',to:'MB',expected:1.048576,back:'MiB'},
 'time-unit-converter':{value:2.5,from:'h',to:'min',expected:150,back:'h'},
 'temperature-converter':{value:25,from:'C',to:'F',expected:77,back:'C'}
};
for(const [slug,c] of Object.entries(cases)){
  assert.ok(api.tools[slug],`${slug}: registered`);
  const unit=api.tools[slug].units[0][0];
  assert.equal(api.convert(slug,{value:'1',from:unit,to:unit})['النتيجة'],`${number(1)} ${api.tools[slug].units[0][1]}`,`${slug}: identity`);
  const result=api.convert(slug,{value:String(c.value),from:c.from,to:c.to});
  assert.equal(result['النتيجة'],`${number(c.expected)} ${api.tools[slug].units.find(x=>x[0]===c.to)[1]}`,`${slug}: known conversion`);
  assert.ok(result['عامل المصدر إلى الوحدة المرجعية']||result['المعادلة المستخدمة'],`${slug}: explains factor or formula`);
  const back=api.convert(slug,{value:String(c.expected),from:c.to,to:c.back});
  assert.equal(back['النتيجة'],`${number(c.value)} ${api.tools[slug].units.find(x=>x[0]===c.back)[1]}`,`${slug}: reverse conversion`);
  assert.throws(()=>api.convert(slug,{value:'',from:c.from,to:c.to}),/رقمًا صالحًا/,`${slug}: rejects blank`);
  assert.throws(()=>api.convert(slug,{value:'1',from:'invalid',to:c.to}),/وحدة صالحة/,`${slug}: rejects unknown unit`);
  if(slug==='temperature-converter') assert.throws(()=>api.convert(slug,{value:'-274',from:'C',to:'K'}),/الصفر المطلق/,`${slug}: rejects below absolute zero`);
  else assert.throws(()=>api.convert(slug,{value:'-1',from:c.from,to:c.to}),/السالبة/,`${slug}: rejects negative quantity`);
}
assert.equal(api.convert('temperature-converter',{value:'0',from:'C',to:'F'})['النتيجة'],`${number(32)} ${api.tools['temperature-converter'].units.find(x=>x[0]==='F')[1]}`);
assert.equal(api.convert('data-size-converter',{value:'1',from:'KiB',to:'B'})['النتيجة'],`${number(1024)} بايت`);
assert.throws(()=>api.convert('unknown',{value:'1',from:'m',to:'km'}),/غير معروفة/);
console.log('PASS: 10 converter tools; identity, forward, inverse, factors/formula, blank/invalid-unit and negative/absolute-zero boundaries.');
