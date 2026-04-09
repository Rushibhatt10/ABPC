import { useNavigate } from 'react-router-dom';

const InsectEdgePopups = () => {
  const navigate = useNavigate();

  const base = {
    position: 'absolute',
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    zIndex: 40,
    lineHeight: 1,
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">

      {/* 🐜 Ant — left edge, 30% from top */}
      <button
        type="button"
        style={{ ...base, left: '1.5rem', top: '30%' }}
        className="pointer-events-auto"
        onClick={() => navigate('/insects')}
      >
        <span className="text-3xl sm:text-4xl md:text-5xl">🐜</span>
      </button>

      {/* 🪳 Cockroach — right edge, 45% from top */}
      <button
        type="button"
        style={{ ...base, right: '1.5rem', top: '45%' }}
        className="pointer-events-auto"
        onClick={() => navigate('/insects')}
      >
        <span className="text-3xl sm:text-4xl md:text-5xl">🪳</span>
      </button>

      {/* 🦟 Mosquito — bottom left, 25% from left */}
      <button
        type="button"
        style={{ ...base, left: '25%', bottom: '2rem' }}
        className="pointer-events-auto"
        onClick={() => navigate('/insects')}
      >
        <span className="text-3xl sm:text-4xl md:text-5xl">🦟</span>
      </button>

      {/* 🐛 Caterpillar — top right, 20% from right */}
      <button
        type="button"
        style={{ ...base, right: '20%', top: '15%' }}
        className="pointer-events-auto"
        onClick={() => navigate('/insects')}
      >
        <span className="text-3xl sm:text-4xl md:text-5xl">🐛</span>
      </button>

    </div>
  );
};

export default InsectEdgePopups;
