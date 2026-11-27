const form = document.querySelector('[data-filters]');
if (form) {
  const search = form.querySelector('input');
  const topic = form.querySelector('select');
  const clean = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function filter() {
    const term = clean(search.value.trim());
    let count = 0;
    for (const group of document.querySelectorAll('.archive-year')) {
      let visible = 0;
      for (const row of group.querySelectorAll('.entry')) {
        row.hidden = !(clean(row.textContent).includes(term) && (!topic.value || row.dataset.topic === topic.value));
        if (!row.hidden) visible++;
      }
      group.hidden = !visible;
      count += visible;
    }
    document.querySelector('#archive-status').textContent = count === 0 ? 'Nenhuma publicação encontrada.' : count + (count === 1 ? ' publicação' : ' publicações');
  }
  form.hidden = false;
  form.addEventListener('input', filter);
  form.addEventListener('submit', e => e.preventDefault());
  filter();
}
