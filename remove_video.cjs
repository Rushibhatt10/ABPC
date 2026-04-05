const fs = require('fs');

let content = fs.readFileSync('./src/page/insects.jsx', 'utf8');

// Remove showIntroVideo and isVideoOpen state
content = content.replace(/ const \[showIntroVideo, setShowIntroVideo\] = useState\(true\);\n/g, '');
content = content.replace(/ const \[isVideoOpen, setIsVideoOpen\] = useState\(false\);\n/g, '');

// Remove if (showIntroVideo) return;
content = content.replace(/ if \(showIntroVideo\) return;\n/g, '');

// Update useEffect dependency
content = content.replace(/}, \[activeSlide, showIntroVideo, unlockAnimation\]\);/g, '}, [activeSlide, unlockAnimation]);');

// Remove showIntroVideo block
const introVideoRegex = / const enterSlides = \(\) => \{\n setShowIntroVideo\(false\);\n \};\n\n if \(showIntroVideo\) \{\n return \([\s\S]*?\n \);\n \}\n/m;
content = content.replace(introVideoRegex, '');

// Replace button with Link
const buttonRegex = /<button\n type="button"\n onClick=\{\(\) => setIsVideoOpen\(true\)\}\n className=\{`inline-flex([\s\S]*?)<\/button>/m;
const linkReplacement = `<Link\n to="/video"\n className={\`inline-flex$1</Link>`;
content = content.replace(buttonRegex, linkReplacement);

// Remove isVideoOpen modal block
const modalRegex = / \{isVideoOpen && \([\s\S]*? \)\}\n/m;
content = content.replace(modalRegex, '');

fs.writeFileSync('./src/page/insects.jsx', content);
console.log('insects.jsx updated!');
