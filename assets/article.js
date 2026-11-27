const target = document.querySelector('[data-figure]');
if (target) {
  const group = target.dataset.group;
  const moduleURL = new URL('../data/' + group + '/view.js', import.meta.url);
  try {
    const visual = await import(moduleURL);
    await visual.render(target, target.dataset.figure);
  } catch (error) {
    console.error('Falha ao abrir a visualização', error);
    const p = document.createElement('p');
    p.textContent = 'A visualização não carregou. Consulte o material original abaixo ou recarregue a página.';
    target.replaceChildren(p);
  }
}
