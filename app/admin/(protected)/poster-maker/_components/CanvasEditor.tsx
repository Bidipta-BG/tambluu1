"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PosterTemplate, PosterTemplateField } from "@/types";

interface CanvasEditorProps {
  template: PosterTemplate;
  initialData: Record<string, string>;
  onClose: () => void;
}

export default function CanvasEditor({ template, initialData, onClose }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for the text values
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(initialData);
  
  // State for the currently edited field
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editStyle, setEditStyle] = useState<React.CSSProperties>({});

  // Render the canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Load background
    const bg = new Image();
    bg.crossOrigin = "anonymous";
    bg.src = template.background_url;
    
    bg.onload = () => {
      // Draw background
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

      // Draw all fields EXCEPT the one currently being edited (since that's handled by HTML overlay)
      template.layout.fields.forEach((field) => {
        if (field.id === editingFieldId) return;

        const text = fieldValues[field.id] ?? field.defaultText ?? "";
        
        ctx.font = `${field.fontSize}px ${field.fontFamily || "sans-serif"}`;
        ctx.fillStyle = field.color || "#000000";
        ctx.textAlign = (field.align || "left") as CanvasTextAlign;
        ctx.textBaseline = "top";

        ctx.fillText(text, field.x, field.y);
      });
    };
  }, [template, fieldValues, editingFieldId]);

  // Trigger render when values change or editing state changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle clicking on the canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editingFieldId) return; // Already editing something

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get click coordinates relative to the canvas internal resolution
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Find which field was clicked
    let clickedField: PosterTemplateField | null = null;

    for (const field of template.layout.fields) {
      const text = fieldValues[field.id] ?? field.defaultText ?? "";
      ctx.font = `${field.fontSize}px ${field.fontFamily || "sans-serif"}`;
      const metrics = ctx.measureText(text);
      
      // Calculate bounding box based on alignment
      let startX = field.x;
      if (field.align === "center") startX = field.x - metrics.width / 2;
      if (field.align === "right") startX = field.x - metrics.width;
      
      const endX = startX + metrics.width;
      
      // Rough height approximation since measureText height isn't fully reliable across browsers
      const startY = field.y;
      const endY = field.y + field.fontSize;

      // Add a small hit padding (e.g. 10px)
      const padding = 10;
      if (
        clickX >= startX - padding &&
        clickX <= endX + padding &&
        clickY >= startY - padding &&
        clickY <= endY + padding
      ) {
        clickedField = field;
        break;
      }
    }

    if (clickedField) {
      // Calculate CSS positions for the HTML overlay
      const text = fieldValues[clickedField.id] ?? clickedField.defaultText ?? "";
      
      // We need to position the input over the canvas based on screen pixels, not canvas internal resolution
      const cssX = (clickedField.x / scaleX);
      const cssY = (clickedField.y / scaleY);
      const cssFontSize = (clickedField.fontSize / scaleY);
      
      let transform = "translate(0, 0)";
      if (clickedField.align === "center") transform = "translate(-50%, 0)";
      if (clickedField.align === "right") transform = "translate(-100%, 0)";

      setEditStyle({
        left: `${cssX}px`,
        top: `${cssY}px`,
        fontSize: `${cssFontSize}px`,
        fontFamily: clickedField.fontFamily || "sans-serif",
        color: clickedField.color || "#000000",
        textAlign: clickedField.align || "left",
        transform,
      });
      setEditValue(text);
      setEditingFieldId(clickedField.id);
    }
  };

  const handleEditBlur = () => {
    if (editingFieldId) {
      setFieldValues(prev => ({
        ...prev,
        [editingFieldId]: editValue
      }));
      setEditingFieldId(null);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If currently editing, blur it first to commit the text to canvas
    if (editingFieldId) {
      handleEditBlur();
      // Wait a tick for the canvas to re-render
      setTimeout(() => triggerDownload(canvas), 50);
    } else {
      triggerDownload(canvas);
    }
  };

  const triggerDownload = (canvas: HTMLCanvasElement) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poster-${template.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png", 1.0);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div>
          <h2 className="text-lg font-bold text-slate-50">Editing Poster: {template.name}</h2>
          <p className="text-xs text-slate-400">Click any text on the poster to edit it</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Download PNG
          </button>
        </div>
      </div>

      {/* Editor Workspace */}
      <div className="flex-1 overflow-auto bg-slate-950 p-8 flex items-center justify-center">
        <div 
          ref={containerRef}
          className="relative shadow-2xl ring-1 ring-slate-800"
          style={{
            // Scale the display size to fit the screen reasonably, but keep native resolution for canvas
            maxWidth: "100%",
            maxHeight: "80vh",
            aspectRatio: `${template.width} / ${template.height}`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={template.width}
            height={template.height}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-text block"
            style={{ maxWidth: "100%", maxHeight: "80vh" }}
          />

          {/* Overlay HTML Input for editing */}
          {editingFieldId && (
            <input
              autoFocus
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  e.currentTarget.blur();
                }
              }}
              className="absolute m-0 p-0 bg-transparent outline-none border-b border-dashed border-violet-500 min-w-[200px]"
              style={{
                ...editStyle,
                // Adjust line-height to roughly match canvas textBaseline top
                lineHeight: 1, 
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
