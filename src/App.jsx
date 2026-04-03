import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Landing from './page/landing.jsx';
import Preloader from './components/Preloader.jsx';
import Insects from './page/insects.jsx';

function App() {
  return (
    <ThemeProvider>
      <Preloader onComplete={() => console.log('App loaded')} />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path='/insects' element={<Insects />} />
          <Route path="/quote" element={<div className="min-h-screen flex items-center justify-center p-8 text-center transition-colors duration-700 bg-[#F5F7FB]"><h1 className="text-4xl font-black uppercase tracking-tighter opacity-10">Quote Page Coming Soon</h1></div>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

