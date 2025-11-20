// controla carrossel de próximos eventos (setas e touch/scroll)
// agora attach por carrossel para evitar problemas quando houver múltiplos
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.carousel').forEach(carousel => {
    const prev = carousel.querySelector('.carousel-nav.prev');
    const next = carousel.querySelector('.carousel-nav.next');
    const track = carousel.querySelector('.carousel-track');
    if (!track) return;

    function scrollByCard(direction = 1){
      const card = track.querySelector('.carousel-card');
      if (!card) return;
      // gap pode ser string, tentar obter valor numérico
      const gapStr = getComputedStyle(track).gap || getComputedStyle(track).columnGap || '12px';
      const gap = Number(String(gapStr).replace('px','')) || 12;
      const step = card.offsetWidth + gap;
      track.scrollBy({ left: step * direction, behavior: 'smooth' });
    }

    prev?.addEventListener('click', (e) => { e.preventDefault(); scrollByCard(-1); });
    next?.addEventListener('click', (e) => { e.preventDefault(); scrollByCard(1); });

    // permite teclado quando o foco está dentro do carrossel
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByCard(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCard(1); }
    });

    // melhora acessibilidade: torna o track focusable
    track.setAttribute('tabindex', '0');
  });
});