const chart = document.querySelector('#od-chart');
const svg = chart.querySelector('svg');
const select = chart.querySelector('select');
const fmt = new Intl.NumberFormat('pt-BR');
async function rows(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(url);
  return (await response.text()).trim().split(/\r?\n/).slice(1).map(line => line.split(','));
}
function mark(tag, attrs, label = '') {
  const el = document.createElementNS(svg.namespaceURI, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  el.textContent = label;
  svg.append(el);
  return el;
}
async function render() {
  const [pop, trips] = await Promise.all([rows('./distritos.csv'), rows('./mobilidade.csv')]);
  const census = new Map(pop.map(row => [row[2], row.slice(-2).map(Number)]));
  const search = chart.querySelector('input');
  const tip = chart.querySelector('.od-tip');
  const caption = chart.querySelector('figcaption');
  const percent = n => (n<0?'−':n>0?'+':'') + Math.abs(n).toLocaleString('pt-BR',{maximumFractionDigits:1}) + '%';
  const districts = trips.map(([name,first,last])=>{
    const [before,after]=census.get(name);
    return {name,before,after,first:+first,last:+last,dx:100*(after/before-1),dy:100*(last/first-1)};
  }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  let selected=districts.find(d=>d.name==='Bela Vista');
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function filter(){
    select.replaceChildren();
    for(const d of districts.filter(d=>normalize(d.name).includes(normalize(search.value.trim())))) select.add(new Option(d.name,d.name));
    if(!select.length) select.add(new Option('Nenhum distrito encontrado',''));
    if([...select.options].some(o=>o.value===selected.name)) select.value=selected.name;
  }
  function choose(d){
    selected=d;
    search.value='';
    filter();
    caption.replaceChildren();
    const title=document.createElement('strong');
    title.textContent=d.name;
    caption.append(title);
    for(const [label,delta,a,b] of [['Moradores',d.dx,d.before,d.after],['Viagens ao volante',d.dy,d.first,d.last]]){
      const row=document.createElement('div');
      const change=document.createElement('b');
      change.textContent=percent(delta);
      row.append(label+'  ',change,'  ('+fmt.format(a)+' → '+fmt.format(b)+')');
      caption.append(row);
    }
    draw();
  }
  function draw(){
    tip.hidden=true;
    svg.replaceChildren();
    const w=Math.max(270,Math.round(svg.getBoundingClientRect().width));
    const left=43,right=w-16,top=49,bottom=327;
    svg.setAttribute('viewBox','0 0 '+w+' 391');
    const x=n=>left+(Math.min(45,n)+22)/67*(right-left);
    const y=n=>bottom-(n+65)/160*(bottom-top);
    const label=(a,b,str,anchor='start',attrs={})=>mark('text',{x:a,y:b,'text-anchor':anchor,fill:'#415858',...attrs},str);
    for(const n of [-20,0,20,40]){
      mark('line',{x1:x(n),x2:x(n),y1:top,y2:bottom,stroke:n?'#e1e5df':'#566c69'});
      label(x(n),bottom+19,percent(n),'middle');
    }
    for(const n of [-50,-25,0,25,50,75]){
      mark('line',{x1:left,x2:right,y1:y(n),y2:y(n),stroke:n?'#e1e5df':'#566c69'});
      label(left-5,y(n)+4,percent(n),'end');
    }
    label(left,22,'Variação de viagens ao volante, 2017–2023');
    label(right,376,'Variação de moradores, 2010–2022','end');
    for(const [px,py,word,mode,anchor] of [[left+2,top,'Menos moradores','mais viagens','start'],[right,top,'Mais moradores','mais viagens','end'],[left+2,bottom-16,'Menos moradores','menos viagens','start'],[right,bottom-16,'Mais moradores','menos viagens','end']]){
      label(px,py,word,anchor,{'font-size':10}); label(px,py+11,mode,anchor,{'font-size':10});
    }
    for(const d of [...districts.filter(d=>d!==selected),selected]){
      const px=x(d.dx),py=y(d.dy);
      const dot=mark('circle',{cx:px,cy:py,r:d===selected?5:3.7,fill:d.dx<0&&d.dy>0?'#bd4822':'#648884',opacity:d===selected?1:.73,stroke:d===selected?'#1b3535':'white','stroke-width':d===selected?2:1,tabindex:0,role:'button','aria-pressed':d===selected,'aria-label':d.name+', moradores '+percent(d.dx)+', viagens '+percent(d.dy)});
      function show(){
        tip.textContent=d.name+' · Moradores '+percent(d.dx)+' · Viagens '+percent(d.dy);
        tip.hidden=false;
        tip.style.left=Math.max(0,Math.min(px-10,w-tip.offsetWidth))+'px';
        tip.style.top=(svg.offsetTop+py-tip.offsetHeight-9)+'px';
      }
      dot.onfocus=dot.onmouseenter=show;
      dot.onblur=dot.onmouseleave=()=>{tip.hidden=true;};
      dot.onclick=()=>choose(d);
      dot.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();choose(d);svg.querySelector('[aria-pressed="true"]').focus();}};
      if(d.dx>45 || d===selected){
        const end=d.dx>20;
        label(px+(end?-7:8),py-8,d.name+(d.dx>45?' '+percent(d.dx)+' →':''),end?'end':'start',{'font-weight':650,'paint-order':'stroke',stroke:'white','stroke-width':3,'pointer-events':'none'});
      }
    }
  }
  search.oninput=filter;
  search.onkeydown=e=>{if(e.key==='Enter'&&select.value) choose(districts.find(d=>d.name===select.value));};
  select.onchange=()=>{if(select.value)choose(districts.find(d=>d.name===select.value));};
  chart.hidden=false;
  choose(selected);
  let previous=svg.clientWidth;
  new ResizeObserver(()=>{if(svg.clientWidth!==previous){previous=svg.clientWidth;draw();}}).observe(svg);
}
render().catch(console.error);
