const svgNS='http://www.w3.org/2000/svg';
function svg(tag,attributes,text) {
  const node=document.createElementNS(svgNS,tag);
  Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));
  if(text!==undefined) node.textContent=text;
  return node;
}
const indicators=['Programados desde 0h','Atrasados desde 0h','Atrasados na última hora','Cancelados desde 0h'];
function stamp(time){return time.slice(0,10).split('-').reverse().join('/')+' às '+time.slice(11);}
export async function render(container) {
  const csvUrl=new URL('boletins.csv',import.meta.url), geoUrl=new URL('geografia.json',import.meta.url);
  const [csv, geo]=await Promise.all([fetch(csvUrl).then(r=>{if(!r.ok)throw Error('Boletins indisponíveis');return r.text();}),fetch(geoUrl).then(r=>{if(!r.ok)throw Error('Geografia indisponível');return r.json();})]);
  const bulletins=new Map();
  for(const line of csv.trim().split(/\r?\n/).slice(1)){
    const [time,icao,...v]=line.split(',');
    if (!bulletins.has(time)) bulletins.set(time,new Map());
    bulletins.get(time).set(icao,v.map(Number));
  }
  const times=[...bulletins.keys()], airports=new Map(geo.airports.map(a=>[a.icao,a]));
  container.innerHTML=`<section><h2>Uma hora nos aeroportos brasileiros</h2>
    <p>Em 2013, a Infraero substituía a tabela a cada boletim. A coleta preservou as contagens que o passageiro teria encontrado em cada horário. Explore 284 boletins de 29 de novembro a 11 de dezembro, em horário de Brasília.</p>
    <div><label>Indicador <select name="metrica"></select></label>
    <label>Aeroporto <select name="aeroporto"><option value="">Todos os aeroportos</option></select></label></div>
    <label>Horário do boletim <input style="width:min(100%,30rem)" name="hora" type="range" min="0" step="1" value="0"></label>
    <p class="horario" aria-live="polite"></p><div class="mapa"></div>
    <p>O tamanho do círculo acompanha a contagem escolhida. A cor compara os atrasos da última hora com os do boletim de uma hora antes. Laranja indica aumento, azul indica queda e cinza indica estabilidade ou ausência da comparação.</p>
    <h3 class="rank"></h3><div class="lista" style="overflow:auto;max-height:24rem"></div>
    <p>O total exibido é o da linha TOTAIS da Infraero. Aeroportos ausentes no boletim ficam fora do mapa e da tabela. Os totais acumulados reiniciam à meia-noite.</p>
    <p><a class="baixar" download>Baixar todos os boletins (CSV)</a> · <a class="como">Reproduzir a coleta</a> · <a href="https://github.com/jpatokal/openflights/blob/master/data/airports.dat">Coordenadas OpenFlights / OurAirports</a> · <a href="https://ourairports.com/airports/SBNT/">Natal em 2013</a> · <a href="https://github.com/datasets/geo-boundaries-world-110m">Contorno Natural Earth</a></p></section>`;
  const select=container.querySelector('[name=metrica]'), airport=container.querySelector('[name=aeroporto]'), slider=container.querySelector('[name=hora]');
  indicators.forEach((label,i)=>select.add(new Option(label,String(i)))); select.value='1';
  for(const a of [...airports.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')))airport.add(new Option(a.nome,a.icao));
  slider.max=times.length-1;
  container.querySelector('.baixar').href=csvUrl;
  container.querySelector('.como').href=new URL('../passo-a-passo-aeroportos/',import.meta.url);
  const project=([lon,lat])=>[(lon+75)*10+15,(6-lat)*10+9];
  const outline='M'+geo.border.map(p=>project(p).map(v=>v.toFixed(2)).join(',')).join('L')+'Z';
  function show() {
    const i=Number(slider.value), metric=Number(select.value), time=times[i], data=bulletins.get(time), filter=airport.value;
    const before=new Date(Date.parse(time+'Z')-3600000).toISOString().slice(0,16), previous=bulletins.get(before);
    const items=[...data.entries()].filter(([code])=>code!=='TOTAL' && (!filter || filter===code)).sort((a,b)=>b[1][metric]-a[1][metric]||a[0].localeCompare(b[0]));
    slider.setAttribute('aria-valuetext',stamp(time));
    const current=data.get(filter||'TOTAL')?.[metric];
    const label=filter?airports.get(filter).nome:'Total do boletim';
    container.querySelector('.horario').textContent=stamp(time)+' · '+label+' · '+(current===undefined?'sem registro':current+' '+indicators[metric].toLowerCase());
    const chart=svg('svg',{viewBox:'0 0 448 417',role:'img','aria-label':'Mapa de '+indicators[metric]+' em '+stamp(time),style:'display:block;max-width:550px;width:100%;background:#f5f8f8'});
    chart.append(svg('path',{d:outline,fill:'#e2e9e7',stroke:'#80908c','stroke-width':1.2}));
    for(const [code,values] of [...items].reverse()) {
      const a=airports.get(code),[cx,cy]=project([a.lon,a.lat]),prior=previous?.get(code)?.[2],v=values[metric];
      const fill=prior===undefined||prior===values[2]?'#657274':prior<values[2]?'#aa4825':'#19778c';
      const dot=svg('circle',{cx,cy,r:v===0?1.2:Math.max(2,Math.sqrt(v)*1.4),fill: v===0?'none':fill,stroke:fill,'fill-opacity':.68,'stroke-width':.85});
      dot.append(svg('title',{},a.nome+' · '+indicators[metric]+': '+v));chart.append(dot);
    }
    container.querySelector('.mapa').replaceChildren(chart);
    container.querySelector('.rank').textContent=filter?'Contagem do aeroporto':'Aeroportos por '+indicators[metric].toLowerCase();
    const table=document.createElement('table'),tr=table.createTHead().insertRow();table.style.width='100%';
    for(const s of ['Aeroporto',indicators[metric],'Variação nos atrasos da última hora']){const h=document.createElement('th');h.scope='col';h.textContent=s;tr.append(h);}
    const body=table.createTBody();
    for(const [code,values] of items){
      const tr=body.insertRow(),prev=previous?.get(code)?.[2],d=values[2]-prev;
      tr.insertCell().textContent=airports.get(code).nome;tr.insertCell().textContent=values[metric];
      tr.insertCell().textContent=prev===undefined?'sem comparação':(d>0?'+':'')+d;
    }
    container.querySelector('.lista').replaceChildren(table);
  }
  select.addEventListener('change',show);airport.addEventListener('change',show);slider.addEventListener('input',show);show();
}
