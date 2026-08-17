// Load canvas-confetti from CDN dynamically to avoid npm install issues
async function getConfetti() {
  if (typeof window === "undefined") return null;
  if ((window as any).confetti) return (window as any).confetti;
  
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js";
    script.onload = () => resolve((window as any).confetti);
    document.head.appendChild(script);
  });
}

export async function fireCelebration(): Promise<void> {
  try {
    const confetti: any = await getConfetti();
    if (!confetti) return;
    
    const colors = ["#eab308", "#f0ecd8", "#25D366", "#ff6b6b", "#60a5fa", "#a78bfa"];
    confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
    await delay(200);
    confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
    await delay(300);
    confetti({ particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.6 }, colors, startVelocity: 45 });
  } catch { /* silently ignore */ }
}

export async function fireWinnerConfetti(): Promise<void> {
  try {
    const confetti: any = await getConfetti();
    if (!confetti) return;
    confetti({ particleCount: 60, spread: 70, origin: { x: 0.5, y: 0.6 }, colors: ["#eab308", "#f0ecd8", "#fbbf24"], startVelocity: 30 });
  } catch { /* silently ignore */ }
}

export function playCelebrationSound(): void {
  try {
    const audio = new Audio("/sounds/celebration.mp3");
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch { /* silently ignore */ }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

