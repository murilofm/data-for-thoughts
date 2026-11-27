const fmt = new Intl.NumberFormat('pt-BR');
export async function render(container, key) {
  const url = new URL('./observacoes.json', import.meta.url);
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error('Não foi possível carregar os números da partida.');
  const dados = await resposta.json();
  container.innerHTML = `<section><h2>Dois volantes, um tempo para cada um</h2>
    <p>Brasil 4 × 1 Camarões, 23 de junho de 2014. Paulinho começou o jogo e Fernandinho entrou no intervalo. Compare as ações que os dois realizaram em Brasília.</p>
    <label>Mostrar no campo <select data-jogador></select></label>
    <figure style="margin:1rem 0"><img data-campo width="655" height="431" style="width:100%;max-width:655px;height:auto;display:block" alt=""><figcaption>O círculo marca o destino de cada passe. Vermelho para Paulinho e azul para Fernandinho. Em azul-petróleo, o gol aos 84 minutos.</figcaption></figure>
    <label>Indicador <select data-metrica></select></label>
    <figure style="margin:1.25rem 0"><figcaption data-titulo></figcaption><div data-barras></div></figure>
    <p data-nota></p><p><a data-fonte></a> · <a href="./observacoes.json" download>Dados da comparação (JSON)</a></p>
    <p><a data-estatico>Infográfico original (PNG)</a> · <a data-animado>Animação original (GIF)</a></p></section>`;
  const el = s => container.querySelector('[data-' + s + ']');
  const select = el('metrica');
  for (const [i, medida] of dados.metrics.entries()) select.add(new Option(medida.label, i));
  function exibirMedida() {
    const medida = dados.metrics[Number(select.value)];
    const maximo = medida.unit === '%' ? 100 : Math.max(...medida.values, 1);
    el('titulo').textContent = medida.label + ' · por jogador';
    const barras = el('barras');
    barras.replaceChildren();
    for (const [i, valor] of medida.values.entries()) {
      const linha = document.createElement('div');
      linha.style.cssText = 'margin:.75rem 0';
      const nome = document.createElement('div');
      nome.textContent = dados.players[i] + ' (' + dados.halves[i] + ') · ' + fmt.format(valor) + ' ' + medida.unit;
      const trilha = document.createElement('div');
      trilha.style.cssText = 'width:100%;height:.72rem;background:#e4ebe7;margin-top:.3rem';
      const barra = document.createElement('div');
      barra.style.cssText = 'height:100%;background:' + (i ? '#08665a' : '#657873') + ';width:' + (valor * 100 / maximo) + '%';
      trilha.setAttribute('aria-hidden', 'true');
      trilha.append(barra);
      linha.append(nome, trilha);
      barras.append(linha);
    }
    el('nota').textContent = medida.detail;
    el('fonte').href = dados.sources[medida.source].url;
    el('fonte').textContent = dados.sources[medida.source].name;
  }
  const jogador = el('jogador');
  for (const [i, frame] of dados.frames.entries()) jogador.add(new Option(frame.name, i));
  function exibirCampo() {
    const frame = dados.frames[Number(jogador.value)];
    el('campo').src = new URL(frame.file, import.meta.url);
    el('campo').alt = 'Mapa dos passes contra Camarões: ' + frame.name + '.';
  }
  el('estatico').href = new URL(dados.images[0].file, import.meta.url);
  el('animado').href = new URL(dados.images[1].file, import.meta.url);
  jogador.addEventListener('change', exibirCampo);
  select.addEventListener('change', exibirMedida);
  exibirCampo();
  exibirMedida();
}
