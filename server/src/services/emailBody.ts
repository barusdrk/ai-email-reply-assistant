
export function cleanEmailBody(value:string,isHtml=false):string{
  if(!value)return "";

  let text=value
    .replace(/<!--[\s\S]*?-->/g," ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi," ");

  if(isHtml){
    text=text
      .replace(/<br\b[^>]*>/gi,"\n")
      .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi,"\n")
      .replace(/<[^>]*>/g," ");
  }

  text=text.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|zwnj|zwj|shy|ndash|mdash|lsquo|rsquo|ldquo|rdquo|hellip|copy|reg|trade);/gi,
    (entity:string,code:string):string=>{
      const key=code.toLowerCase();

      if(key.startsWith("#x")){
        const point=parseInt(key.slice(2),16);
        return Number.isFinite(point)&&point>=0&&point<=0x10ffff
          ?String.fromCodePoint(point)
          :entity;
      }

      if(key.startsWith("#")){
        const point=parseInt(key.slice(1),10);
        return Number.isFinite(point)&&point>=0&&point<=0x10ffff
          ?String.fromCodePoint(point)
          :entity;
      }

      const entities:Record<string,string>={
        amp:"&",
        lt:"<",
        gt:">",
        quot:'"',
        apos:"'",
        nbsp:" ",
        zwnj:"\u200c",
        zwj:"\u200d",
        shy:"\u00ad",
        ndash:"\u2013",
        mdash:"\u2014",
        lsquo:"\u2018",
        rsquo:"\u2019",
        ldquo:"\u201c",
        rdquo:"\u201d",
        hellip:"\u2026",
        copy:"\u00a9",
        reg:"\u00ae",
        trade:"\u2122",
      };

      return entities[key]??entity;
    },
  );

  return text
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff\u00ad]/g,"")
    .replace(/\bzdtag-[a-z0-9-]+\b/gi,"")
    .replace(/[ \t]+\n/g,"\n")
    .replace(/[ \t]{2,}/g," ")
    .replace(/\n[ \t]+/g,"\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}
