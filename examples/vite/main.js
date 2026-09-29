import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes';
import PhoneRemote from 'reveal.js-phone-remote';

import 'reveal.js/reveal.css';
import 'reveal.js/theme/white.css';

Reveal.initialize({
  hash: true,
  plugins: [Notes, PhoneRemote],
});
