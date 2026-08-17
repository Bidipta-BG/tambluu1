"use client";

import { useState } from "react";
import type { PosterTemplate, Game } from "@/types";
import CanvasEditor from "./CanvasEditor";

interface PosterMakerClientProps {
  initialTemplates: PosterTemplate[];
  game: Game | null;
  tenantInfo?: { whatsappNumber?: string | null };
}

export default function PosterMakerClient({ initialTemplates, game, tenantInfo }: PosterMakerClientProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PosterTemplate | null>(null);

  // Auto-map current game data into expected fields
  const buildInitialData = () => {
    const data: Record<string, string> = {};
    if (game) {
      if (game.scheduled_at) {
        data["game_date"] = new Date(game.scheduled_at).toLocaleString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      }
      data["ticket_price"] = `₹${game.ticket_price}`;
      // Note: mapping specific prize amounts would require fetching the dividends for this game.
      // Assuming a generic default or we could pass dividends down if needed.
    }
    if (tenantInfo?.whatsappNumber) {
      data["whatsapp"] = tenantInfo.whatsappNumber;
    }
    return data;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-50">Poster Maker</h1>
          <p className="text-sm text-slate-400 mt-1">Generate promotional images for your games.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {initialTemplates.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-slate-800 border-dashed rounded-2xl bg-slate-900/50">
            <p className="text-slate-400">No poster templates available.</p>
          </div>
        ) : (
          initialTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className="group flex flex-col text-left rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all"
            >
              <div className="aspect-[3/4] w-full bg-slate-800 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={template.thumbnail_url || template.background_url} 
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-200">{template.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Click to edit &rarr;</p>
              </div>
            </button>
          ))
        )}
      </div>

      {selectedTemplate && (
        <CanvasEditor
          template={selectedTemplate}
          initialData={buildInitialData()}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
