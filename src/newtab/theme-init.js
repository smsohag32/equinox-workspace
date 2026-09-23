(function() {
  try {
    var t = localStorage.getItem('devora_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    var map = { dark:'#05070e', light:'#f3f4f8', developer:'#080d1c', cyberpunk:'#0a0a12', sunset:'#150d1a', emerald:'#061814' };
    var m = document.getElementById('theme-color-meta');
    if (m && map[t]) m.setAttribute('content', map[t]);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
