export async function render(container) {
  container.innerHTML = `<section><h2>Do boletim ao dado</h2><p>A cada hora, um acionador do Google Apps Script visitava a página da Infraero e guardava a tabela HTML numa célula. Veja como a captura de 29 de novembro de 2013, às 15h de Brasília, vira uma linha por aeroporto.</p>
  <label>Etapa <select><option value="html">1. Inspecionar o HTML</option><option value="linha">2. Extrair contagens</option><option value="serie">3. Montar a série horária</option></select></label>
  <div class="saida" aria-live="polite"></div>
  <p><a class="raw" download>Baixar o boletim original (texto)</a> · <a class="python" download>Baixar extrator Python</a> · <a class="geo" download>Baixar correspondência de aeroportos</a></p>
  <p>Para reproduzir a extração no repositório, execute no diretório deste subprojeto:</p><pre style="white-space:pre-wrap"><code>python extrair.py boletim-2013-11-29-15h.html.txt</code></pre></section>`;
  const url = new URL('boletim-2013-11-29-15h.html.txt', import.meta.url);
  container.querySelector('.raw').href = url;
  container.querySelector('.python').href = new URL('extrair.py', import.meta.url);
  container.querySelector('.geo').href = new URL('../aeroportos-partidas-e-retornos/geografia.json', import.meta.url);
  const response = await fetch(url); if (!response.ok) throw Error('Boletim indisponível');
  const raw = await response.text(), parsed = new DOMParser().parseFromString(raw,'text/html'), table = parsed.querySelector('#GridVoos');
  const select = container.querySelector('select'), output=container.querySelector('.saida');
  function show() {
    output.replaceChildren();
    if(select.value==='serie'){
      const p=document.createElement('p');p.textContent='O horário vem do cabeçalho do boletim. Quando a captura repete o mesmo boletim, fica a última cópia do horário. Horas sem boletim ficam ausentes. Explore esses passos aplicados às capturas do período.';
      const a=document.createElement('a');a.href=new URL('../aeroportos-partidas-e-retornos/',import.meta.url);a.textContent='Explorar o mapa dos boletins';output.append(p,a);return;
    }
    if(select.value==='html'){const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;overflow:auto;max-height:16rem';pre.textContent=table.rows[1].outerHTML;output.append(pre);return;}
    const t=document.createElement('table');t.style.cssText='border-collapse:collapse;width:100%;';const tr=t.createTHead().insertRow();
    for(const label of ['Indicador','Total às 15h']){const th=document.createElement('th');th.textContent=label;tr.append(th);}
    const body=t.createTBody(), labels=['Programados desde 0h','Atrasados desde 0h','Atrasados entre 14h e 15h','Cancelados desde 0h'];
    [...table.rows[1].cells].slice(1).forEach((cell,i)=>{const row=body.insertRow();row.insertCell().textContent=labels[i];row.insertCell().textContent=cell.textContent.trim();});output.append(t);
  }
  select.addEventListener('change',show);show();
}
