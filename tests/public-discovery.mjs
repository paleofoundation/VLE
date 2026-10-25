import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicPageSchema,publicSchemaTag} from '../server/public-discovery.js';
for(const path of ['/','/suppliers/kasandrinos','/lots/KAS-227-KB']){
 const data=publicPageSchema(path,'Public lot evidence | VLE'),graph=data['@graph'];
 assert.equal(data['@context'],'https://schema.org');assert.deepEqual(graph.map(x=>x['@type']),['Organization','WebSite','WebPage']);
 assert.equal(graph[2].url,'https://vle.exchange'+path);assert.equal(graph[2].isPartOf['@id'],graph[1]['@id']);assert.equal(graph[1].publisher['@id'],graph[0]['@id']);
 assert(!JSON.stringify(data).match(/aggregateRating|Product|Certification|Offer|resultText|price/));
}
const tag=publicSchemaTag('/','</script><script>unexpected()</script>');assert.equal((tag.match(/<script/g)||[]).length,1);assert.equal((tag.match(/<\/script>/g)||[]).length,1);JSON.parse(tag.slice(tag.indexOf('>')+1,tag.lastIndexOf('<')));
const llms=readFileSync('public/llms.txt','utf8');assert(llms.startsWith('# Verified Lot Exchange\n'));assert(!llms.match(/https?:\/\/[^\s)]+\/(?:api|requests|brand|workspace|proof|reports|team)(?:\/|\))/));assert(llms.includes('TEST examples remain distinct'));assert(llms.includes('A laboratory result is not a certification.'));
console.log('PASS: public site/page identity links, escaped structured data, no invented result/certification/offer claims and public-only llms guide.');
