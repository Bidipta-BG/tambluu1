"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useToast } from "@/components/ToastProvider";
import type { Game } from "@/types";

interface Props {
  tenantId: string;
  game: Game | null;
  tickets: any[]; // The agent's booked tickets
  allTickets?: any[]; // All tickets for the game (used to calculate stats for other agents)
  agents?: any[];
}

export function NewAgentTicketListSection({ tenantId, game, tickets, allTickets = [], agents = [] }: Props) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"ticket" | "agent">("ticket");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [editingTicket, setEditingTicket] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [viewingAgent, setViewingAgent] = useState<any | null>(null);

  if (!game) {
    return null;
  }

  // Filter booked/confirmed tickets
  const bookedTickets = tickets.filter((t) => t.status === "booked" || t.status === "confirmed");

  // Search filter
  const displayTickets = bookedTickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const tnoMatch = t.ticket_number.toString().includes(q);
    const nameMatch = t.player_name?.toLowerCase().includes(q);
    const phoneMatch = t.player_phone?.toLowerCase().includes(q);
    return tnoMatch || nameMatch || phoneMatch;
  });

  const openEditModal = (ticket: any) => {
    setEditingTicket(ticket);
    setEditName(ticket.player_name || "");
    setEditPhone(ticket.player_phone || "");
  };

  const closeEditModal = () => {
    setEditingTicket(null);
    setEditName("");
    setEditPhone("");
  };

  const handleSave = async () => {
    if (!editingTicket) return;
    showLoader("Saving ticket info...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // We can patch our own tickets if the API allows it
      await api.patch(
        `/tenants/${tenantId}/games/${game.id}/tickets/${editingTicket.id}`,
        {
          playerName: editName,
          playerPhone: editPhone,
        },
        { headers }
      );

      showToast("Ticket updated successfully!", "success");
      closeEditModal();
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to save ticket", "error");
    } finally {
      hideLoader();
    }
  };

  const handleRemove = async () => {
    if (!editingTicket) return;
    if (!window.confirm(`Are you sure you want to unbook ticket #${editingTicket.ticket_number}? This cannot be undone.`)) {
      return;
    }
    
    showLoader("Removing ticket...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.post(
        `/tenants/${tenantId}/games/${game.id}/tickets/${editingTicket.id}/unbook`,
        {},
        { headers }
      );

      showToast("Ticket removed successfully!", "success");
      closeEditModal();
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to remove ticket", "error");
    } finally {
      hideLoader();
    }
  };

  // Format date helper
  const formatModalDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strHours = String(hours).padStart(2, '0');
      
      return `${day}-${month}-${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
    } catch {
      return "";
    }
  };

  const getAgentDisplay = (ticket: any) => {
    if (ticket.booked_via === 'admin') return 'Admin';
    if (ticket.agents?.name) return ticket.agents.name;
    return 'Agent';
  };

  return (
    <div className="bg-[#0b00c4] border-2 border-blue-600 rounded-md overflow-hidden max-w-4xl mx-auto mb-10 shadow-xl">
      {/* Header */}
      <div className="p-4 bg-[#0b00c4] text-center">
        <h2 className="text-white font-black text-xl md:text-2xl tracking-wide uppercase">
          TICKET/AGENT LIST
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 mb-4 justify-center">
        <button
          onClick={() => setActiveTab("ticket")}
          className={`flex-1 max-w-[200px] py-2 font-bold uppercase rounded-md text-sm md:text-base border border-red-700 ${
            activeTab === "ticket" ? "bg-[#ff0000] text-white" : "bg-black text-white"
          }`}
        >
          MY TICKET
        </button>
        <button
          onClick={() => setActiveTab("agent")}
          className={`flex-1 max-w-[200px] py-2 font-bold uppercase rounded-md text-sm md:text-base border border-black ${
            activeTab === "agent" ? "bg-[#ff0000] text-white" : "bg-black text-white"
          }`}
        >
          AGENT LIST
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 mb-4">
        <input
          type="text"
          placeholder="Enter keyword"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-center py-2.5 rounded-md text-black font-semibold outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Tab Content */}
      <div className="px-2 pb-2">
        {activeTab === "agent" ? (
          <div className="bg-white border-x border-t border-black">
            {/* Table Header */}
            <div className="flex border-b border-black h-10 bg-black">
              <div className="w-[15%] flex items-center px-2 border-r border-black font-black text-white text-[11px] sm:text-xs tracking-wider">
                No.
              </div>
              <div className="w-[45%] flex items-center px-2 border-r border-black font-black text-white text-[11px] sm:text-xs tracking-wider">
                NAME
              </div>
              <div className="w-[25%] flex items-center px-2 border-r border-black font-black text-white text-[11px] sm:text-xs tracking-wider">
                TOTAL SOLD
              </div>
              <div className="w-[15%] flex items-center justify-center px-2 font-black text-white text-[11px] sm:text-xs tracking-wider">
                EDIT
              </div>
            </div>

            {agents.map((agent, index) => {
              // Calculate tickets sold by this agent from allTickets
              const ticketsSold = allTickets.filter(
                (t) => t.status !== "available" && t.booked_via === 'agent' && (t.agent_id === agent.id || (t.agents && t.agents.name === agent.name))
              ).length;

              return (
                <div key={agent.id} className="flex border-b border-black">
                  <div className="w-[15%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2">
                    {index + 1}
                  </div>
                  <div className="w-[45%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    {agent.name}
                  </div>
                  <div className="w-[25%] flex items-center justify-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2">
                    {ticketsSold}
                  </div>
                  <div className="w-[15%] flex items-center justify-center px-2 py-2">
                    <button
                      onClick={() => setViewingAgent(agent)}
                      className="text-blue-600 font-black text-[12px] sm:text-sm hover:underline"
                    >
                      VIEW
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border-x border-t border-black">
            {/* Table Header */}
            <div className="flex border-b border-black h-10 bg-black">
              <div className="w-[15%] flex items-center px-2 border-r border-black font-bold text-white text-[11px] sm:text-xs">
                TNC
              </div>
              <div className="w-[45%] flex items-center px-2 border-r border-black font-bold text-white text-[11px] sm:text-xs">
                NAME
              </div>
              <div className="w-[25%] flex items-center px-2 border-r border-black font-bold text-white text-[11px] sm:text-xs">
                PHONE
              </div>
              <div className="w-[15%] flex items-center justify-center px-2 font-bold text-white text-[11px] sm:text-xs">
                EDIT
              </div>
            </div>

            {/* Table Body */}
            {displayTickets.length === 0 ? (
              <div className="p-4 text-center font-bold text-gray-500 border-b border-black">
                No tickets found.
              </div>
            ) : (
              displayTickets.map((ticket) => (
                <div key={ticket.id} className="flex border-b border-black">
                  <div className="w-[15%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2 overflow-hidden text-ellipsis">
                    {ticket.ticket_number}
                  </div>
                  <div className="w-[45%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    {ticket.player_name || "-"}
                  </div>
                  <div className="w-[25%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    {ticket.player_phone || "-"}
                  </div>
                  <div className="w-[15%] flex items-center justify-center px-2 py-2">
                    <button
                      onClick={() => openEditModal(ticket)}
                      className="text-blue-600 font-black text-[12px] sm:text-sm hover:underline"
                    >
                      EDT
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Modal Overlay */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#0b00c4] border-2 border-white rounded-md w-full max-w-sm flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="bg-[#0b00c4] h-14 flex items-center justify-center relative">
              <h2 className="text-white font-bold text-lg md:text-xl">Ticket Details</h2>
              <button 
                onClick={closeEditModal}
                className="absolute right-2 top-2 bg-[#ff5555] hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl"
              >
                ×
              </button>
            </div>

            {/* Modal Table Container */}
            <div className="px-2 pb-2">
              <div className="flex border-b border-black h-10 bg-black">
                <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-white text-xs">
                  DATA TYPE
                </div>
                <div className="w-[70%] flex items-center px-3 font-bold text-white text-xs">
                  DATA VALUE
                </div>
              </div>

              <div className="bg-white border-x border-black">
                {/* TNC (read-only) */}
                <div className="flex border-b border-black">
                  <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-black text-[13px] py-2 uppercase">
                    TNC
                  </div>
                  <div className="w-[70%] flex items-center px-3 font-bold text-black text-[13px] py-2">
                    {editingTicket.ticket_number}
                  </div>
                </div>

                {/* DATE (read-only) */}
                <div className="flex border-b border-black">
                  <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-black text-[13px] py-2 uppercase">
                    DATE
                  </div>
                  <div className="w-[70%] flex items-center px-3 font-bold text-black text-[13px] py-2">
                    {formatModalDate(editingTicket.created_at)}
                  </div>
                </div>

                {/* NAME (editable) */}
                <div className="flex border-b border-black">
                  <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-black text-[13px] py-2 uppercase">
                    NAME
                  </div>
                  <div className="w-[70%] flex items-center px-2 py-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full font-bold text-black text-[13px] outline-none border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* PHONE (editable) */}
                <div className="flex border-b border-black">
                  <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-black text-[13px] py-2 uppercase">
                    PHONE
                  </div>
                  <div className="w-[70%] flex items-center px-2 py-1">
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full font-bold text-black text-[13px] outline-none border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* AGENT (read-only) */}
                <div className="flex border-b border-black">
                  <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-black text-[13px] py-2 uppercase">
                    AGENT
                  </div>
                  <div className="w-[70%] flex items-center px-3 font-bold text-black text-[13px] py-2">
                    {getAgentDisplay(editingTicket)}
                  </div>
                </div>
              </div>

              {/* Action Row */}
              <div className="flex bg-[#0b00c4] pt-2 h-14">
                <button 
                  onClick={handleRemove}
                  className="w-1/2 bg-gray-500 hover:bg-gray-600 text-white font-bold uppercase text-sm flex items-center justify-center transition-colors border border-gray-600 mr-1 rounded"
                >
                  REMOVE
                </button>
                <button 
                  onClick={handleSave}
                  className="w-1/2 bg-[#ff0000] hover:bg-red-700 text-white font-bold uppercase text-sm flex items-center justify-center transition-colors border border-red-800 ml-1 rounded"
                >
                  SAVE
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* View Agent Modal */}
      {viewingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
          <div className="bg-[#0b00c4] w-full max-w-sm rounded-md overflow-hidden shadow-2xl relative border-2 border-blue-600 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-center items-center p-3 relative bg-[#0b00c4]">
              <h3 className="text-white font-black text-lg tracking-wide uppercase">
                Agent Details
              </h3>
              <button 
                onClick={() => setViewingAgent(null)}
                className="absolute right-2 top-2 bg-[#ff5555] hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="flex border-b border-black h-10 bg-black">
                <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-white text-xs">
                  DATA TYPE
                </div>
                <div className="w-[60%] flex items-center px-3 font-bold text-white text-xs">
                  DATA VALUE
                </div>
              </div>

              <div className="bg-white border-x border-black mb-4">
                {/* DATE */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2 uppercase">
                    DATE
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {formatModalDate(viewingAgent.created_at)}
                  </div>
                </div>

                {/* NAME */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2 uppercase">
                    NAME
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {viewingAgent.name || "-"}
                  </div>
                </div>

                {/* Whatsapp Number */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2">
                    Whatsapp Number
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {viewingAgent.whatsapp_number || "-"}
                  </div>
                </div>

                {/* Telegram */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2">
                    Telegram user name
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {viewingAgent.telegram_username || "-"}
                  </div>
                </div>

                {/* SMS */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2">
                    Sms number
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {viewingAgent.sms_number || "-"}
                  </div>
                </div>

                {/* Email */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2">
                    Email id
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {viewingAgent.email_id || "-"}
                  </div>
                </div>

                {/* Facebook */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2">
                    Facebook id
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {viewingAgent.facebook_id || "-"}
                  </div>
                </div>

                {/* Password */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2 uppercase">
                    PASSWORD
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {viewingAgent.plain_password || "-"}
                  </div>
                </div>

                {/* Total Sold */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2 uppercase">
                    TOTAL SOLD
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {allTickets.filter(t => t.status !== "available" && t.booked_via === 'agent' && (t.agent_id === viewingAgent.id || (t.agents && t.agents.name === viewingAgent.name))).length}
                  </div>
                </div>

                {/* Total Earning */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2 uppercase">
                    TOTAL EARNING
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {allTickets.filter(t => t.status !== "available" && t.booked_via === 'agent' && (t.agent_id === viewingAgent.id || (t.agents && t.agents.name === viewingAgent.name))).length * (game?.agency_commission || 0)} INR
                  </div>
                </div>
              </div>

              {/* Tickets booked by this agent */}
              <div className="bg-white border border-black mb-2">
                <div className="flex border-b border-black h-8 bg-black">
                  <div className="w-[20%] flex items-center px-2 border-r border-black font-bold text-white text-[10px]">TNC</div>
                  <div className="w-[50%] flex items-center px-2 border-r border-black font-bold text-white text-[10px]">NAME</div>
                  <div className="w-[30%] flex items-center px-2 font-bold text-white text-[10px]">PHONE</div>
                </div>
                {allTickets.filter(t => t.status !== "available" && t.booked_via === 'agent' && (t.agent_id === viewingAgent.id || (t.agents && t.agents.name === viewingAgent.name))).length === 0 ? (
                  <div className="p-2 text-center text-xs font-bold text-gray-500">No tickets found.</div>
                ) : (
                  allTickets.filter(t => t.status !== "available" && t.booked_via === 'agent' && (t.agent_id === viewingAgent.id || (t.agents && t.agents.name === viewingAgent.name))).map((ticket) => (
                    <div key={ticket.id} className="flex border-b border-black last:border-b-0">
                      <div className="w-[20%] flex items-center px-2 border-r border-black font-bold text-black text-[11px] py-1">{ticket.ticket_number}</div>
                      <div className="w-[50%] flex items-center px-2 border-r border-black font-bold text-black text-[11px] py-1 truncate">{ticket.player_name || "-"}</div>
                      <div className="w-[30%] flex items-center px-2 font-bold text-black text-[11px] py-1 truncate">{ticket.player_phone || "-"}</div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
