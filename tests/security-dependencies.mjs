import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const lock=read('package-lock.json');
const atLeast=(version,floor)=>{
 const parts=version.split('.').map(Number);
 if(parts.length!==3||parts.some(v=>!Number.isInteger(v)))return false;
 for(let i=0;i<3;i++){if(parts[i]>floor[i])return true;if(parts[i]<floor[i])return false;}
 return true;
};
const versions=name=>Object.entries(lock.packages).filter(([path])=>path.endsWith('/'+name)).map(([,entry])=>entry.version);
test('Next cache and image advisories are patched in every locked and installed copy',()=>{
 const all=[...versions('next'),read('node_modules/next/package.json').version];
 assert(all.length>=2);
 for(const version of all)assert(atLeast(version,[16,4,1]),'Next must include the 16.4.1 security fixes');
});
test('every Sharp copy includes the image memory safety fix',()=>{
 const all=[...versions('sharp'),read('node_modules/sharp/package.json').version];
 assert(all.length>=2);
 for(const version of all)assert(atLeast(version,[0,35,5]),'Sharp must include the 0.35.5 security fix');
});
test('Next lint configuration and install metadata agree with the locked runtime',()=>{
 const pkg=read('package.json');
 assert.equal(pkg.dependencies.next,lock.packages['node_modules/next'].version);
 assert.equal(pkg.devDependencies['eslint-config-next'],pkg.dependencies.next);
 assert.equal(read('node_modules/next/package.json').version,pkg.dependencies.next);
});
test('the installed patched Sharp native runtime still processes a synthetic image',async()=>{
 const sharp=(await import('sharp')).default;
 const {data,info}=await sharp({create:{width:2,height:2,channels:3,background:'#ffffff'}}).png().toBuffer({resolveWithObject:true});
 assert.equal(info.format,'png');assert.equal(info.width,2);assert.equal(info.height,2);
 assert(data.length>0);
});
