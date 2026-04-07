const fs = require('fs');
let code = fs.readFileSync('./src/page/landing.jsx', 'utf8');

code = code.replace(
  /className=\{`fixed inset-0 z-60 flex transition-all duration-500 \$\{menuOpen \?"opacity-100 pointer-events-auto" :"opacity-0 pointer-events-none"\} \$\{isDark \?"bg-\[#0a0a0a\]\/30 backdrop-blur-3xl" :"bg-white\/30 backdrop-blur-3xl"\}[\s\S]*?onClick=\{\(e\) => \{ if \(e\.currentTarget === e\.target\) setMenuOpen\(false\); \}\}/m,
  `className={\`fixed inset-0 z-60 flex transition-all duration-500 \${menuOpen ?"opacity-100 pointer-events-auto" :"opacity-0 pointer-events-none"} \${isDark ?"bg-black/40" :"bg-white/40"}\`}
  style={{ WebkitBackdropFilter: "blur(30px)", backdropFilter: "blur(30px)" }}
  onClick={(e) => { if (e.currentTarget === e.target) setMenuOpen(false); }}`
);

fs.writeFileSync('./src/page/landing.jsx', code);
console.log('Done!');
