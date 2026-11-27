const nf = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3});
async function readFile(name, divisor) {
  const response=await fetch(new URL(name,import.meta.url));
  if(!response.ok) throw Error('Arquivo indisponível');
  const lines=(await response.text()).trim().split(/\r?\n/);
  const expected = name==='aliceweb.csv'?'mes,milhoes_usd_fob,milhoes_kg_liquido':'mes,usd_fob,kg_liquido';
  if(lines.shift()!==expected)throw Error('Formato inesperado');
  return lines.map(line=>{
    const [month,usd,kg]=line.split(',');
    if(!/^\d{4}-\d\d$/.test(month))throw Error('Mês inválido');
    return {month,usd:usd===''?null:Number(usd)/divisor,kg:kg===''?null:Number(kg)/divisor};
  });
}
export async function render(container) {
  const historical=await readFile('aliceweb.csv',1);
  container.innerHTML=`<section><h2>Como variavam as exportações de soja por Santos?</h2>
    <p>Em 2014, o AliceWeb aceitava até seis períodos por consulta. A primeira tela publicada mostra a forte alta de embarques entre janeiro e junho de 2000. Compare o valor FOB e o peso líquido da soja nos meses recuperados.</p>
    <label>Fonte <select name="fonte"><option value="old">AliceWeb · tela original</option><option value="modern">Comex Stat · URF de Santos</option></select></label>
    <label>Ano <select name="ano"></select></label>
    <label>Indicador <select name="medida"><option value="usd">Valor FOB · US$ milhões</option><option value="kg">Peso líquido · milhões de kg</option></select></label>
    <p class="nota" role="status"></p><div class="comex-chart"></div>
    <p><a class="download" download>Baixar dados exibidos (CSV)</a> · <a class="script" download>Reproduzir a consulta em Python</a> · <a href="https://dataforthoughts.wordpress.com/wp-content/uploads/2014/01/aliceweb_resultado1.png?w=640&amp;h=345">Tela original do AliceWeb</a></p>
    <p>Os dois códigos NCM do post são 12010090 e 12019000. O AliceWeb filtrava pelo porto de Santos, código 4117. A série moderna usa a unidade da Receita Federal de Santos, código 0817800, que a Secex recomenda como aproximação para o porto. Isso pode produzir diferenças entre as séries. <a href="https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/perguntas-frequentes-faq/14-como-consultar-estatisticas">Método da Secex</a>.</p></section>`;
  const source=container.querySelector('[name=fonte]'), year=container.querySelector('[name=ano]'), metric=container.querySelector('[name=medida]'), note=container.querySelector('.nota'),chart=container.querySelector('.comex-chart'),download=container.querySelector('.download');
  container.querySelector('.script').href=new URL('comex.py',import.meta.url);
  let modern,active=historical;
  function plot(){
    const shown=active.filter(r=>r.month.startsWith(year.value)),key=metric.value, max=Math.max(0,...shown.map(r=>r[key]??0));
    const table=document.createElement('table');table.style.cssText='width:100%;border-spacing:0 .45rem;';
    const header=table.createTHead().insertRow();
    for(const label of ['Mês',metric.selectedOptions[0].textContent,'Escala relativa no ano']){
      const h=document.createElement('th');h.scope='col';h.textContent=label;header.append(h);}
    const body=table.createTBody();
    for(const r of shown){
      const tr=body.insertRow();tr.insertCell().textContent=new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(r.month+'-01T00:00:00Z'));
      const v=r[key];tr.insertCell().textContent=v===null?'sem registro':nf.format(v);
      const cell=tr.insertCell();cell.style.width='38%';if(v!==null&&max>0){const bar=document.createElement('span');bar.style.cssText='display:block;height:.7rem;background:#21677a;width:'+100*v/max+'%';cell.append(bar);}
    }
    chart.replaceChildren(table);
  }
  function updateYears(){
    year.replaceChildren();for(const y of new Set(active.map(r=>r.month.slice(0,4))))year.add(new Option(y,y));plot();
  }
  async function dataset(){
    const selected=source.value;
    if(selected==='old'){
      active=historical;note.textContent='Seis meses transcritos da imagem original, arredondados a milhares de dólares e de quilogramas.';download.href=new URL('aliceweb.csv',import.meta.url);
    }else{
      note.textContent='Abrindo os dados do Comex Stat…';chart.replaceChildren();
      try{modern ||= await readFile('comex.csv',1e6);if(source.value!==selected)return;active=modern;note.textContent='Consulta Comex Stat de janeiro de 2000 a dezembro de 2013. A tabela inclui meses sem registro.';download.href=new URL('comex.csv',import.meta.url);}
      catch{if(source.value!==selected)return;active=[];year.replaceChildren();download.removeAttribute('href');note.textContent='A extração completa ainda não está disponível aqui. O script Python consulta a API pública e os arquivos anuais da Secex. A tela histórica está disponível em AliceWeb.';return;}
    }
    updateYears();
  }
  source.addEventListener('change',dataset);year.addEventListener('change',plot);metric.addEventListener('change',plot);await dataset();
}
