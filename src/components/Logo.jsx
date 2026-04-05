
export default function Logo({ className ="", variant ="stacked" }) {
 const isHorizontal = variant ==="horizontal";

 return (
 <div className={`flex ${isHorizontal ? 'flex-row items-center justify-start gap-3' : 'flex-col items-center justify-center w-full'} ${className}`}>
 {/* Icon Area */}
 <div className={`${isHorizontal ? 'w-12 md:w-14 shrink-0' : 'w-[30%] min-w-[120px] max-w-[280px] mb-4 sm:mb-8'}`}>
 <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
 {/* Red Background Circle */}
 <circle cx="50" cy="50" r="48" fill="#F04925" />
 
 {/* Bug Head and Horns */}
 <path 
 d="M 38 34 
 C 38 25, 41 22, 44 22 
 C 42 15, 38 10, 38 10 
 C 44 12, 48 18, 48 24 
 C 49 24.5, 51 24.5, 52 24 
 C 52 18, 56 12, 62 10 
 C 62 10, 58 15, 56 22 
 C 59 22, 62 25, 62 34 Z" 
 fill="white" 
 />
 
 {/* Shield Outline */}
 <path 
 d="M 28 35 
 L 72 35 
 C 72 58, 64 78, 50 88 
 C 36 78, 28 58, 28 35 Z" 
 fill="none" 
 stroke="white" 
 strokeWidth="5" 
 strokeLinejoin="round" 
 />
 
 {/* Keyhole */}
 <circle cx="50" cy="49" r="4" fill="white" />
 <path d="M 48 51 L 46 64 L 54 64 L 52 51 Z" fill="white" />
 </svg>
 </div>

 {/* Typography Area */}
 {isHorizontal ? (
 <div className="flex flex-col text-left select-none">
  <span 
  className="uppercase leading-none tracking-tight whitespace-nowrap" 
  style={{ 
  fontFamily: '"Bebas Neue", Impact, "Arial Narrow", sans-serif', 
  fontSize: '1.8rem',
  color: '#8AA844', 
  transform: 'scaleY(1.1)', 
  transformOrigin: 'left top',
  fontWeight: 400
  }}
  >
  A.B. Pest Control
  </span>
 <span 
 className="uppercase font-medium pt-1 whitespace-nowrap" 
 style={{ 
 fontFamily: 'Montserrat,"Segoe UI", Arial, sans-serif', 
 fontSize: '0.6rem',
 color: '#F04925',
 letterSpacing: '0.35em',
 }}
 >
 Insecticide Services
 </span>
 </div>
 ) : (
 <div className="flex flex-col items-center text-center select-none w-full">
 {/* Main Title */}
  <div 
  className="uppercase leading-none w-full flex justify-center whitespace-nowrap" 
  style={{ 
  fontFamily: '"Bebas Neue", Impact, "Arial Narrow", sans-serif', 
  fontSize: 'min(15vw, 8rem)',
  color: '#8AA844',
  transform: 'scaleY(1.15)', 
  transformOrigin: 'top',
  letterSpacing: '0.02em',
  lineHeight: 1,
  fontWeight: 400
  }}
  >
  A.B. PEST CONTROL
  </div>
 
 {/* Subtitle */}
 <div 
 className="uppercase font-medium pt-8 sm:pt-10 md:pt-14 w-[85%] mx-auto flex justify-center whitespace-nowrap" 
 style={{ 
 fontFamily: 'Montserrat,"Segoe UI", Arial, sans-serif', 
 fontSize: 'min(3vw, 1.6rem)',
 color: '#F04925',
 letterSpacing: '0.55em',
 marginRight: '-0.55em',
 lineHeight: 1
 }}
 >
 INSECTICIDE SERVICES
 </div>
 </div>
 )}
 </div>
 );
}
