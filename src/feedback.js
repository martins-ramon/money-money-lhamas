import { JOBS } from './model.js';

export function celebrate(root, title, detail, reducedMotion = false) {
  root.replaceChildren();
  const banner = document.createElement('div'); banner.className = 'achievement';
  const medal = document.createElement('span'); medal.className = 'achievement-medal'; medal.textContent = '★';
  const copy = document.createElement('div');
  const label = document.createElement('small'); label.textContent = 'A LITTLE HOOFSTEP. A BIG WIN.';
  const heading = document.createElement('strong'); heading.textContent = title;
  const description = document.createElement('span'); description.textContent = detail;
  copy.append(label, heading, description); banner.append(medal, copy); root.append(banner);
  if (!reducedMotion) {
    for (let i = 0; i < 44; i++) {
      const piece = document.createElement('i'); piece.className = 'confetti';
      piece.style.cssText = `--x:${Math.random() * 100}vw;--drift:${(Math.random() - 0.5) * 240}px;--spin:${(Math.random() - 0.5) * 1080}deg;--delay:${Math.random() * 0.5}s;background:${['#ffd94d', '#c8b4f2', '#8fd4ff', '#9dd39a', '#ff6b6b'][i % 5]}`;
      root.append(piece);
    }
  }
  // Each burst owns its nodes so an older timeout cannot erase a newer award.
  const pieces = [...root.querySelectorAll('.confetti')]; setTimeout(() => { banner.remove(); pieces.forEach(p => p.remove()); }, 4500);
}

export function drawMap(canvas, world, target, state, rent) {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const size = canvas.width, scale = size / 104, center = size / 2;
  const point = p => [center + p.x * scale, center + p.z * scale];
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = world.stage === 'moon' ? '#23263f' : '#deebcf'; ctx.fillRect(0, 0, size, size);
  if (world.stage !== 'moon') {
    ctx.strokeStyle = '#b0b2ab'; ctx.lineWidth = 6 * scale;
    for (const [x, z] of [[0, 0], [-22, -24], [22, 24]]) {
      ctx.beginPath(); ctx.moveTo(center + x * scale, 6); ctx.lineTo(center + x * scale, size - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, center + z * scale); ctx.lineTo(size - 6, center + z * scale); ctx.stroke();
    }
  }
  if (target) {
    const [px, py] = point(world.player.pos), [tx, ty] = point(target.position);
    ctx.strokeStyle = '#ae7000'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
  }
  for (const it of world.interactables) {
    if ((it.type === 'moon') !== (world.stage === 'moon') || !world.available(it)) continue;
    if (it.type === 'home' && !world.plot.visible) continue;
    const [x, y] = point(it.position), selected = it.id === target?.id;
    const jobIndex = JOBS.findIndex(j => j.id === it.id);
    ctx.fillStyle = selected ? '#ffd94d' : state.shifts[it.id] ? '#45945b' : '#fffaf0';
    ctx.strokeStyle = '#2b2a33'; ctx.lineWidth = selected ? 2.5 : 1;
    ctx.beginPath(); ctx.arc(x, y, selected ? 8 : 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (jobIndex >= 0) { ctx.fillStyle = '#2b2a33'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(jobIndex + 1), x, y + 3); }
  }
  if (rent && world.stage !== 'moon') {
    ctx.fillStyle = '#43885b';
    world.hiding.forEach(p => { const [x, y] = point(p); ctx.fillRect(x - 3, y - 3, 6, 6); });
    const [x, y] = point(world.barriga.position); ctx.fillStyle = '#de4d48'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  }
  const [x, y] = point(world.player.pos);
  ctx.save(); ctx.translate(x, y); ctx.rotate(-world.yaw);
  ctx.fillStyle = '#2b2a33'; ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.fillStyle = world.stage === 'moon' ? '#fffaf0' : '#2b2a33'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('N', center, 13);
}
