const origin='https://vle.exchange';
export function publicPageSchema(path,title){
 return {'@context':'https://schema.org','@graph':[
  {'@type':'Organization','@id':origin+'/#organization',name:'Verified Lot Exchange',alternateName:'VLE',url:origin+'/'},
  {'@type':'WebSite','@id':origin+'/#website',name:'Verified Lot Exchange',url:origin+'/',inLanguage:'en-US',publisher:{'@id':origin+'/#organization'}},
  {'@type':'WebPage','@id':origin+path+'#webpage',url:origin+path,name:title,inLanguage:'en-US',isPartOf:{'@id':origin+'/#website'},publisher:{'@id':origin+'/#organization'}}
 ]};
}
export function publicSchemaTag(path,title){return '<script type="application/ld+json">'+JSON.stringify(publicPageSchema(path,title)).replaceAll('<','\\u003c')+'</script>';}
