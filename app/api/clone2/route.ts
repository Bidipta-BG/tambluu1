export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const themesDir = path.join(process.cwd(), 'app/(public)/_components/themes');
    const sourcePath = path.join(themesDir, 'NortheastDashboard.tsx');
    const sourceCode = fs.readFileSync(sourcePath, 'utf-8');

    // Helper to generate a theme
    const generateTheme = (
      fileName: string,
      componentName: string,
      themeName: string,
      replacements: { search: string | RegExp; replace: string }[]
    ) => {
      let newCode = sourceCode
        .replace(/NortheastDashboard/g, componentName)
        .replace(/Northeast Essence/g, themeName);
      
      for (const r of replacements) {
        newCode = newCode.replace(new RegExp(r.search, 'g'), r.replace);
      }
      
      fs.writeFileSync(path.join(themesDir, fileName), newCode, 'utf-8');
    };

    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // 1. Color Splash
    generateTheme('ColorSplashDashboard.tsx', 'ColorSplashDashboard', 'Color Splash', [
      { search: escapeRegExp('from-[#1a3c2a] via-[#0d2a1b] to-[#0a1f13]'), replace: 'from-pink-50 via-white to-cyan-50' },
      { search: escapeRegExp('text-[#f1e5c3]'), replace: 'text-pink-600' },
      { search: escapeRegExp('bg-[#163725] text-white'), replace: 'bg-pink-500 text-white' },
      { search: escapeRegExp('bg-[#163725]'), replace: 'bg-white' },
      { search: escapeRegExp('bg-[#eef0e5] p-3 shadow-lg border-2 border-[#163725]'), replace: 'bg-white p-3 shadow-lg border-2 border-pink-300' },
      { search: escapeRegExp('text-[#163725]'), replace: 'text-purple-800' },
      { search: escapeRegExp('bg-[#0d2a1b]'), replace: 'bg-pink-50' },
      { search: escapeRegExp('bg-[#faf8f0]'), replace: 'bg-white' },
      { search: escapeRegExp('border-[#163725]'), replace: 'border-pink-300' },
      { search: escapeRegExp('bg-[#eef0e5] text-purple-800'), replace: 'bg-white text-pink-600' },
      { search: escapeRegExp('bg-gradient-to-b from-[#d8dfc4]'), replace: 'bg-gradient-to-b from-pink-100' },
      { search: escapeRegExp('border-yellow-400 bg-yellow-50'), replace: 'border-pink-400 bg-pink-50' },
      { search: escapeRegExp('border-yellow-200 bg-yellow-100'), replace: 'border-pink-200 bg-pink-100' },
      { search: escapeRegExp('border-yellow-200'), replace: 'border-pink-200' },
      { search: escapeRegExp('bg-[#0a2617] border border-[#143a24]'), replace: 'bg-white border border-pink-200 text-purple-800' },
      { search: escapeRegExp('text-white placeholder-[#4a6b57] focus:border-[#1e4e31]'), replace: 'text-purple-800 placeholder-pink-300 focus:border-pink-500' },
      { search: escapeRegExp('bg-[#0c2e1c] font-sans text-white'), replace: 'bg-white font-sans text-purple-800' },
    ]);

    // 2. Neon Night
    generateTheme('NeonDashboard.tsx', 'NeonDashboard', 'Neon Night', [
      { search: escapeRegExp('from-[#1a3c2a] via-[#0d2a1b] to-[#0a1f13]'), replace: 'from-[#050505] via-[#111] to-[#000]' },
      { search: escapeRegExp('text-[#f1e5c3]'), replace: 'text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' },
      { search: escapeRegExp('bg-[#163725] text-white'), replace: 'bg-purple-900 text-pink-300' },
      { search: escapeRegExp('bg-[#163725]'), replace: 'bg-[#111]' },
      { search: escapeRegExp('bg-[#eef0e5] p-3 shadow-lg border-2 border-[#163725]'), replace: 'bg-black p-3 shadow-[0_0_15px_rgba(236,72,153,0.2)] border border-pink-500' },
      { search: escapeRegExp('text-[#163725]'), replace: 'text-cyan-400' },
      { search: escapeRegExp('bg-[#0d2a1b]'), replace: 'bg-black' },
      { search: escapeRegExp('bg-[#faf8f0]'), replace: 'bg-[#111]' },
      { search: escapeRegExp('border-[#163725]'), replace: 'border-purple-500' },
      { search: escapeRegExp('bg-[#eef0e5] text-cyan-400'), replace: 'bg-black text-purple-400' },
      { search: escapeRegExp('bg-gradient-to-b from-[#d8dfc4]'), replace: 'bg-gradient-to-b from-[#222]' },
      { search: escapeRegExp('border-yellow-400 bg-yellow-50'), replace: 'border-pink-500 bg-pink-900/30' },
      { search: escapeRegExp('border-yellow-200 bg-yellow-100'), replace: 'border-purple-500 bg-purple-900/30' },
      { search: escapeRegExp('border-yellow-200'), replace: 'border-purple-500' },
      { search: escapeRegExp('bg-[#0a2617] border border-[#143a24]'), replace: 'bg-black border border-purple-500 text-cyan-400' },
      { search: escapeRegExp('text-white placeholder-[#4a6b57] focus:border-[#1e4e31]'), replace: 'text-cyan-400 placeholder-purple-500 focus:border-pink-500' },
      { search: escapeRegExp('bg-[#0c2e1c] font-sans text-white'), replace: 'bg-black font-sans text-cyan-400' },
    ]);

    // 3. Royal Tambola
    generateTheme('RoyalDashboard.tsx', 'RoyalDashboard', 'Royal Tambola', [
      { search: escapeRegExp('from-[#1a3c2a] via-[#0d2a1b] to-[#0a1f13]'), replace: 'from-[#0f172a] via-[#020617] to-[#000000]' },
      { search: escapeRegExp('text-[#f1e5c3]'), replace: 'text-yellow-500' },
      { search: escapeRegExp('bg-[#163725] text-white'), replace: 'bg-yellow-600 text-black' },
      { search: escapeRegExp('bg-[#163725]'), replace: 'bg-[#1e293b]' },
      { search: escapeRegExp('bg-[#eef0e5] p-3 shadow-lg border-2 border-[#163725]'), replace: 'bg-[#0f172a] p-3 shadow-lg border border-yellow-600/50' },
      { search: escapeRegExp('text-[#163725]'), replace: 'text-yellow-400' },
      { search: escapeRegExp('bg-[#0d2a1b]'), replace: 'bg-[#020617]' },
      { search: escapeRegExp('bg-[#faf8f0]'), replace: 'bg-[#0f172a]' },
      { search: escapeRegExp('border-[#163725]'), replace: 'border-yellow-600/50' },
      { search: escapeRegExp('bg-[#eef0e5] text-yellow-400'), replace: 'bg-[#0f172a] text-yellow-600' },
      { search: escapeRegExp('bg-gradient-to-b from-[#d8dfc4]'), replace: 'bg-gradient-to-b from-[#1e293b]' },
      { search: escapeRegExp('border-yellow-400 bg-yellow-50'), replace: 'border-yellow-500 bg-yellow-900/40' },
      { search: escapeRegExp('border-yellow-200 bg-yellow-100'), replace: 'border-yellow-600/80 bg-yellow-900/20' },
      { search: escapeRegExp('border-yellow-200'), replace: 'border-yellow-600/50' },
      { search: escapeRegExp('bg-[#0a2617] border border-[#143a24]'), replace: 'bg-[#0f172a] border border-yellow-600/50 text-yellow-400' },
      { search: escapeRegExp('text-white placeholder-[#4a6b57] focus:border-[#1e4e31]'), replace: 'text-yellow-400 placeholder-yellow-600/50 focus:border-yellow-500' },
      { search: escapeRegExp('bg-[#0c2e1c] font-sans text-white'), replace: 'bg-[#0f172a] font-sans text-yellow-400' },
    ]);

    return NextResponse.json({ success: true, message: 'Themes cloned with regex' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
