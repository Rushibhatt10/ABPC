import React, { useEffect, useState } from 'react';
import { ThemeContext } from './theme-context';

export const ThemeProvider = ({ children }) => {
 const [theme, setTheme] = useState(() => {
 const stored = localStorage.getItem('abpc_theme');
 return stored === 'dark' || stored === 'light' ? stored : 'light';
 });

 useEffect(() => {
 document.documentElement.classList.toggle('dark', theme === 'dark');
 localStorage.setItem('abpc_theme', theme);
 }, [theme]);

 const toggleTheme = () => {
 setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
 };

 return (
 <ThemeContext.Provider value={{ theme, toggleTheme }}>
 {children}
 </ThemeContext.Provider>
 );
};
