
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("Initializing Chef O's Cooking Solution...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("System mounted successfully.");
} catch (error) {
  console.error("Critical rendering error:", error);
  rootElement.innerHTML = `
    <div style="padding: 2rem; color: #ef4444; background: #1e293b; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; font-family: sans-serif;">
      <div>
        <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">시스템 로드 오류</h1>
        <p style="color: #94a3b8;">환경 설정 또는 브라우저 호환성 문제로 앱을 실행할 수 없습니다.</p>
        <pre style="margin-top: 1rem; font-size: 0.8rem; background: #0f172a; padding: 1rem; border-radius: 0.5rem; overflow: auto; max-width: 90vw; color: #ef4444; border: 1px solid #ef4444;">${error instanceof Error ? error.message : String(error)}</pre>
        <button onclick="window.location.reload()" style="margin-top: 1.5rem; background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer;">새로고침</button>
      </div>
    </div>
  `;
}
