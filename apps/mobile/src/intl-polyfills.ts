/**
 * Hermes ships DateTimeFormat/NumberFormat but not (on all platforms/versions)
 * Intl.PluralRules, which ICU plural messages need. The polyfill only installs
 * itself when the engine lacks support.
 */
import '@formatjs/intl-pluralrules/polyfill';
import '@formatjs/intl-pluralrules/locale-data/de';
import '@formatjs/intl-pluralrules/locale-data/en';
import '@formatjs/intl-pluralrules/locale-data/fr';
import '@formatjs/intl-pluralrules/locale-data/ar';
import '@formatjs/intl-pluralrules/locale-data/es';
import '@formatjs/intl-pluralrules/locale-data/ru';
import '@formatjs/intl-pluralrules/locale-data/zh';
