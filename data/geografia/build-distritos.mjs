import {writeFile} from 'node:fs/promises';

function geometry(features) {
  const xScale = Math.cos(-23.55 * Math.PI / 180);
  const project = ([longitude, latitude]) => [(longitude + 46.85) * xScale * 1000, (-23.34 - latitude) * 1000];
  function simplify(points, tolerance = 0.23) {
    if (points.length < 3) return points;
    const [x, y] = points[0], [ex, ey] = points[points.length - 1];
    const dx = ex - x, dy = ey - y, norm = dx * dx + dy * dy;
    let furthest = 0, split = -1;
    for (let i = 1; i < points.length - 1; i++) {
      const [px, py] = points[i];
      const t = norm ? Math.max(0, Math.min(1, ((px-x)*dx + (py-y)*dy)/norm)) : 0;
      const dist = Math.hypot(px-x-t*dx, py-y-t*dy);
      if (dist > furthest) { furthest = dist; split = i; }
    }
    if (furthest <= tolerance) return [points[0], points[points.length-1]];
    return [...simplify(points.slice(0,split+1), tolerance).slice(0,-1), ...simplify(points.slice(split), tolerance)];
  }
  return features.map(({properties:p,geometry:g}) => {
    const polygons = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
    const path = polygons.flatMap(poly => poly.map(ring => {
      const points = simplify(ring.map(project));
      if (points.length < 4) return '';
      return 'M'+points.slice(0,-1).map(pt => pt.map(n => +n.toFixed(1)).join(',')).join('L')+'Z';
    })).join('');
    if (!path) throw new Error('Empty district geometry: '+p.ds_nome);
    return {id:p.ds_codigo,name:p.ds_nome,path};
  }).sort((a,b) => a.id.localeCompare(b.id));
}

const blob = 'e0ed3007a8a579a4fedb55fd1e80b940aea9f64f';
const response = await fetch('https://api.github.com/repos/codigourbano/distritos-sp/git/blobs/'+blob);
if (!response.ok) throw new Error('GitHub '+response.status);
const file = await response.json();
const input = JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));
const districts = geometry(input.features);
if (districts.length !== 96) throw new Error('Expected 96 districts');
await writeFile(new URL('distritos.json',import.meta.url),JSON.stringify({source:'https://github.com/codigourbano/distritos-sp',blob,districts}));
