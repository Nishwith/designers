import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { resolveMediaUrl } from "../utils/r2Storage";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";

const Connect = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchConnections = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch connection + Designer details (Real Email/Phone)
      const { data, error } = await supabase
        .from("connections")
        .select(
          `
            *,
            designers (
                id, name, city, rating_avg, 
                email, phone, logo_url
            )
        `
        )
        .eq("client_id", user.id)
        .order("updated_at", { ascending: false }); // Sorts by most recently updated

      if (!error) setConnections(data);
      setLoading(false);
    };
    fetchConnections();
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-4 px-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <MessageSquare className="text-brand-accent" /> My Connections
        </h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-brand-accent" size={48} />
          </div>
        ) : connections.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No connections yet
            </h2>
            <p className="text-gray-500 mb-6">
              Start browsing to find your designer.
            </p>
            <Link
              to="/designers"
              className="inline-block bg-brand-accent text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
            >
              Find Designers
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {connections.map((conn) => {
              // Clients can only contact designers if they are Active or On Hold
              const isContactable = conn.status === "accepted" || conn.status === "on_hold";

              return (
                <div
                  key={conn.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all shadow-sm hover:shadow-md hover:border-gray-300"
                >
                  {/* Main Row */}
                  <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <Link 
                        to={`/designers/${conn.designers.id}`} 
                        className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center text-xl font-bold text-brand-accent border border-gray-200 overflow-hidden shadow-sm hover:opacity-80 transition-opacity shrink-0"
                      >
                        {conn.designers.logo_url ? (
                          <img
                            src={resolveMediaUrl(conn.designers.logo_url)}
                            className="w-full h-full object-cover"
                            alt="logo"
                          />
                        ) : (
                          conn.designers.name.charAt(0)
                        )}
                      </Link>
                      <div>
                        <Link to={`/designers/${conn.designers.id}`}>
                          <h3 className="text-xl font-bold text-gray-900 hover:text-brand-accent transition-colors">
                            {conn.designers.name}
                          </h3>
                        </Link>
                        <p className="text-gray-500 text-sm flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-gray-400" /> {conn.designers.city}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border ${
                          conn.status === "accepted"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : conn.status === "on_hold"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {conn.status === "accepted" ? (
                          <CheckCircle size={14} />
                        ) : (
                          <Clock size={14} />
                        )}
                        {conn.status === "accepted" ? "ACTIVE" : conn.status.replace("_", " ").toUpperCase()}
                      </div>

                      {isContactable && (
                        <button
                          onClick={() => toggleExpand(conn.id)}
                          className="px-4 py-2 bg-white border border-gray-200 text-gray-900 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          {expandedId === conn.id ? "Close" : "Contact"}
                          {expandedId === conn.id ? (
                            <ChevronUp size={16} className="text-gray-500" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-500" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Contact Info */}
                  {expandedId === conn.id && isContactable && (
                    <div className="px-6 pb-6 pt-0 animate-in fade-in slide-in-from-top-2">
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* EMAIL */}
                        <div className="flex items-start gap-3 text-gray-700">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                            <Mail size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                              Email Address
                            </p>
                            <a
                              href={`mailto:${conn.designers.email}`}
                              className="text-gray-900 font-mono break-all hover:text-blue-600 transition-colors font-medium"
                            >
                              {conn.designers.email}
                            </a>
                          </div>
                        </div>

                        {/* PHONE */}
                        <div className="flex items-start gap-3 text-gray-700">
                          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0 border border-green-100">
                            <Phone size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                              Phone Number
                            </p>
                            <a
                              href={`tel:${conn.designers.phone}`}
                              className="text-gray-900 font-mono hover:text-green-600 transition-colors font-medium"
                            >
                              {conn.designers.phone}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Connect;