const origin='https://vle.exchange';
export function publicSiteSchema(){
 return {'@context':'https://schema.org','@graph':[
  {'@type':'Organization','@id':origin+'/#organization',name:'Verified Lot Exchange',alternateName:'VLE',url:origin+'/'},
  {'@type':'WebSite','@id':origin+'/#website',name:'Verified Lot Exchange',url:origin+'/',inLanguage:'en-US',publisher:{'@id':origin+'/#organization'}}
 ]};
}
export function publicSchemaTag(){return '<script type="application/ld+json">'+JSON.stringify(publicSiteSchema()).replaceAll('<','\\u003c')+'</script>';}
