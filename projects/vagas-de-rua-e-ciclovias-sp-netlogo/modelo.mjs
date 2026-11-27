// Unidades: cada passo equivale a um minuto. Só as chegadas dos primeiros
// 180 minutos entram na amostra; a fila continua até o último carro sair.
export function gerarChegadas(semente = 2014, minutos = 180) {
  let estado = semente >>> 0;
  function aleatorio() {
    estado = (Math.imul(1664525, estado) + 1013904223) >>> 0;
    return estado / 4294967296;
  }
  const chegadas = [];
  for (let minuto = 0; minuto < minutos; minuto++) {
    const quantidade = Number(aleatorio() < 0.85) + Number(aleatorio() < 0.45);
    for (let i = 0; i < quantidade; i++) {
      chegadas.push({
        minuto,
        permanencia: 6 + Math.floor(aleatorio() * 15),
        escolha: aleatorio()
      });
    }
  }
  return chegadas;
}

// No mesmo minuto, vagas liberadas ficam disponíveis antes das novas buscas.
// Quem espera tem preferência sobre quem acaba de chegar.
export function simular(chegadas, vagas, desvio, limite = 10) {
  if (!Number.isInteger(vagas) || vagas < 0 || !Number.isFinite(desvio) ||
      desvio < 0 || desvio > 1 || !Number.isInteger(limite) || limite < 1) {
    throw new RangeError('Parâmetros inválidos');
  }
  let fila = [];
  let ocupadoAte = [];
  let cursor = 0;
  let estacionados = 0;
  let redirecionados = 0;
  let desistencias = 0;
  const procurando = [];
  for (let minuto = 0; cursor < chegadas.length || fila.length; minuto++) {
    ocupadoAte = ocupadoAte.filter(fim => fim > minuto);
    while (cursor < chegadas.length && chegadas[cursor].minuto === minuto) {
      const carro = chegadas[cursor++];
      if (carro.escolha < desvio) redirecionados++;
      else fila.push(carro);
    }
    const restantes = [];
    for (const carro of fila) {
      if (ocupadoAte.length < vagas) {
        ocupadoAte.push(minuto + carro.permanencia);
        estacionados++;
      } else if (minuto - carro.minuto >= limite) {
        desistencias++;
      } else {
        restantes.push(carro);
      }
    }
    fila = restantes;
    procurando.push(fila.length);
  }
  return {
    procurando,
    carrosMinuto: procurando.reduce((total, carros) => total + carros, 0),
    estacionados, redirecionados, desistencias
  };
}
