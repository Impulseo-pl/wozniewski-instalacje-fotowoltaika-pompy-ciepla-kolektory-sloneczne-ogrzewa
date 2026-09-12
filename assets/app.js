/* ==========================================================================
   Woźniewski Instalacje — logika strony
   ========================================================================== */
(function () {
  'use strict';

  var spokojnie = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     1. EKRAN ŁADOWANIA
     ---------------------------------------------------------------------- */
  (function loader() {
    var el = document.getElementById('loader');
    if (!el) return;

    // długość ścieżek do animacji rysowania
    el.querySelectorAll('path').forEach(function (p) {
      var d = p.getTotalLength();
      p.style.setProperty('--dl', d);
    });

    var proc = document.getElementById('loader-proc');
    var etap = document.getElementById('loader-etap');
    var etapy = ['Przygotowanie instalacji', 'Dobór mocy', 'Podłączanie', 'Gotowe'];

    function koniec() {
      el.classList.add('znika');
      document.body.style.overflow = '';
      setTimeout(function () { el.remove(); }, 900);
    }

    // przy powrotach na stronę w tej samej sesji nie powtarzamy animacji
    if (spokojnie || sessionStorage.getItem('wi-loader') === '1') {
      el.remove();
      return;
    }
    sessionStorage.setItem('wi-loader', '1');

    document.body.style.overflow = 'hidden';

    var n = 0;
    var tik = setInterval(function () {
      n += Math.random() * 9 + 5;
      if (n >= 100) { n = 100; clearInterval(tik); setTimeout(koniec, 320); }
      proc.textContent = Math.floor(n);
      etap.textContent = etapy[Math.min(3, Math.floor(n / 27))];
    }, 95);

    // gdyby coś się zacięło — kurtyna i tak idzie w górę
    setTimeout(function () { if (document.getElementById('loader')) koniec(); }, 4200);
  })();

  /* ----------------------------------------------------------------------
     2. NAWIGACJA
     ---------------------------------------------------------------------- */
  (function nawigacja() {
    var nav = document.getElementById('nawigacja');
    var burger = document.getElementById('burger');
    var menu = document.getElementById('menu');

    function przyScrollu() {
      nav.classList.toggle('przyklejona', window.scrollY > 40);
    }
    przyScrollu();
    window.addEventListener('scroll', przyScrollu, { passive: true });

    burger.addEventListener('click', function () {
      var otwarte = menu.classList.toggle('otwarte');
      burger.classList.toggle('otwarty', otwarte);
      burger.setAttribute('aria-expanded', otwarte ? 'true' : 'false');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('otwarte');
        burger.classList.remove('otwarty');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  })();

  /* ----------------------------------------------------------------------
     3. WEJŚCIA W KADR + rysowanie ikon
     ---------------------------------------------------------------------- */
  (function wKadrze() {
    // ikony usług: ustaw długość ścieżki, żeby dało się je „narysować"
    document.querySelectorAll('.usluga__ikona.rysuj').forEach(function (svg) {
      var max = 0;
      svg.querySelectorAll('path, circle, rect').forEach(function (k) {
        var d = k.getTotalLength ? k.getTotalLength() : 300;
        if (d > max) max = d;
      });
      svg.style.setProperty('--d', Math.ceil(max) + 10);
    });

    if (!('IntersectionObserver' in window) || spokojnie) {
      document.querySelectorAll('.wjazd').forEach(function (n) { n.classList.add('widac'); });
      document.querySelectorAll('.usluga__ikona.rysuj').forEach(function (n) { n.classList.add('gotowa'); });
      return;
    }

    var obs = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) {
        if (!w.isIntersecting) return;
        w.target.classList.add('widac');
        var ikona = w.target.querySelector('.usluga__ikona.rysuj');
        if (ikona) ikona.classList.add('gotowa');
        obs.unobserve(w.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.wjazd').forEach(function (n) { obs.observe(n); });
  })();

  /* ----------------------------------------------------------------------
     4. KALKULATOR
     ---------------------------------------------------------------------- */
  (function kalkulator() {
    var suwak = document.getElementById('rachunek');
    if (!suwak) return;

    var CENA_KWH = 1.10;      // zł brutto za kWh, taryfa domowa
    var UZYSK = 1000;         // kWh rocznie z 1 kWp w naszym rejonie
    var WARTOSC_ODDANEJ = 0.55; // ile realnie wraca z nadwyżki oddanej do sieci

    var txt = document.getElementById('rachunek-txt');
    var pola = {
      moc: document.getElementById('w-moc'),
      prod: document.getElementById('w-prod'),
      rok: document.getElementById('w-rok'),
      dekada: document.getElementById('w-dekada')
    };
    var podpowiedz = document.getElementById('podpowiedz');
    var panelW = document.getElementById('s-panele-w');

    var teksty = {
      wegiel: 'Przy węglu największy skok robi pompa ciepła zasilana z własnych paneli — ogrzewanie i prąd schodzą wtedy z jednego źródła. Policzymy oba warianty na miejscu.',
      gaz: 'Przy gazie fotowoltaika sama w sobie zbija rachunek za prąd. Czy dołożyć pompę ciepła, zależy od ocieplenia domu — sprawdzimy to podczas oględzin.',
      prad: 'Grzejesz prądem, więc każda wyprodukowana kWh idzie wprost w rachunek. Tutaj magazyn energii zwykle najbardziej się opłaca.',
      pompa: 'Masz już pompę ciepła — fotowoltaika po prostu ją zasila. To najczystszy układ: prąd z dachu napędza ogrzewanie.'
    };

    function pl(n, miejsca) {
      return n.toLocaleString('pl-PL', {
        minimumFractionDigits: miejsca || 0,
        maximumFractionDigits: miejsca || 0
      });
    }

    // płynne przeliczanie liczby ze starej na nową
    function pokaz(el, docelowo, miejsca) {
      var start = parseFloat((el.dataset.v || '0'));
      el.dataset.v = docelowo;
      if (spokojnie) { el.textContent = pl(docelowo, miejsca); return; }

      var t0 = performance.now(), czas = 420;
      cancelAnimationFrame(el._raf);
      function krok(t) {
        var p = Math.min(1, (t - t0) / czas);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = pl(start + (docelowo - start) * e, miejsca);
        if (p < 1) el._raf = requestAnimationFrame(krok);
      }
      el._raf = requestAnimationFrame(krok);
    }

    function licz() {
      var rachunek = +suwak.value;
      var ogrz = document.querySelector('input[name=ogrz]:checked').value;
      var zMagazynem = document.querySelector('input[name=mag]:checked').value === 'tak';

      var zuzycieRoczne = rachunek * 12 / CENA_KWH;

      // moc z zapasem 15%, zaokrąglona do pół kilowata, w rozsądnych widełkach
      var moc = Math.round((zuzycieRoczne / UZYSK) * 1.15 * 2) / 2;
      moc = Math.max(2, Math.min(20, moc));

      var produkcja = moc * UZYSK;
      var auto = zMagazynem ? 0.65 : 0.30;

      var oszczednosc =
        produkcja * auto * CENA_KWH +
        produkcja * (1 - auto) * CENA_KWH * WARTOSC_ODDANEJ;

      // nie obiecujemy więcej, niż klient dziś płaci za prąd
      var sufit = rachunek * 12 * 1.05;
      if (oszczednosc > sufit) oszczednosc = sufit;

      pokaz(pola.moc, moc, 1);
      pokaz(pola.prod, Math.round(produkcja / 10) * 10, 0);
      pokaz(pola.rok, Math.round(oszczednosc / 10) * 10, 0);
      pokaz(pola.dekada, Math.round(oszczednosc * 10 / 100) * 100, 0);

      txt.textContent = pl(rachunek, 0);
      podpowiedz.textContent = teksty[ogrz];

      // ta sama moc ląduje na schemacie niżej
      if (panelW) panelW.textContent = pl(moc, 1) + ' kWp';
    }

    suwak.addEventListener('input', licz);
    document.getElementById('ogrzewanie').addEventListener('change', licz);
    document.getElementById('magazyn').addEventListener('change', licz);
    licz();
  })();

  /* ----------------------------------------------------------------------
     5. FORMULARZ „ODDZWOŃCIE"
     ---------------------------------------------------------------------- */
  (function oddzwon() {
    var f = document.getElementById('oddzwon');
    if (!f) return;

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var imie = f.imie.value.trim();
      var tel = f.telefon.value.trim();
      if (!imie || !tel) return;

      var moc = document.getElementById('w-moc').textContent;
      var rachunek = document.getElementById('rachunek-txt').textContent;

      var tresc =
        'Dzień dobry,\n\n' +
        'proszę o kontakt w sprawie wyceny.\n\n' +
        'Imię: ' + imie + '\n' +
        'Telefon: ' + tel + '\n' +
        'Rachunek za prąd: ' + rachunek + ' zł / mies.\n' +
        'Moc z kalkulatora: ' + moc + ' kWp\n';

      window.location.href =
        'mailto:wozniewski.instalacje@gmail.com' +
        '?subject=' + encodeURIComponent('Prośba o kontakt — wycena instalacji') +
        '&body=' + encodeURIComponent(tresc);

      document.getElementById('oddzwon-info').innerHTML =
        'Dziękujemy, ' + imie.replace(/[<>]/g, '') +
        '. Oddzwaniamy dziś w godzinach 7–18. Pilne? <a href="tel:+48797276160" style="color:var(--limonka)">797 276 160</a>.';
      f.reset();
    });
  })();

  /* ----------------------------------------------------------------------
     6. SCHEMAT: DZIEŃ / WIECZÓR
     ---------------------------------------------------------------------- */
  (function schemat() {
    var pulpit = document.querySelector('.przelacznik');
    if (!pulpit) return;

    var tory = {
      panele: document.getElementById('t-panele'),
      dom: document.getElementById('t-dom'),
      magazyn: document.getElementById('t-magazyn'),
      siec: document.getElementById('t-siec')
    };
    var slonce = document.getElementById('s-slonce');
    var ksiezyc = document.getElementById('s-ksiezyc');
    var panele = document.getElementById('s-panele');
    var opisDom = document.getElementById('s-dom-w');
    var opisSiec = document.getElementById('s-siec-w');

    function ustaw(pora) {
      var dzien = pora === 'dzien';

      slonce.style.opacity = dzien ? '1' : '0';
      ksiezyc.style.opacity = dzien ? '0' : '1';
      panele.classList.toggle('usypia', !dzien);

      // w dzień: panele → falownik → dom, nadwyżka do magazynu i do sieci
      // wieczorem: magazyn → falownik → dom, brakujące dobiera z sieci
      tory.panele.classList.toggle('gra', dzien);

      tory.magazyn.classList.add('gra');
      tory.magazyn.classList.toggle('wstecz', !dzien);

      tory.dom.classList.add('gra');

      tory.siec.classList.add('gra');
      tory.siec.classList.toggle('wstecz', !dzien);

      opisDom.textContent = dzien ? 'zasila panele' : 'zasila magazyn';
      opisSiec.textContent = dzien ? 'oddaje nadwyżkę' : 'dobiera brakujące';

      pulpit.querySelectorAll('button').forEach(function (b) {
        var wybrany = b.dataset.pora === pora;
        b.classList.toggle('wybrany', wybrany);
        b.setAttribute('aria-selected', wybrany ? 'true' : 'false');
      });
    }

    var recznie = false;
    pulpit.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      recznie = true;
      ustaw(b.dataset.pora);
    });

    ustaw('dzien');

    // dopóki nikt nie kliknie, schemat sam pokazuje obie pory
    if (!spokojnie) {
      var dzien = true;
      setInterval(function () {
        if (recznie) return;
        dzien = !dzien;
        ustaw(dzien ? 'dzien' : 'wieczor');
      }, 6500);
    }
  })();

  /* ----------------------------------------------------------------------
     7. POWIĘKSZANIE ZDJĘĆ
     ---------------------------------------------------------------------- */
  (function lupa() {
    var box = document.getElementById('lupa');
    var img = document.getElementById('lupa-img');
    var podpis = document.getElementById('lupa-podpis');
    var zamknij = document.getElementById('lupa-zamknij');
    var galeria = document.getElementById('galeria');
    if (!box || !galeria) return;

    function otworz(kafel) {
      img.src = kafel.dataset.duze;
      img.alt = kafel.dataset.podpis;
      podpis.textContent = kafel.dataset.podpis;
      box.classList.add('widoczna');
      document.body.style.overflow = 'hidden';
      zamknij.focus();
    }
    function zamknijLupe() {
      box.classList.remove('widoczna');
      document.body.style.overflow = '';
      img.src = '';
    }

    galeria.addEventListener('click', function (e) {
      var kafel = e.target.closest('.kafel');
      if (kafel) otworz(kafel);
    });
    zamknij.addEventListener('click', zamknijLupe);
    box.addEventListener('click', function (e) { if (e.target === box) zamknijLupe(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('widoczna')) zamknijLupe();
    });
  })();

})();
