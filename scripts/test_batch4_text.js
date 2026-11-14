#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const api=require('../assets/js/tools/text-family.js');
const calc=api.calculate;
for(const slug of Object.keys(api.tools)) assert.ok(api.tools[slug],`${slug} registered`);
{
 const s='character-counter',input='بَّ👨‍👩‍👧‍👦 A',r=calc(s,{text:input,excludeWhitespace:'false'});
 assert.equal(r['العناقيد المرئية مع الفراغات'],'4');
 assert.equal(r['العناقيد بعد استثناء الفراغات'],'3');
 assert.equal(r['نقاط Unicode'],String(Array.from(input).length));
 assert.equal(r['بايتات UTF-8'],String(new TextEncoder().encode(input).length));
 assert.equal(r['الأسطر'],'1');
 assert.equal(calc(s,{text:input,excludeWhitespace:'true'})['العدد الرئيسي'],'3');
 assert.equal(calc(s,{text:'','excludeWhitespace':'false'})['العدد الرئيسي'],'0');
}
{
 const s='case-converter';
 assert.equal(calc(s,{text:'hello, world! 2 apples.',mode:'upper'})['النص بعد التحويل'],'HELLO, WORLD! 2 APPLES.');
 assert.equal(calc(s,{text:'NASA Launches 3 CUBES.',mode:'lower'})['النص بعد التحويل'],'nasa launches 3 cubes.');
 assert.equal(calc(s,{text:'hello, WORLD!\nthis is 2nd.',mode:'title'})['النص بعد التحويل'],'Hello, World!\nThis Is 2nd.');
 assert.equal(calc(s,{text:'hELLO. wORLD؟ tEST!',mode:'sentence'})['النص بعد التحويل'],'Hello. World؟ Test!');
 assert.ok(Number(calc(s,{text:'hello',mode:'upper'})['مواضع العناقيد المختلفة بعد التحويل'])>0);
 assert.throws(()=>calc(s,{text:'x',mode:'invalid'}),/نوع تحويل/);
}
{
 const s='arabic-diacritics-remover';
 const input='كَتَبَ';
 assert.equal(calc(s,{text:input,removeTatweel:'false'})['النص بعد إزالة التشكيل'],'كتب');
 assert.equal(calc(s,{text:input,removeTatweel:'false'})['علامات التشكيل المحذوفة'],'3');
 assert.equal(calc(s,{text:'مُحـمَّد',removeTatweel:'false'})['النص بعد إزالة التشكيل'],'محـمد');
 assert.equal(calc(s,{text:'مُحـمَّد',removeTatweel:'true'})['النص بعد إزالة التشكيل'],'محمد');
 assert.equal(calc(s,{text:'مُحـمَّد',removeTatweel:'true'})['التطويل المحذوف'],'1');
}
{
 const s='duplicate-spaces-remover';
 const input='أحمد  يقرأ\t\tالكتاب.\nنهاية';
 const r=calc(s,{text:input,trimLines:'false'});
 assert.equal(r['النص المنظف'],'أحمد يقرأ الكتاب.\nنهاية');
 assert.equal(r['مقاطع المسافات المكررة المختصرة'],'2');
 assert.equal(calc(s,{text:'A\u00a0B',trimLines:'false'})['النص المنظف'],'A B');
 assert.equal(calc(s,{text:'A\u00a0B',trimLines:'false'})['مسافات غير قابلة للكسر حُولت'],'1');
 assert.equal(calc(s,{text:'  أول \n ثانٍ ',trimLines:'true'})['النص المنظف'],'أول\nثانٍ');
 assert.equal(calc(s,{text:'',trimLines:'true'})['الأسطر بعد التنظيف'],'0');
}
{
 const s='reverse-text';
 assert.equal(calc(s,{text:'cat',mode:'all'})['النص الناتج'],'tac');
 assert.equal(calc(s,{text:'أ\nبج',mode:'lines'})['النص الناتج'],'بج\nأ');
 assert.equal(calc(s,{text:'بَت',mode:'all'})['النص الناتج'],'تبَ');
 assert.equal(calc(s,{text:'👨‍👩‍👧‍👦A',mode:'all'})['النص الناتج'],'A👨‍👩‍👧‍👦');
 assert.equal(calc(s,{text:'',mode:'all'})['العناقيد قبل العكس'],'0');
 assert.throws(()=>calc(s,{text:'x',mode:'bad'}),/نطاقًا صالحًا/);
}
{
 const s='alphabetize-list';
 assert.equal(calc(s,{text:'موز\nتفاح\nبرتقال',locale:'ar',direction:'asc',trimItems:'true'})['القائمة المرتبة'],'برتقال\nتفاح\nموز');
 assert.equal(calc(s,{text:'Mina\nAdam\nLina',locale:'en',direction:'asc',trimItems:'true'})['القائمة المرتبة'],'Adam\nLina\nMina');
 assert.equal(calc(s,{text:'ب\nأ\nأ',locale:'ar',direction:'asc',trimItems:'true'})['عدد العناصر المرتبة'],'3');
 assert.equal(calc(s,{text:'a\nb',locale:'en',direction:'desc',trimItems:'true'})['القائمة المرتبة'],'b\na');
 assert.equal(calc(s,{text:'\n\n',locale:'ar',direction:'asc',trimItems:'true'})['عدد العناصر المرتبة'],'0');
 assert.throws(()=>calc(s,{text:'a',locale:'en',direction:'invalid'}),/اتجاه ترتيب/);
}
{
 const s='text-compare';
 assert.equal(calc(s,{first:'تم الحفظ',second:'تم الحفظ',ignoreOuter:'true'})['تطابق حرفي'],'نعم');
 assert.equal(calc(s,{first:'x ',second:'x',ignoreOuter:'true'})['النتيجة بحسب خيارك'],'النصان متطابقان وفق المعيار المختار');
 assert.equal(calc(s,{first:'باب',second:'بات',ignoreOuter:'false'})['أول موضع اختلاف'],'3');
 assert.equal(calc(s,{first:'',second:' ',ignoreOuter:'true'})['تطابق بعد إزالة الفراغات الطرفية'],'نعم');
 assert.equal(calc(s,{first:'A👨‍👩‍👧‍👦',second:'A👨‍👩‍👧‍👦',ignoreOuter:'false'})['طول النص الأول بالعناقيد'],'2');
 assert.equal(calc(s,{first:'abc',second:'',ignoreOuter:'false'})['العنقود الأول المختلف'],'الأول: «a»؛ الثاني: نهاية النص');
}
console.log('PASS: 7 text tools; Unicode graphemes, RTL, diacritics, spaces, sorting and comparison boundaries.');
