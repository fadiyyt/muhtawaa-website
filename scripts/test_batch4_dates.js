#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=require('../assets/js/tools/date-family.js');
const table=JSON.parse(fs.readFileSync(require.resolve('../data/ummalqura-1356-1500.json'),'utf8'));
const data=api.buildHijriIndex(table);
for(const slug of Object.keys(api.tools)) assert.ok(api.tools[slug],`${slug} registered`);
{
 const s='date-offset-calculator';
 assert.equal(api.calculate(s,{date:'2024-02-28',days:'1',operation:'add'})['التاريخ الناتج'],'2024-02-29');
 assert.equal(api.calculate(s,{date:'2024-02-29',days:'1',operation:'add'})['التاريخ الناتج'],'2024-03-01');
 assert.equal(api.calculate(s,{date:'2025-01-01',days:'1',operation:'subtract'})['التاريخ الناتج'],'2024-12-31');
 assert.throws(()=>api.calculate(s,{date:'2025-02-30',days:'1',operation:'add'}),/تاريخًا ميلاديًا صالحًا/);
 assert.throws(()=>api.calculate(s,{date:'2024-01-01',days:'1.5',operation:'add'}),/أيام صحيحًا/);
 assert.throws(()=>api.calculate(s,{date:'9999-12-31',days:'1',operation:'add'}),/خارج النطاق/);
}
{
 const s='business-days-calculator';
 assert.equal(api.tools[s].fields.find(field=>field.id==='weekend').value,'fri-sat');
 assert.deepEqual(api.businessDays('2026-01-05','2026-01-11','sat-sun'),{business:5,weekend:2,total:7,weekendName:'السبت والأحد'});
 assert.deepEqual(api.businessDays('2026-01-08','2026-01-11','fri-sat'),{business:2,weekend:2,total:4,weekendName:'الجمعة والسبت'});
 assert.deepEqual(api.businessDays('2026-11-15','2026-11-26'),{business:10,weekend:2,total:12,weekendName:'الجمعة والسبت'});
 assert.equal(api.calculate(s,{start:'2026-11-15',end:'2026-11-26'})['أيام العمل'],'10');
 assert.deepEqual(api.businessDays('2026-01-05','2026-01-05','sat-sun'),{business:1,weekend:0,total:1,weekendName:'السبت والأحد'});
 assert.throws(()=>api.businessDays('2026-01-11','2026-01-05','fri-sat'),/البداية تاريخ النهاية/);
 assert.throws(()=>api.businessDays('2026-01-05','2026-01-07','invalid'),/عطلة نهاية أسبوع/);
 assert.throws(()=>api.businessDays('bad','2026-01-07','fri-sat'),/تاريخي بداية/);
}
{
 const s='iso-week-calculator';
 assert.deepEqual(api.isoWeek('2024-01-04'),{week:1,weekYear:2024,monday:'2024-01-01',sunday:'2024-01-07'});
 assert.deepEqual(api.isoWeek('2024-02-29'),{week:9,weekYear:2024,monday:'2024-02-26',sunday:'2024-03-03'});
 assert.deepEqual(api.isoWeek('2020-12-28'),{week:53,weekYear:2020,monday:'2020-12-28',sunday:'2021-01-03'});
 assert.equal(api.isoWeek('2021-01-01').weekYear,2020);
 assert.throws(()=>api.isoWeek('2023-02-29'),/تاريخًا ميلاديًا صالحًا/);
}
{
 const s='date-countdown';
 assert.equal(api.countdown('2027-06-10','2027-06-10').signed,0);
 assert.equal(api.countdown('2028-03-04','2028-03-03').signed,1);
 assert.equal(api.countdown('2026-01-17','2026-01-20').signed,-3);
 assert.equal(api.calculate(s,{target:'2028-03-04',reference:'2028-03-03'})['عدد الأيام'],'1');
 assert.equal(api.calculate(s,{target:'2028-03-04',reference:'2028-03-03'})['الحالة'],'متبقٍ');
 assert.throws(()=>api.countdown('bad','2026-01-01'),/تاريخًا مستهدفًا/);
}
{
 const s='hijri-days-difference';
 const first={day1:'1',month1:'1',year1:'1445'},second={day2:'1',month2:'2',year2:'1445'};
 assert.equal(api.hijriDifference({...first,...second},data)['الفرق المطلق'],'29 يومًا');
 assert.equal(api.hijriDifference({day1:'1',month1:'2',year1:'1445',day2:'1',month2:'1',year2:'1445'},data)['الفرق الموقّع'],'-29 يومًا (الثاني قبل الأول)');
 assert.equal(api.hijriDifference({day1:'10',month1:'9',year1:'1445',day2:'20',month2:'9',year2:'1445'},data)['الفرق المطلق'],'10 يومًا');
 const boundary=api.hijriDifference({day1:'1',month1:'1',year1:'1356',day2:'30',month2:'12',year2:'1500'},data);
 assert.equal(boundary['الفرق المطلق'],`${table.dayCount-1} يومًا`);
 assert.throws(()=>api.hijriDifference({day1:'31',month1:'1',year1:'1445',day2:'1',month2:'2',year2:'1445'},data),/غير موجود أو خارج النطاق/);
 assert.throws(()=>api.hijriDifference({day1:'1',month1:'1',year1:'1355',day2:'1',month2:'2',year2:'1445'},data),/غير موجود أو خارج النطاق/);
 assert.throws(()=>api.hijriDifference({...first,...second},null),/تعذر قراءة جدول/);
}
console.log('PASS: 5 date tools; Gregorian edges, ISO boundaries, signed countdowns, and Umm al-Qura boundaries.');
