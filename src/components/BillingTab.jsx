import React, { useState, useEffect } from "react";
import { CreditCard, Zap, Calendar, ShieldCheck, ArrowUpRight, Receipt, Award, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../supabaseClient";

const BillingTab = ({ designer, onRequestRenewal, onRequestFeature, onCheckout, paymentHistory: initialPaymentHistory = [] }) => {
  const [paymentHistory, setPaymentHistory] = useState(initialPaymentHistory);

  const profileLink = `https://vishwakarmans.netlify.app/designer/${designer?.id}`;
  const designerName = designer?.name || 'my studio';

  const handleShare = async () => {
    const shareText = `Hi! It was a pleasure working with you. I am building my official portfolio on Vishwakarmans—the premium platform connecting homeowners with elite designers.\n\nCould you take 60 seconds to verify my work by leaving a review for ${designerName}?\n\n1. Visit my official Vishwakarmans profile: ${profileLink}\n2. Create a quick, free homeowner account.\n3. Click 'Connect' and drop your honest review.\n\nYour feedback helps me earn the exclusive Featured Badge on the platform. Thank you for your support!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Review ${designerName} on Vishwakarmans`,
          text: shareText,
        });
      } catch (err) {
        if (err?.name !== 'AbortError') console.error('Share action failed:', err);
        console.log('Share dismissed');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Branded review link copied to clipboard!");
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!designer?.id) return; // Wait until designer object is fully loaded

      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('designer_id', designer.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Fetch Error:", error);
      } else {
        console.log("Fetched Payment History:", data);
        setPaymentHistory(data || []);
      }
    };
    fetchHistory();
  }, [designer?.id]); // CRITICAL: Must re-run when designer.id becomes available

  let daysLeft = 0;
  if (designer?.subscription_end) {
    const diff = new Date(designer.subscription_end) - new Date();
    daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  const isPendingPayment =
    designer?.is_verified === true &&
    designer?.is_subscription_active === false &&
    !designer?.subscription_end;
  const isExpired = !isPendingPayment && (
    designer?.is_subscription_active === false || (designer?.subscription_end && daysLeft < 0)
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isFeatured = designer?.featured_status === "featured" || designer?.is_featured === true;
  const isEvaluationRequested = designer?.featured_status === "requested";

  const handleRenewClick = () => {
    if (onCheckout) {
      onCheckout("subscription");
    } else if (onRequestRenewal) {
      onRequestRenewal();
    }
  };

  const formatTierLabel = (tierStr) => {
    if (!tierStr) return "Pro Partner Subscription";
    if (tierStr === "subscription") return "Pro Partner Subscription";
    return tierStr;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="text-brand-accent" /> Billing & Marketing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your portal subscription license, feature badges, and payment history.
          </p>
        </div>
      </div>

      {/* Grid of Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section A: Current License Card */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-brand-accent" /> Current Subscription
              </span>
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
                  designer?.is_verified !== true
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : isPendingPayment
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : isExpired
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {designer?.is_verified !== true
                  ? "Awaiting Verification"
                  : isPendingPayment
                  ? "Payment Required"
                  : isExpired
                  ? "Expired"
                  : "Active License"}
              </span>
            </div>

            <h3 className="text-xl font-bold text-gray-900">B2B Designer Pro</h3>
            <p className="text-sm text-gray-500 mt-1">
              Full access to client lead funnel, portfolio management, and verified partner badge.
            </p>

            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" /> Expiry Date
                </span>
                <span className="font-bold text-gray-900">{formatDate(designer?.subscription_end)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Status</span>
                <span className={`font-semibold ${isExpired ? "text-red-600" : "text-emerald-600"}`}>
                  {isExpired ? "Locked" : `${daysLeft} days remaining`}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRenewClick}
            disabled={designer?.is_verified !== true}
            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            {designer?.is_verified !== true
              ? "Available after profile verification"
              : isPendingPayment
              ? "Pay Now"
              : "Renew / Upgrade License"} {designer?.is_verified === true && <ArrowUpRight size={16} />}
          </button>
        </div>

        {/* Section B: Merit-Based Featured Badge Card */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Award size={14} className="text-amber-500 fill-amber-500" /> Merit Badge
              </span>
              {isFeatured && (
                <span className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Zap size={12} className="fill-amber-700" /> Featured Partner
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900">Featured Badge Application</h3>

            {/* 3-Step Guide */}
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Deliver Great Work</h4>
                  <p className="text-xs text-gray-500">Complete projects with your clients.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Request a Review</h4>
                  <p className="text-xs text-gray-500">Ask your clients to rate you on Vishwakarmans.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Get Evaluated</h4>
                  <p className="text-xs text-gray-500">Once you have 5+ Genuine reviews, request an admin evaluation.</p>
                </div>
              </div>
            </div>

            {/* Share Action */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center">
              <button 
                onClick={handleShare}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-accent hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-orange-500/30 cursor-pointer"
              >
                <Share2 size={18} />
                Share Review Link
              </button>
            </div>
          </div>

          <button
            onClick={onRequestFeature}
            disabled={isEvaluationRequested || isFeatured}
            className={`w-full py-3.5 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isFeatured
                ? "bg-emerald-600 text-white cursor-default"
                : isEvaluationRequested
                ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                : "bg-brand-accent hover:bg-orange-600 text-white active:scale-95"
            }`}
          >
            <Award size={16} />
            {isFeatured
              ? "Featured Badge Active"
              : isEvaluationRequested
              ? "Evaluation Requested"
              : "Request Admin Evaluation"}
          </button>
        </div>
      </div>

      {/* Payment History Ledger */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="text-brand-accent" size={20} /> Payment History
        </h3>

        {!paymentHistory || paymentHistory.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-8 text-center text-gray-500">
            <p className="font-medium text-sm">No payment history found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-bold text-gray-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Plan / Tier</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {paymentHistory.map((payment) => (
                  <tr key={payment.id || payment.gateway_transaction_id || payment.payment_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-900">
                      {formatDate(payment.created_at || payment.date)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-700">
                      {payment.gateway_transaction_id || payment.payment_id || payment.id || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">
                      {formatTierLabel(payment.payment_type || payment.tier || payment.type)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-emerald-600 font-bold">
                      +{payment.duration_days || 365} Days
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      ₹{payment.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingTab;
