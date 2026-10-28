import assert from 'node:assert/strict';
import {requestAssetView,requestListView,requestDetailView,phoneRequestsPage,invalidatePhoneRequests} from '../public/phone-requests.js';
const requestId='11111111-1111-4111-8111-111111111111';
const row={id:requestId,buyerId:'brand',buyerName:'Synthetic <brand>',ingredientCode:'ingredient',ingredientLabel:'Ingredient <script>',items:['coa'],targetCount:1,answered:0,status:'open',version:0,answers:[{id:'exchange',supplierId:'supplier',supplierName:'Synthetic <supplier>',status:'pending',version:0,reply:null,attachments:[]}]};
const own={accountId:'supplier',readOnly:false,request:row};
const file={id:'a'.repeat(64),kind:'coa',title:'Source <script>',view:{verification:'Supplier source',product:'<img src=x onerror=alert(1)>',lot:'SYNTHETIC',issuingLab:null,testedAt:null,results:[{analyte:'<script>',resultText:null,unit:null}]}};
const rendered=requestAssetView(file);assert.doesNotMatch(rendered,/<script>|<img src=x/);assert.match(rendered,/&lt;script&gt;/);assert.match(rendered,/not provided/);assert.match(rendered,/Test date/);assert.doesNotMatch(requestAssetView({...file,view:{verificationUrl:'javascript:alert(1)'}}),/href=/);assert.doesNotMatch(requestAssetView({...file,view:{verificationUrl:'https://tecrid.com.evil.test/records/x'}}),/href=/);assert.match(requestAssetView({...file,view:{verificationUrl:'https://tecrid.com/records/SYNTHETIC'}}),/href="https:\/\/tecrid.com/);
const list=requestListView({requests:[row],readOnly:false},'supplier');assert.match(list,/\?answer=1/);assert.doesNotMatch(list,/<script>|partner|[\u2013\u2014]/i);assert.equal((list.match(/class="button orange"/g)||[]).length,1);
const open=requestDetailView(own,'supplier',{open:true,files:[file]});assert.match(open,/Share these records/);assert.match(open,/<details><summary>/);assert.match(open,/Yes/);assert.match(open,/No/);assert.match(open,/Need more time/);assert.match(open,/Ask me later/);assert.doesNotMatch(open,/data-phone-request="open-answer"/);
const pending=requestDetailView(own,'supplier');assert.equal((pending.match(/<button/g)||[]).length,2);assert.match(pending,/Not now/);
const viewer=requestDetailView({...own,readOnly:true},'supplier');assert.equal((viewer.match(/disabled/g)||[]).length,2);
const missing=requestDetailView({...own,request:{...row,answers:[{...row.answers[0],status:'answered',attachments:[{id:'old',available:false,label:'Not provided.'}]}]}},'brand');assert.match(missing,/Not provided/);assert.doesNotMatch(missing,/Source &lt;script/);
console.log('PASS: two-action card, direct two-tap Answer link, quick replies, explicit share, escaped source data, canonical links and missing/viewer states.');
// Real async page loader must reject mismatched active-account responses.
const originalFetch=globalThis.fetch,originalLocation=globalThis.location;globalThis.location={search:''};
try{
 globalThis.fetch=async path=>({ok:true,json:async()=>path==='/api/requests'?{accountId:'new-team',kind:'supplier',readOnly:false,requests:[]}:{accountId:'old-team',kind:'supplier',readOnly:false,request:row}});
 invalidatePhoneRequests();let draws=0;
 phoneRequestsPage('/requests/'+requestId,{signedIn:true},'supplier',()=>{draws++;});
 await new Promise(setImmediate);const html=phoneRequestsPage('/requests/'+requestId,{signedIn:true},'supplier',()=>{draws++;});
 assert.match(html,/account changed/);assert.doesNotMatch(html,/Synthetic &lt;brand/);assert.equal(draws,1);
 console.log('PASS: asynchronous cross-account data is rejected before rendering; no automatic retry loop.');
}finally{globalThis.fetch=originalFetch;globalThis.location=originalLocation;invalidatePhoneRequests();}
