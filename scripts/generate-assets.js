const fs = require('fs');
const path = require('path');

const icons = {
  'maguey.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 58V14" />
    <path d="M32 58C32 40 20 28 10 24C12 38 22 52 32 58Z" fill="#159F9B" fill-opacity="0.25"/>
    <path d="M32 58C32 40 44 28 54 24C52 38 42 52 32 58Z" fill="#159F9B" fill-opacity="0.25"/>
    <path d="M32 58C32 44 24 38 18 36" />
    <path d="M32 58C32 44 40 38 46 36" />
    <polygon points="28,8 32,4 36,8 32,14" fill="currentColor"/>
    <polyline points="10,24 6,20 8,18 13,22" />
    <polyline points="54,24 58,20 56,18 51,22" />
  </svg>`,
  'chile.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M38 14C36 8 38 4 44 4" />
    <path d="M30 14C32 16 38 16 42 14C44 18 42 20 38 20C34 20 30 18 30 14Z" fill="#159F9B"/>
    <path d="M34 18C44 24 46 38 40 48C34 58 24 60 16 58C14 57 16 53 20 50C30 42 32 30 32 20" fill="#C94E8F" fill-opacity="0.3"/>
  </svg>`,
  'limon.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="26" fill="#159F9B" fill-opacity="0.2"/>
    <circle cx="32" cy="32" r="20" stroke-dasharray="3 3"/>
    <path d="M32 12V52" />
    <path d="M12 32H52" />
    <path d="M18 18L46 46" />
    <path d="M18 46L46 18" />
    <circle cx="32" cy="32" r="4" fill="currentColor"/>
  </svg>`,
  'hierbas.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 54C28 46 38 32 46 12" />
    <path d="M46 12C38 16 34 24 38 30C42 24 46 18 46 12Z" fill="#159F9B" fill-opacity="0.35"/>
    <path d="M32 32C24 34 20 40 24 46C28 42 32 38 32 32Z" fill="#159F9B" fill-opacity="0.35"/>
    <path d="M38 24C44 26 48 32 46 38C42 36 40 30 38 24Z" fill="#159F9B" fill-opacity="0.35"/>
    <path d="M24 44C18 46 14 50 16 56C20 54 22 50 24 44Z" fill="#159F9B" fill-opacity="0.35"/>
  </svg>`,
  'tortilla.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="32" cy="36" rx="26" ry="18" fill="#F8D0B0" fill-opacity="0.6"/>
    <ellipse cx="32" cy="30" rx="24" ry="16" fill="#FDF6EC"/>
    <path d="M18 28C22 24 28 26 30 30" stroke-dasharray="2 3"/>
    <path d="M34 26C38 24 44 28 42 32" stroke-dasharray="2 3"/>
    <circle cx="24" cy="32" r="2" fill="#E87850"/>
    <circle cx="38" cy="30" r="1.5" fill="#E87850"/>
    <circle cx="32" cy="35" r="1.5" fill="#E87850"/>
  </svg>`,
  'calavera.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 28C16 16 23 8 32 8C41 8 48 16 48 28C48 36 44 40 44 44H20C20 40 16 36 16 28Z" fill="#FDF6EC"/>
    <path d="M20 44V54C20 56 22 56 26 56H38C42 56 44 56 44 54V44" fill="#FDF6EC"/>
    <circle cx="25" cy="28" r="5" fill="#176A78"/>
    <circle cx="39" cy="28" r="5" fill="#176A78"/>
    <polygon points="32,34 29,40 35,40" fill="#C94E8F"/>
    <path d="M26 48V54M32 48V54M38 48V54" />
    <polygon points="32,12 34,17 39,17 35,20 37,25 32,22 27,25 29,20 25,17 30,17" fill="#C94E8F"/>
  </svg>`,
  'sol.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="14" fill="#E87850" fill-opacity="0.4"/>
    <path d="M32 6V12M32 52V58M6 32H12M52 32H58M14 14L18 18M46 46L50 50M14 50L18 46M46 18L50 14" />
    <path d="M32 28C30 28 28 30 28 32C28 34 30 36 32 36C34 36 36 34 36 32" />
  </svg>`,
  'luna.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M38 10C24 10 14 20 14 34C14 48 25 56 38 56C42 56 47 54 50 52C40 50 32 42 32 32C32 20 40 13 50 12C46 10 42 10 38 10Z" fill="#176A78" fill-opacity="0.35"/>
    <polygon points="46,20 48,25 53,25 49,28 51,33 46,30 42,33 44,28 40,25 45,25" fill="#C94E8F"/>
  </svg>`,
  'pocima.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M26 10H38V18L46 32C52 42 46 54 32 54C18 54 12 42 18 32L26 18V10Z" fill="#C94E8F" fill-opacity="0.25"/>
    <path d="M24 10H40" />
    <rect x="28" y="4" width="8" height="6" rx="1" fill="#E87850"/>
    <path d="M20 40C24 38 28 42 32 40C36 38 40 42 44 40" stroke="#159F9B"/>
    <circle cx="28" cy="46" r="2" fill="#159F9B"/>
    <circle cx="36" cy="48" r="1.5" fill="#159F9B"/>
  </svg>`,
  'corazon.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 54C28 50 12 38 12 24C12 16 18 10 26 10C30 10 31 12 32 14C33 12 34 10 38 10C46 10 52 16 52 24C52 38 36 50 32 54Z" fill="#C94E8F" fill-opacity="0.35"/>
    <path d="M32 10V4M28 6L36 6" />
    <path d="M24 8L20 4M40 8L44 4" />
  </svg>`,
  'estrella.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 4C32 20 34 32 48 32C34 32 32 44 32 60C32 44 30 32 16 32C30 32 32 20 32 4Z" fill="#E87850" fill-opacity="0.35"/>
  </svg>`,
  'maiz.svg': `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8C26 8 22 20 22 36C22 46 26 52 32 56C38 52 42 46 42 36C42 20 38 8 32 8Z" fill="#F8D0B0" fill-opacity="0.6"/>
    <path d="M20 54C16 46 14 36 16 26C18 36 22 46 28 54" stroke="#159F9B" fill="#159F9B" fill-opacity="0.25"/>
    <path d="M44 54C48 46 50 36 48 26C46 36 42 46 36 54" stroke="#159F9B" fill="#159F9B" fill-opacity="0.25"/>
    <path d="M32 14V50M27 20H37M25 28H39M25 36H39M27 44H37" />
  </svg>`
};

const iconsDir = path.join(__dirname, '..', 'public', 'assets', 'icons');
for (const [filename, content] of Object.entries(icons)) {
  fs.writeFileSync(path.join(iconsDir, filename), content.trim());
}
console.log('Icons generated successfully.');

const patternsDir = path.join(__dirname, '..', 'public', 'assets', 'patterns');
const magueyPattern = `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g opacity="0.10">
    <path d="M60 20C60 40 40 50 30 55C40 60 50 70 60 100C70 70 80 60 90 55C80 50 60 40 60 20Z" fill="#C94E8F"/>
    <path d="M0 20C0 40 10 50 15 55C10 60 0 70 0 100C5 70 15 60 25 55C15 50 0 40 0 20Z" fill="#159F9B"/>
    <path d="M120 20C120 40 110 50 105 55C110 60 120 70 120 100C115 70 105 60 95 55C105 50 120 40 120 20Z" fill="#159F9B"/>
  </g>
</svg>`;

const rombosPattern = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g opacity="0.12">
    <path d="M24 4L44 24L24 44L4 24Z" stroke="#E87850" stroke-width="2" fill="#F8D0B0" fill-opacity="0.3"/>
    <circle cx="24" cy="24" r="3" fill="#C94E8F"/>
  </g>
</svg>`;

const ondasPattern = `<svg width="100%" height="24" viewBox="0 0 1200 24" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <path d="M0 12 Q 150 0 300 12 T 600 12 T 900 12 T 1200 12 V 24 H 0 Z" fill="#159F9B" opacity="0.25"/>
  <path d="M0 16 Q 150 6 300 16 T 600 16 T 900 16 T 1200 16" stroke="#159F9B" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

fs.writeFileSync(path.join(patternsDir, 'maguey-pattern.svg'), magueyPattern.trim());
fs.writeFileSync(path.join(patternsDir, 'rombos-pattern.svg'), rombosPattern.trim());
fs.writeFileSync(path.join(patternsDir, 'ondas-pattern.svg'), ondasPattern.trim());
console.log('Patterns generated successfully.');
