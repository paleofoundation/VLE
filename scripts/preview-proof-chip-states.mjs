// Isolated visual test fixture. Never a deployment entrypoint. No API, DB or outbound reads.
import {createServer} from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {proofStrip} from '../public/proof-strip.js';
const root=resolve('public');
const record={tecrid:'SYNTHETIC·QUALIFIED',status:'QUALIFIED',program:'analytical-record',verificationUrl:'https://tecrid.com/records/SYNTHETIC-ONLY'};
const scenarios=[
 ['Qualified',{tecrids:[record]}],
 ['Pending, long ID',{tecrids:[{...record,status:'pending',tecrid:'SYNTHETIC·'+('LONG-IDENTIFIER-'.repeat(7))}]}],
 ['Active is not qualified',{tecrids:[{...record,status:'active',freshness:'lapsed'}]}],
 ['Revoked',{tecrids:[{...record,status:'revoked'}]}],
 ['Program labels',{certifications:[{id:'synthetic-cert',program:'SYNTHETIC certification',status:'active',verification:'verified against registry'},{id:'synthetic-lab',program:'analytical-record',status:'pending',verification:'self-reported'}]}],
 ['Empty',{}]
];
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SYNTHETIC proof chip QA</title><link rel="stylesheet" href="/assets/inter.css"><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/proof.css"><style>body{padding:18px}main{padding:0;max-width:100%}h1{font-size:24px}h2{font-size:20px}.panel{padding:18px;margin-top:18px}</style></head><body><main><h1>SYNTHETIC proof chip QA</h1><p>Layout fixtures only. No real credential or certification is represented.</p>${scenarios.map(([title,wall])=>`<section class="panel"><h2>${title}</h2>${proofStrip(wall,{lastTested:title==='Empty'?null:'2026-01-29'})}</section>`).join('')}</main></body></html>`;
createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 const path=resolve(root,'.'+decodeURIComponent(url.pathname));
 if(path.startsWith(root+sep)&&['.css','.woff2'].includes(extname(path))){try{if(statSync(path).isFile()){res.setHeader('Content-Type',extname(path)==='.css'?'text/css':'font/woff2');res.end(readFileSync(path));return;}}catch{}}
 res.writeHead(404);res.end();
}).listen(5189,'127.0.0.1',()=>console.log('SYNTHETIC read-only proof fixture http://127.0.0.1:5189'));
