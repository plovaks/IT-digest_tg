import { useEffect } from 'react';

export function ThemeWrapper({ children }) {
  useEffect(() => {
    
    const style = document.createElement('style');
    style.textContent = `
      
      :root {
        --tg-theme-bg-color: #ffffff !important;
        --tg-theme-text-color: #000000 !important;
        --tg-theme-hint-color: #999999 !important;
        --tg-theme-link-color: #1032A1 !important;
        --tg-theme-button-color: #1032A1 !important;
        --tg-theme-button-text-color: #ffffff !important;
        --tg-theme-secondary-bg-color: #f5f5f5 !important;
        --tg-viewport-height: 100vh !important;
      }
      
      
      body, html, #root {
        background-color: #ffffff !important;
      }
      
      
      * {
        background-color: inherit;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return children;
}